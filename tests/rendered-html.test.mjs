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

  assert.match(page, /const GRID_SIZE = 5/);
  assert.match(page, /"AGENT"/);
  assert.match(page, /"NODES"/);
  assert.match(page, /"MODEL"/);
  assert.match(page, /"TRUST"/);
  assert.match(page, /const compilePuzzle/);
  assert.match(page, /onClick=\{checkPuzzle\}/);
  assert.match(page, /onClick=\{revealLetter\}/);
  assert.match(page, /onClick=\{backspace\}/);
  assert.match(layout, /Personalized AI Crossword/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*1fr\)/);
  assert.match(css, /@media \(max-width:\s*650px\)/);

  const entriesPerPuzzle = page.match(/entries:\s*\[/g) ?? [];
  assert.equal(entriesPerPuzzle.length, 4);
});

test("every open across and down run has a matching clue", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const names = ["agents", "infra", "genai", "data"];

  for (const name of names) {
    const start = page.indexOf(`  ${name}: {`);
    const end = page.indexOf("\n  },", start);
    assert.notEqual(start, -1, `Missing ${name} puzzle`);
    assert.notEqual(end, -1, `Could not parse ${name} puzzle`);

    const chunk = page.slice(start, end);
    const entries = [...chunk.matchAll(/entry\("([A-Z]+)", (\d), (\d), "(across|down)"/g)]
      .map((match) => ({
        answer: match[1],
        row: Number(match[2]),
        col: Number(match[3]),
        direction: match[4],
      }));
    const grid = Array.from({ length: 5 }, () => Array(5).fill("#"));

    for (const entry of entries) {
      [...entry.answer].forEach((letter, index) => {
        const row = entry.row + (entry.direction === "down" ? index : 0);
        const col = entry.col + (entry.direction === "across" ? index : 0);
        assert.ok(row < 5 && col < 5, `${name}: ${entry.answer} leaves the grid`);
        assert.ok(
          grid[row][col] === "#" || grid[row][col] === letter,
          `${name}: ${entry.answer} conflicts at ${row},${col}`,
        );
        grid[row][col] = letter;
      });
    }

    const entryKeys = new Set(
      entries.map((entry) => `${entry.direction}:${entry.row}:${entry.col}:${entry.answer}`),
    );
    const runs = [];

    for (let row = 0; row < 5; row += 1) {
      runs.push(`across:${row}:0:${grid[row].join("")}`);
    }
    for (let col = 0; col < 5; col += 1) {
      runs.push(`down:0:${col}:${grid.map((row) => row[col]).join("")}`);
    }

    for (const run of runs) {
      assert.ok(entryKeys.has(run), `${name}: missing clue for ${run}`);
    }
  }
});
