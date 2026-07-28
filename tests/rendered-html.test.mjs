import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the personalized crossword builder", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Neural Mini — Personalized AI Crossword<\/title>/i);
  assert.match(html, /What’s been on your tech radar\?/);
  assert.match(html, /Agents/);
  assert.match(html, /TPUs &amp; infrastructure/);
  assert.match(html, /Generative AI/);
  assert.match(html, /Data &amp; security/);
  assert.match(html, /Generate my crossword/);
  assert.doesNotMatch(html, /codex-preview|Building your site|react-loading-skeleton/i);
});

test("keeps the finished puzzle responsive and interactive", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /"REGISTRY"/);
  assert.match(page, /"IRONWOOD"/);
  assert.match(page, /"GEMINI"/);
  assert.match(page, /"LAKEHOUSE"/);
  assert.match(page, /const compilePuzzle/);
  assert.match(page, /onClick=\{checkPuzzle\}/);
  assert.match(page, /onClick=\{revealLetter\}/);
  assert.match(page, /onClick=\{backspace\}/);
  assert.match(layout, /Personalized AI Crossword/);
  assert.match(css, /grid-template-columns:\s*repeat\(9,\s*1fr\)/);
  assert.match(css, /@media \(max-width:\s*650px\)/);
});
