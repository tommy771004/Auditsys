import test from "node:test";
import assert from "node:assert/strict";
import type { LiveScanSummary } from "../src/types/liveAudit.types";
import { buildAnalyticsChartModel } from "../src/components/ui/analyticsChartPresenter";
import { buildAuditOutcomeViewModel } from "../src/components/live/auditOutcomePresenter";

function createSummary(overrides: Partial<LiveScanSummary> = {}): LiveScanSummary {
  return {
    finalUrl: "https://example.com",
    statusCode: 200,
    responseTimeMs: 360,
    server: "Vercel",
    scores: {
      overall: 96,
      performance: 94,
      seo: 98,
      architecture: 92,
    },
    assets: {
      scripts: 8,
      stylesheets: 2,
      images: 6,
      imagesMissingAlt: 0,
    },
    seo: {
      hasTitle: true,
      hasMetaDescription: true,
      hasCanonical: true,
      hasViewport: true,
      h1Count: 1,
      structuredDataBlocks: 1,
      openGraphTags: 6,
    },
    routes: [],
    averageRouteResponseMs: 360,
    domIssueCount: 0,
    warnings: [],
    browserStatus: "ok",
    browserMode: "chromium",
    ...overrides,
  };
}

test("buildAnalyticsChartModel labels live summary data as the current scan", () => {
  const model = buildAnalyticsChartModel(createSummary({ responseTimeMs: 500 }));

  assert.equal(model.dataSource.kind, "live");
  assert.equal(model.dataSource.label, "本次掃描");
  assert.equal(model.performanceData.find((item) => item.id === "ttfb")?.current, 500);
});

test("buildAnalyticsChartModel marks absent summary data as estimated fallback", () => {
  const model = buildAnalyticsChartModel();

  assert.equal(model.dataSource.kind, "fallback");
  assert.equal(model.dataSource.label, "估算資料");
  assert.ok(model.dataSource.description.includes("尚未接收到"));
});

test("buildAuditOutcomeViewModel escalates poor score and DOM defects into a danger outcome", () => {
  const model = buildAuditOutcomeViewModel(
    createSummary({
      scores: { overall: 42, performance: 38, seo: 55, architecture: 44 },
      domIssueCount: 7,
      warnings: ["HTTP/2 未啟用", "圖片缺少 alt", "DOM 深度過高"],
      responseTimeMs: 1800,
    }),
  );

  assert.equal(model.severity, "danger");
  assert.equal(model.title, "嚴重衰退");
  assert.match(model.headline, /42/);
  assert.match(model.recommendation, /DOM|JavaScript|圖片|metadata/);
});

test("buildAuditOutcomeViewModel returns a success outcome for a clean high-confidence scan", () => {
  const model = buildAuditOutcomeViewModel(createSummary());

  assert.equal(model.severity, "success");
  assert.equal(model.title, "狀態良好");
  assert.equal(model.dataSourceLabel, "本次掃描");
  assert.match(model.recommendation, /持續監控/);
});
