# Article reader chrome cleanup

## Summary

Unify the request-rendered reader controls for Article, History, Compare, and Sources. Use the existing native link-tab and shared control styles without changing article content, routes, access rules, or the editor. Remove obsolete reader code and measure a net reduction in maintained source lines. The proposal called for explicit human approval before implementation.

## Authorization and decision record

Chris authorized the bounded cleanup trial and its spending budget. He did not separately review or explicitly approve this exact specification. Codex reviewed the concrete specification as within that authorization and directed implementation. The proposed explicit-human-approval gate above is historical context, not a claim of separate approval by Chris.

## Product behavior

1. The Article, History, Compare, and Sources pages retain the article breadcrumb, title, and lede. The title and lede keep their existing typography. The reader navigation displays three links: Article, History, and Sources. It uses the same native-link visual vocabulary as the search type navigation. The current destination has `aria-current="page"`; Compare remains within History and marks History current. Do not introduce a fourth Compare tab.
2. Each link performs ordinary full-page navigation. Article opens the current article, History opens its history, and Sources opens the selected revision's sources when the page is historical. History and Sources retain their current counts. The links work without JavaScript and preserve keyboard focus indicators. Narrow layouts wrap without horizontal page overflow. Printing omits the reader links as the existing shared link-tabs style does.
3. The Article page retains its revision number and UTC date-only “Updated” metadata. A caller with write permission sees Edit article only on the current article, separate from the reader links. A reader and any historical revision see no Edit link. The earlier-revision warning remains visible and links to the current article. Do not replace the date-only display with `SourceTime`, which includes a time and timezone.
4. History and Compare retain the same shared, native comparison form with labeled From revision and To revision selects and a Compare submit control. Submitting performs a GET to `/wiki/{id}/compare/` with the selected `from` and `to` numbers. Existing invalid-revision behavior, revision ordering, rendered differences, raw Markdown disclosure, and comparison summary remain unchanged.
5. Sources remain deduplicated from the selected article revision's Markdown and source metadata. Citations keep their existing destinations and original trace anchors. A historical Sources page retains its warning and revision-specific Article context link. Reloading after a synthetic edit shows the newly committed Markdown and sources without a build or redeployment.
6. The editor remains the existing Write, Preview, and desktop Split workflow. Switching modes or resizing retains the unsaved draft; leaving a dirty draft warns; preview sanitization and saving, revision checks, and retry receipts are unchanged. No new client hydration is required for reader navigation.

## Technical design

- `src/render.mjs:246-264` already centralizes the article breadcrumb, warning, title, lede, and reader links in `articleHeader`. Keep this single server-side entry point; change its navigation from `.tabs` to the existing `.ui-link-tabs` convention in `ui/components/library.mjs:176-195` and `public/components.css:299-320`. Keep ordinary `<a href>` links and `aria-current="page"`; do not use `role="tab"` or a hydrated Base UI tab widget for navigation.
- `src/render.mjs:281` builds Article-only revision metadata and the current-only Edit link. Keep this outside the navigation. Reuse existing scoped shared control classes and semantic tokens for the Edit affordance without altering its visibility rule. Remove `articleHeader`'s unused `write` option; the Article renderer still receives and checks `write`. Keep `date` (`src/render.mjs:165-176`) for the UTC date-only metadata. Keep `sources(p)` as the count and source extraction function; do not precompute content into client assets.
- `src/views.mjs:115`, `:232`, and `:258` call the same header for History, Compare, and Sources. Keep Compare's active destination as History. `comparisonForm` at `src/views.mjs:102-104` already avoids duplicated form markup across History and Compare; keep its native GET action and apply existing `.ui-field` styling to its labeled select controls and `.ui-button` to its submit button. Preserve explicit visible labels and mobile full-row selectors. Remove unused `topicSelect` at `src/views.mjs:24-29`; keep `topicNames`, which Home and catalog still use. Do not add a React component solely to wrap markup that is already shared once. Existing React server rendering remains in the shell and library; Base UI remains responsible for existing interactive widgets.
- Make only scoped, necessary style adjustments in `public/style.css`, `public/ui.css`, or `public/components.css`. Do not remove `.tabs` rules used by editor mode controls. Avoid global element selectors and hard-coded theme colors. Use tokens from `public/theme.css`. Preserve 44px touch targets, focus outlines, the 760px editor breakpoint, and the 1000px article-sidebar behavior.
- Do not change `src/server.mjs:1724-1753` route dispatch, `src/views.mjs:262-274` editor markup, `public/client.js` editor logic, Markdown sanitization, permission checks, caching keys, Git storage, or JSONL trace handling. The server must continue rendering current Markdown and immutable evidence on each request.

