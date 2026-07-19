import test from "node:test";
import assert from "node:assert/strict";
import { buildLiveScanSummaryFromDeterministic } from "../src/Server/Services/liveScanCollector.ts";
import type {
  BrowserCollectedPage,
  BrowserCollectorResult,
  DeterministicCollectorResult,
} from "../src/shared/types/auditPipelineTypes";

const targetUrl = "https://example.com";

function makeDeterministic(): DeterministicCollectorResult {
  return {
    stage: "deterministic",
    status: "completed",
    startedAt: "2026-07-19T00:00:00.000Z",
    completedAt: "2026-07-19T00:00:01.000Z",
    targetUrl,
    finalUrl: targetUrl,
    statusCode: 200,
    contentType: "text/html",
    responseTimeMs: 120,
    headers: { cacheControl: "max-age=60", server: "example", poweredBy: null },
    document: {
      title: "Example",
      metaDescription: "Example site",
      canonical: targetUrl,
      robots: null,
      lang: "en",
      viewport: "width=device-width",
      counts: {
        scripts: 1,
        stylesheets: 1,
        images: 0,
        imagesMissingAlt: 0,
        structuredDataBlocks: 1,
        headings: 1,
        h1: 1,
        internalLinks: 0,
        externalLinks: 0,
        openGraphTags: 1,
        preconnectHints: 1,
      },
    },
    notes: ["Resolved host: example.com"],
    warnings: [],
  };
}

function makeBrowser(pages: BrowserCollectedPage[]): BrowserCollectorResult {
  return {
    stage: "browser",
    status: "completed",
    mode: "crawler",
    startedAt: "2026-07-19T00:00:01.000Z",
    completedAt: "2026-07-19T00:00:02.000Z",
    runtime: {
      runner: "crawler",
      instruction: "Inspect example.com",
      startUrl: targetUrl,
      finalUrl: targetUrl,
      taskId: "test-browser",
      workspaceDir: "outputs/test",
    },
    pages,
    flows: [
      {
        id: "landing",
        label: "Landing page",
        status: "completed",
        summary: "Landing page evidence",
        steps: ["Fetch page"],
      },
    ],
    timeline: [],
    observations: [],
    warnings: [],
    screenshots: [],
    artifacts: { screenshotPaths: [], logPaths: [] },
  };
}

function summarize(pages: BrowserCollectedPage[]) {
  return buildLiveScanSummaryFromDeterministic(makeDeterministic(), 0, {
    collectBrowserEvidence: async () => makeBrowser(pages),
  });
}

test("live scan routes derive from typed page fields", async () => {
  const summary = await summarize([
    { url: targetUrl, status: 200, responseTimeMs: 340, notes: ["Primary landing document."] },
    { url: `${targetUrl}/about`, status: 301, responseTimeMs: 88, notes: [] },
    { url: `${targetUrl}/broken`, status: null, responseTimeMs: null, notes: ["Failed to load."] },
  ]);

  assert.ok(summary);
  assert.deepEqual(
    summary.routes.map((route) => [route.status, route.responseTimeMs, route.ok]),
    [
      [200, 340, true],
      [301, 88, true],
      [null, null, false],
    ],
  );
  assert.deepEqual(summary.scores, {
    overall: 89,
    performance: 92,
    seo: 94,
    architecture: 82,
  });
});

test("live scan routes ignore prose notes entirely", async () => {
  // Regression guard for the old regex seam: numbers inside notes must never win
  // over (or substitute for) the typed fields.
  const summary = await summarize([
    { url: targetUrl, status: 200, responseTimeMs: 120, notes: ["Responded with HTTP 503 in 9999 ms."] },
    { url: `${targetUrl}/legacy`, notes: ["Responded with HTTP 200 in 50 ms."] },
  ]);

  assert.ok(summary);
  assert.deepEqual(
    summary.routes.map((route) => [route.status, route.responseTimeMs, route.ok]),
    [
      [200, 120, true],
      [null, null, false],
    ],
  );
});
