import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeDomIssues } from "../src/Server/Services/liveScanCollector";

test("analyzeDomIssues returns production-ready CodePatch objects", () => {
  const issues = analyzeDomIssues(
    `
    <html>
      <head>
        <link rel="canonical" href="">
        <script src="/blocking.js"></script>
      </head>
      <body>
        <h1 class="text-5xl font-bold">Auditsys</h1>
        <h1 class="text-2xl text-white">SEO 報告</h1>
        <img src="/hero-dashboard.webp" class="hero rounded-3xl">
      </body>
    </html>
    `,
    "https://auditsys.example/report",
  );

  assert.equal(issues.length, 4);
  assert.deepEqual(
    issues.map((issue) => issue.issueType),
    ["missing_alt", "multiple_h1", "invalid_canonical", "render_blocking"],
  );

  for (const issue of issues) {
    assert.equal(typeof issue.elementId, "string");
    assert.equal(typeof issue.description, "string");
    assert.equal(typeof issue.originalSnippet, "string");
    assert.equal(typeof issue.fixedSnippet, "string");
    assert.equal(typeof issue.diffExplanation, "string");
    assert.equal("snippet" in issue, false);
    assert.equal("element" in issue, false);
  }

  assert.match(issues[0].fixedSnippet, /alt="Auditsys SEO 稽核報告與效能分析介面"/);
  assert.match(issues[0].fixedSnippet, /fetchpriority="high"/);
  assert.match(issues[1].fixedSnippet, /<h2 class="text-2xl text-white">SEO 報告<\/h2>/);
  assert.match(issues[2].fixedSnippet, /href="https:\/\/auditsys\.example\/report"/);
  assert.match(issues[3].fixedSnippet, /defer/);
});
