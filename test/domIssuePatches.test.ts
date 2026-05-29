import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDomIssuePatch } from "../src/Server/Services/domIssuePatches";

test("buildDomIssuePatch generates zh-TW alt text and eager priority hints for hero images", () => {
  const issue = buildDomIssuePatch({
    elementId: "img.hero-visual",
    issueType: "missing_alt",
    originalSnippet: '<img src="/assets/seo-audit-dashboard.webp" class="hero-visual rounded-3xl" />',
    finalUrl: "https://auditsys.example/",
  });

  assert.equal(issue.issueType, "missing_alt");
  assert.match(issue.description, /缺少 alt/);
  assert.match(issue.fixedSnippet, /alt="Auditsys SEO 稽核報告與效能分析介面"/);
  assert.match(issue.fixedSnippet, /fetchpriority="high"/);
  assert.match(issue.fixedSnippet, /loading="eager"/);
  assert.match(issue.diffExplanation, /fetchpriority='high'/);
});

test("buildDomIssuePatch downgrades duplicate h1 tags while preserving Tailwind classes", () => {
  const issue = buildDomIssuePatch({
    elementId: "h1 (2 found)",
    issueType: "multiple_h1",
    originalSnippet: '<h1 class="text-2xl font-bold text-white">SEO 成效摘要</h1>',
    finalUrl: "https://auditsys.example/",
  });

  assert.equal(
    issue.fixedSnippet,
    '<h2 class="text-2xl font-bold text-white">SEO 成效摘要</h2>',
  );
  assert.match(issue.description, /多個 H1/);
});

test("buildDomIssuePatch repairs invalid canonical links using the final scanned URL", () => {
  const issue = buildDomIssuePatch({
    elementId: "link[rel=canonical]",
    issueType: "invalid_canonical",
    originalSnippet: '<link rel="canonical" href="">',
    finalUrl: "https://auditsys.example/report?utm_source=test",
  });

  assert.equal(
    issue.fixedSnippet,
    '<link rel="canonical" href="https://auditsys.example/report?utm_source=test">',
  );
  assert.match(issue.description, /Canonical/);
});

test("buildDomIssuePatch defers render-blocking scripts without changing their source", () => {
  const issue = buildDomIssuePatch({
    elementId: "script[src]",
    issueType: "render_blocking",
    originalSnippet: '<script src="/analytics.js"></script>',
    finalUrl: "https://auditsys.example/",
  });

  assert.equal(issue.fixedSnippet, '<script src="/analytics.js" defer></script>');
  assert.match(issue.diffExplanation, /defer/);
});