## Decisions and trade-offs

- **Reader links versus interactive tabs:** Native links retain full-page URLs, keyboard behavior, no-JavaScript navigation, and print behavior with no hydration. A Base UI tab widget could add managed selection but would change navigation semantics and increase client and source complexity. Use `.ui-link-tabs`; keep Base UI for existing interactive controls.
- **Compare in History versus a fourth tab:** The existing comparison form and History-selected state preserve orientation and URLs. A fourth tab could increase visibility but would need a meaningful canonical comparison URL and would crowd narrow layouts. Keep three links and the native form.
- **Reader chrome versus editor migration:** Reader chrome has a shared header and inconsistent styling with the library. Migrating editor modes would touch draft retention, preview, save receipts, and client hydration. Defer editor controls; verify they still work.
- **Scoped simplification versus broad rewrite:** Keep existing shared header and form functions, remove unused options/helpers and redundant styles, and avoid a new component abstraction that increases maintained code. Do not compress lines or delete supported behavior to manufacture a LOC reduction.
- **UTC date-only versus `SourceTime`:** The latter adds time and timezone and changes the product meaning. Keep the existing date-only UTC presentation while reusing shared styles where they do not change meaning.

## Assumptions

- The three reader destinations remain Article, History, and Sources; Compare is reached from History, revision links, and change summaries. The triage brief explicitly favors preserving the current History-selected comparison behavior.
- A style-level migration to existing shared classes is sufficient for this bounded reader workflow. A new React component is not required when it only rewraps the already shared `articleHeader` markup.
- The current-only Edit link stays outside the reader links and uses the existing server-provided write decision. No new permission source or edit endpoint is needed.
- Any save exercised during manual verification changes only the disposable synthetic example repository. It is not a request to update shipped examples or an operator's wiki.

## Out of scope

- Editor mode migration, new client-side hydration, a second component system, new authentication or authorization behavior, storage or trace format changes, unrelated CSS cleanup, and a broad UI rewrite.
- Restoring automated suites, adding CI, changing factory configuration or models, creating an unrelated issue, or publishing, deploying, merging, or releasing this work.
- Treating a visual-only screenshot or `npm run check` as proof of dynamic navigation, saving, or receipt correctness.

## Validation criteria

1. **Static gate:** On Node 24.19+ with a clean synthetic checkout, run `npm ci` and `npm run check`. Both exit 0. The latter checks generated contracts, formatting, and static types, not runtime behavior. Record dependency audit advisories separately; do not change dependency policy in this task. Do not restore removed automated suites or add CI.
2. **Source LOC:** At the fixed baseline, 104 tracked `.mjs`, `.js`, `.jsx`, `.ts`, `.tsx`, `.css`, and `.html` files in `src/`, `ui/`, `public/`, `scripts/`, and `bin/`, excluding `public/vendor/`, contain **21,091 lines**. Count each file's newline characters plus one if a nonempty file has no terminal newline. After implementation, run the following exact counter from the worktree root on committed files; report the final file and line counts and the difference from 21,091. The final line count must be below 21,091. Keep docs, examples, generated assets, dependencies, and lockfiles out of this denominator; do not compress formatting to pass it.

   ```sh
   node -e 'const fs=require("node:fs"), cp=require("node:child_process"); const files=cp.execFileSync("git",["ls-files","-z","--","src","ui","public","scripts","bin"]).toString().split("\0").filter(p=>p && /\.(mjs|js|jsx|ts|tsx|css|html)$/.test(p) && !p.startsWith("public/vendor/")); const lines=files.reduce((n,p)=>{const b=fs.readFileSync(p); let count=0; for(const c of b) if(c===10) count++; return n+count+(b.length>0 && b[b.length-1]!==10 ? 1:0)},0); console.log(JSON.stringify({files:files.length,lines}));'
   ```

