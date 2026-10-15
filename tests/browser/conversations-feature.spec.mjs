import { test, expect } from "@playwright/test";
import { once } from "node:events";
import net from "node:net";
import { createWiki } from "../../src/server.mjs";
import { fixture } from "../helpers.mjs";

test.use({
  launchOptions: { args: ["--enable-experimental-web-platform-features"] },
});
let app, cleanup, base;
test.beforeAll(async () => {
  const repo = fixture({
    after: (fn) => {
      cleanup = fn;
    },
  });
  const probe = net.createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  base = `http://127.0.0.1:${port}`;
  app = createWiki({ repo, origin: base, conversations: false, write: true });
  app.listen(port, "127.0.0.1");
  await once(app, "listening");
});
test.afterAll(async () => {
  if (app)
    await new Promise((resolve) => {
      app.close(resolve);
      app.closeAllConnections();
    });
  cleanup?.();
});

test("article-only deployments hide conversation navigation, search and native WebMCP tools", async ({
  page,
}) => {
  const evidenceRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/traces/"))
      evidenceRequests.push(request.url());
  });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/");
    await expect(
      page.getByRole("heading", { name: "Recent updates" }),
    ).toBeVisible();
    await expect(page.locator('a[href="/traces/"]')).toHaveCount(0);
    await expect(page.locator("html")).toHaveAttribute("data-webmcp", "ready");
    const names = await page.evaluate(async () =>
      (await document.modelContext.getTools()).map((tool) => tool.name),
    );
    expect(names).toContain("wiki.read");
    expect(
      names.some(
        (name) => name.startsWith("wiki.trace") || name === "wiki.file",
      ),
    ).toBe(false);
    if (width === 1440) {
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("dialog")).toContainText(
        "Find articles in your wiki.",
      );
      await expect(
        page.getByRole("link", { name: "Explore conversations" }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
    }
    await page.goto(base + "/search/?q=Guide&type=traces&sync=1");
    await expect(page.locator("#article-results")).toContainText("Guide");
    await expect(page.locator("#trace-results")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Conversations", exact: true }),
    ).toHaveCount(0);
  }
  expect(evidenceRequests).toEqual([]);
});
