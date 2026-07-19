import test from "node:test";
import assert from "node:assert/strict";
import type { AuditIntelligenceResult } from "../src/shared/types/auditPipelineTypes";
import { buildAuditReportViewModel } from "../src/services/auditReport";

const reportFixture: AuditIntelligenceResult = {
  generatedAt: "2026-07-19T08:00:00.000Z",
  request: { url: "https://example.com/audit", companyName: "Example" },
  provider: "fallback",
  queued: false,
  summary: "Executive Summary\n- Missing the meta description",
  evidence: {
    deterministic: {
      stage: "deterministic",
      status: "completed",
      startedAt: "2026-07-19T08:00:00.000Z",
      completedAt: "2026-07-19T08:00:01.250Z",
      targetUrl: "https://example.com/audit",
      finalUrl: "https://example.com/audit",
      statusCode: 200,
      contentType: "text/html",
      responseTimeMs: 1250,
      headers: { cacheControl: "public, max-age=60", server: "nginx", poweredBy: null },
      document: {
        title: "Example",
        metaDescription: null,
        canonical: "https://example.com/audit",
        robots: "index,follow",
        lang: "en",
        viewport: "width=device-width",
        counts: {
          scripts: 15,
          stylesheets: 5,
          images: 3,
          imagesMissingAlt: 2,
          structuredDataBlocks: 1,
          headings: 4,
          h1: 1,
          internalLinks: 4,
          externalLinks: 1,
          openGraphTags: 2,
          preconnectHints: 1,
        },
      },
      notes: [],
      warnings: [],
    },
    browser: {
      stage: "browser",
      status: "completed",
      mode: "crawler",
      startedAt: "2026-07-19T08:00:01.250Z",
      completedAt: "2026-07-19T08:00:03.250Z",
      runtime: {
        runner: "crawler",
        instruction: "Collect routes",
        startUrl: "https://example.com/audit",
      },
      pages: [
        { url: "https://example.com/audit", status: 200, responseTimeMs: 900, notes: [] },
        { url: "https://example.com/about", status: 200, responseTimeMs: 1100, notes: [] },
      ],
      flows: [{ id: "landing", label: "Landing page", status: "completed", summary: "ok", steps: [] }],
      observations: [],
      warnings: [],
      screenshots: [],
      artifacts: { screenshotPaths: [], logPaths: [] },
    },
  },
};

test("buildAuditReportViewModel keeps scores, findings, and charts on one evidence model", () => {
  const viewModel = buildAuditReportViewModel(reportFixture);

  assert.equal(viewModel.target.host, "example.com");
  assert.deepEqual(viewModel.scores, {
    overall: 73,
    performance: 65,
    seo: 72,
    architecture: 82,
  });
  assert.deepEqual(viewModel.charts.assets, [
    { id: "scripts", value: 15 },
    { id: "stylesheets", value: 5 },
    { id: "images", value: 3 },
    { id: "imagesMissingAlt", value: 2 },
  ]);
  assert.deepEqual(viewModel.charts.routes, [
    { url: "https://example.com/audit", status: 200, responseTimeMs: 900, ok: true },
    { url: "https://example.com/about", status: 200, responseTimeMs: 1100, ok: true },
  ]);
  assert.equal(viewModel.findings[0]?.id, "seo.meta-description");
  assert.equal(viewModel.findings[0]?.severity, "high");
  assert.equal(viewModel.evidence.browser.pageCount, 2);
});