3. **Synthetic browser flow:** Start `npm run example` and use only its disposable synthetic content. On an article with revision history and sources, navigate Article → History → Compare via the native form → Sources → historical Article → current Article. Check link destinations, three active states, History selection on Compare, counts, warning, selected revision, and GET `from`/`to` URL parameters. Open a source citation and check that its original passage and record anchor match the link. Report the article ID, revision pair, URLs, and what was actually exercised.
4. **Access and editor smoke:** Inspect current Article as a write-capable example user and a read-only/no-write caller where the synthetic setup permits it; check that Edit is absent for read-only and historical pages and available only for current writable Article. Use Write → Preview → Split on desktop and Write → Preview on narrow screen; edit a synthetic draft, switch and resize, confirm draft retention, then attempt navigation to confirm the dirty-leave warning. Save a separate synthetic edit, confirm one new revision and success/receipt status, reload to confirm new content without a rebuild, and verify the citation/source link still resolves. Do not save the baseline before-state capture.
5. **No-JavaScript, keyboard, and presentation:** With JavaScript disabled, follow Article, History, Sources, revision, and comparison GET links and verify full-page content. Tab through reader links, Edit when allowed, comparison selects/button, and citation; check visible focus and semantic labels. Use the computer-use tool to record **before and after desktop (1280px) and narrow (390px) evidence** of the reader flow, including comparison, in both light and dark themes; a video shows navigation and keyboard/focus states, with screenshots only for static states. Inspect no horizontal overflow and print behavior. Report the exact flows and limits, not implied coverage.

## Baseline visual references

These are **before-state** synthetic captures, not after-state proof. The baseline browser flow covered Article → History → Sources → Edit, desktop Write/Preview/Split, narrow Write/Preview, retained draft on switching/resizing, dirty-leave warning, light/dark Article, and Edit focus. It did **not** cover Compare, citation destination, no-JavaScript navigation, or a save.

- [Before-state video](https://platform.warp.dev/artifacts/01a14b39-7dda-71d9-8b79-e08404acb6b5)
- [Desktop Article](https://platform.warp.dev/artifacts/01a14b36-d861-7d08-be60-78d1bc8edc8f)
- [Narrow Article](https://platform.warp.dev/artifacts/01a14b38-63b9-7942-bb49-25bb3a1b101f)
- [Desktop editor](https://platform.warp.dev/artifacts/01a14b37-650a-76a4-82c0-91d61a51a1ba)
- [Narrow editor](https://platform.warp.dev/artifacts/01a14b38-21e3-763a-a0cf-766ac2ba7b47)

## Benchmark provenance — original task input sent to Warp

Repository: `https://github.com/SurtonInc/agent-wiki.git`

Exact starting commit: `7c5f1a744764571a65ee259076b4b2eee95ea0a5`
The following original task input sent to Warp is reproduced **verbatim**. It is preserved for the fixed benchmark, not presented as Chris's literal original wording. Do not replace it with a summary or link.

Give the stock Agent Wiki factory a real, bounded UI cleanup task in SurtonInc/agent-wiki. The goals are to de-slop the code, reduce total maintained source LOC, and improve UI consistency while preserving supported behavior. Use your existing configured Triage, Spec, Implement and independent Review agents where their stages add value; keep the factory configuration and models unchanged. Start by triaging and presenting a concrete spec for approval through the normal planning workflow so we can inspect that handoff.

Choose one complete UI workflow with real duplication or inconsistent controls. docs/interface.md identifies reader metadata and editing controls as remaining component migrations; investigate those as candidates and pick a focused improvement with measurable benefit. Reuse the existing React, Base UI, shared primitives and semantic theme tokens. Do not introduce a second component system or a broad rewrite. Treat de-slop as removing needless duplication, obsolete branches and indirection, not compressing formatting or deleting supported behavior. Measure before/after maintained source LOC with the same method, separately from docs, generated assets, dependencies and lockfiles. Aim for a net source reduction without making the code less readable.

Read AGENTS.md, README.md, CONTRIBUTING.md, docs/interface.md and relevant architecture/verification docs first. Preserve request-time Markdown/JSONL rendering, native navigation and no-JavaScript behavior, keyboard access, focus, responsive layouts, light/dark themes, draft retention, sanitization, permissions, revision checks and save receipts as applicable. Avoid changing authentication, authorization or storage behavior. Automated test suites were deliberately removed from this baseline; do not restore them or add CI. Use npm ci, npm run check and the documented synthetic example for manual browser validation. Use only synthetic data. Capture useful before/after desktop and narrow-screen evidence and report exactly which flows were exercised.

Use a dedicated branch and a single reviewable pull request in SurtonInc/agent-wiki. Put the product/technical plan and acceptance criteria where your default Spec workflow stores them, and give their exact paths and PR URL. Do not open an upstream PR, create unrelated issues, send Slack messages, merge, deploy or release. Disclose material AI assistance in the PR. Preserve the starting commit and task prompt so this real task can become a fixed benchmark comparing agent models later. The first output should be triage findings and the proposed spec, not a broad implementation.
