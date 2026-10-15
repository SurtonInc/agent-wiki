import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { once } from "node:events";
import { createWiki } from "../src/server.mjs";
import { conversationsEnabled } from "../src/features.mjs";
import { ControlStore } from "../src/control-store.mjs";
import { GitWiki, markdown } from "../src/git-wiki.mjs";
import { importTrace } from "../src/traces.mjs";
import { createWikiTools } from "../public/wiki-tools.js";
import { fixture, commit, update } from "./helpers.mjs";
import { evidenceFixture, evidenceId, fileId } from "./evidence-fixture.mjs";

async function start(t, options) {
  const server = createWiki({ origin: "http://wiki.test", ...options });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return (route, { body, cookie } = {}) =>
    new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: server.address().port,
          path: route,
          method: body ? "POST" : "GET",
          headers: {
            Host: "wiki.test",
            Origin: "http://wiki.test",
            "Content-Type": "application/json",
            "X-Wiki-Write": "1",
            ...(cookie ? { Cookie: cookie } : {}),
          },
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () =>
            resolve({
              status: res.statusCode,
              text: Buffer.concat(chunks).toString(),
            }),
          );
        },
      );
      req.on("error", reject);
      req.end(body ? JSON.stringify(body) : undefined);
    });
}

test("conversation flag preserves the default and rejects ambiguous values", () => {
  assert.equal(conversationsEnabled({}), true);
  assert.equal(conversationsEnabled({ WIKI_CONVERSATIONS: "1" }), true);
  assert.equal(conversationsEnabled({ WIKI_CONVERSATIONS: "0" }), false);
  for (const value of ["", "false", "true", "off", "2"])
    assert.throws(
      () => conversationsEnabled({ WIKI_CONVERSATIONS: value }),
      /0 or 1/,
    );
});

for (const mode of ["local", "external"]) {
  test(`disabled conversations block ${mode} evidence even for managers and restore on enable`, async (t) => {
    const repo = fixture(t);
    const backend = await evidenceFixture();
    t.after(() => backend.close());
    const root = path.join(repo, ".git", "traces");
    const trace = importTrace(
      root,
      new URL("../examples/traces/pi.jsonl", import.meta.url),
      "Synthetic trace",
    );
    const source = path.join(root, trace.id, "source.jsonl");
    const original = fs.readFileSync(source);
    const control = new ControlStore(
      path.join(repo, ".git", "control.sqlite3"),
    );
    t.after(() => control.close());
    const owner = control.bootstrap({
      issuer: "https://id.invalid",
      subject: "owner",
      name: "Owner",
    });
    const cookie = `wiki_session=${control.session(owner).token}`;
    const options = {
      repo,
      control,
      traces: mode === "local" ? root : null,
      evidenceUrl: mode === "external" ? backend.url : null,
    };
    const off = await start(t, { ...options, conversations: false });
    const get = (route) => off(route, { cookie });
    for (const route of [
      "/",
      "/wiki/",
      "/wiki/guide/",
      "/search/?q=Guide&type=traces&sync=1",
    ]) {
      const result = await get(route);
      assert.equal(result.status, 200, route);
      assert.doesNotMatch(
        result.text,
        /href="\/traces\/"|id="trace-results"|Browse conversations/,
      );
      assert.match(result.text, /data-conversations="false"/);
    }
    for (const route of [
      "/traces/",
      `/traces/${trace.id}/`,
      "/conversations/",
      `/conversations/${evidenceId}/`,
      "/api/traces/search?q=hello",
      "/api/traces/catalog.json",
      "/api/traces/sessions.json",
      "/api/traces/provenance.json",
      `/api/traces/${trace.id}.json`,
      `/api/traces/${trace.id}/lines.json`,
      `/files/${fileId}`,
      `/media/${fileId}`,
      `/api/files/${fileId}.json`,
      "/api/evidence/v1/catalog",
    ]) {
      const result = await get(route);
      assert.equal(result.status, 404, route);
      assert.equal(
        JSON.parse(result.text).code,
        "CONVERSATIONS_DISABLED",
        route,
      );
    }
    const config = JSON.parse((await get("/api/articles/authoring.json")).text);
    assert.equal(config.conversations, false);
    assert.equal(config.evidenceAccess, false);
    assert.equal(config.externalEvidence, false);
    assert.ok(config.tools.includes("wiki.read"));
    assert.ok(
      !config.tools.some(
        (name) => name.startsWith("wiki.trace") || name === "wiki.file",
      ),
    );
    assert.deepEqual(
      createWikiTools(async () => {}, config.write, config).map(
        (tool) => tool.name,
      ),
      config.tools,
    );
    const health = await get("/api/articles/health.json");
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.text).components.traceArchive, undefined);
    assert.deepEqual(backend.state.requests, []);
    assert.deepEqual(fs.readFileSync(source), original);

    // Simultaneous deployments must not share rendering choices.
    const on = await start(t, { ...options, conversations: true });
    for (const [request, enabled] of [
      [on, true],
      [off, false],
      [on, true],
    ]) {
      const home = await request("/", { cookie });
      assert.equal(home.text.includes('href="/traces/"'), enabled);
    }
    const restored = await on(
      mode === "local"
        ? `/traces/${trace.id}/`
        : `/conversations/${evidenceId}/`,
      { cookie },
    );
    assert.equal(restored.status, 200);
    assert.deepEqual(fs.readFileSync(source), original);
  });
}

test("disabled conversations preserve article citations and editing without contacting evidence", async (t) => {
  const repo = fixture(t);
  const evidence = [
    {
      url: `/conversations/${evidenceId}/#event-1`,
      quote: "Published quotation",
      attribution: "user",
    },
  ];
  fs.writeFileSync(
    path.join(repo, "wiki/guide.md"),
    markdown(
      { title: "Guide", description: "Example", evidence },
      "Article text.\n",
    ),
  );
  commit(repo, "Publish a quotation");
  const backend = await evidenceFixture();
  t.after(() => backend.close());
  const request = await start(t, {
    repo,
    conversations: false,
    evidenceUrl: backend.url,
    write: true,
  });
  assert.match((await request("/wiki/guide/")).text, /Published quotation/);
  const draft = {
    operation_id: "article-only-update",
    updates: [
      {
        ...update("guide", "Updated article."),
        expected_revision_id: new GitWiki(repo).current("guide").revision_id,
      },
    ],
  };
  assert.equal(
    (await request("/api/articles/edits", { body: draft })).status,
    200,
  );
  assert.deepEqual(new GitWiki(repo).current("guide").evidence, evidence);
  const quote = {
    operation_id: "new-quote",
    updates: [
      {
        ...update("quoted"),
        evidence: [
          { conversation: evidenceId, event: "event-1", quote: "New quote" },
        ],
      },
    ],
  };
  const denied = await request("/api/articles/edits", { body: quote });
  assert.equal(denied.status, 503);
  assert.equal(JSON.parse(denied.text).code, "EVIDENCE_UNAVAILABLE");
  assert.deepEqual(backend.state.requests, []);
});
