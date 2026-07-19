import { test } from "node:test";
import assert from "node:assert";
import { buildSlidesViewModel } from "../src/services/buildSlidesViewModel.ts";
import type { AuditIntelligenceResult } from "../src/shared/types/auditPipelineTypes.ts";

function makeFakeReport(): AuditIntelligenceResult {
  return {
    generatedAt: "2026-07-19T00:00:00.000Z",
    request: {
      url: "https://example.com",
      language: "zh-TW",
    },
    evidence: {
      deterministic: {
        stage: "deterministic",
        status: "completed",
        startedAt: "2026-07-19T00:00:00.000Z",
        completedAt: "2026-07-19T00:00:01.000Z",
        targetUrl: "https://example.com",
        finalUrl: "https://example.com",
        statusCode: 200,
        contentType: "text/html",
        responseTimeMs: 450,
        headers: {
          cacheControl: "max-age=3600",
          server: "nginx",
          poweredBy: null,
        },
        document: {
          title: "Example Site",
          metaDescription: "Example description",
          canonical: "https://example.com",
          robots: "index,follow",
          lang: "en",
          viewport: "width=device-width, initial-scale=1",
          counts: {
            scripts: 8,
            stylesheets: 3,
            images: 5,
            imagesMissingAlt: 1,
            structuredDataBlocks: 2,
            headings: 4,
            h1: 1,
            internalLinks: 12,
            externalLinks: 3,
            openGraphTags: 4,
            preconnectHints: 2,
          },
        },
        notes: ["Resolved host: example.com"],
        warnings: [],
      },
      browser: {
        stage: "browser",
        status: "completed",
        mode: "crawler",
        startedAt: "2026-07-19T00:00:01.000Z",
        completedAt: "2026-07-19T00:00:03.000Z",
        runtime: {
          runner: "crawler",
          instruction: "crawl",
          startUrl: "https://example.com",
        },
        pages: [
          { url: "https://example.com/", status: 200, responseTimeMs: 120, notes: [] },
          { url: "https://example.com/about", status: 200, responseTimeMs: 95, notes: [] },
        ],
        flows: [],
        timeline: [],
        observations: [],
        warnings: [],
        screenshots: [],
        artifacts: { screenshotPaths: [], logPaths: [], reportPath: "", trajectoryPath: "", tracePath: "" },
      },
    },
    provider: "openrouter",
    queued: false,
    summary: "Test audit summary",
    model: "test-model",
  };
}

function mockT(key: string): string {
  if (key.startsWith("auditReport.presentation.slide")) {
    const parts = key.split(".");
    if (parts[4] === "title") return "Test Title";
    if (parts[4] === "subtitle") return "Test Subtitle";
    if (parts[4] === "takeaway") {
      if (parts[3] === "strong") return "Strong";
      if (parts[3] === "fair") return "Fair";
      if (parts[3] === "weak") return "Weak";
      if (parts[3] === "cwv") return "CWV Takeaway";
      if (parts[3] === "backend") return "Backend Takeaway";
      if (parts[3] === "network") return "Network Takeaway";
      if (parts[3] === "actions") return "Actions Takeaway";
      return "Takeaway";
    }
  }
  if (key.startsWith("auditReport.scores.")) {
    const score = key.split(".")[2];
    return { overall: "Overall", performance: "Performance", seo: "SEO", architecture: "Architecture" }[score] ?? score;
  }
  return key;
}

test("buildSlidesViewModel: returns exactly 5 slides with stable structure", () => {
  const report = makeFakeReport();
  const result = buildSlidesViewModel(report, { t: mockT });
  
  assert.equal(result.slides.length, 5);
  result.slides.forEach((slide, idx) => {
    assert.ok(slide.slideId === idx + 1, `slideId should be ${idx + 1}`);
    assert.ok(typeof slide.title === "string" && slide.title.length > 0, "title present");
    assert.ok(typeof slide.subtitle === "string" && slide.subtitle.length > 0, "subtitle present");
    assert.ok(["green", "yellow", "red"].includes(slide.healthStatus), "healthStatus valid");
    assert.ok(Array.isArray(slide.bullets), "bullets is array");
    assert.ok(Array.isArray(slide.explanations), "explanations is array");
    assert.ok(["conversion", "cvw", "backend", "network", "action"].includes(slide.chartType), "chartType valid");
    assert.ok(Array.isArray(slide.chartData), "chartData is array");
    assert.ok(Array.isArray(slide.metrics), "metrics is array");
    assert.ok(typeof slide.technicalInsight === "string" && slide.technicalInsight.length > 0, "technicalInsight present");
    assert.ok(typeof slide.businessTakeaway === "string" && slide.businessTakeaway.length > 0, "businessTakeaway present");
  });
});

test("buildSlidesViewModel: same input produces identical output (stable)", () => {
  const report = makeFakeReport();
  const r1 = buildSlidesViewModel(report, { t: mockT });
  const r2 = buildSlidesViewModel(report, { t: mockT });
  
  assert.deepStrictEqual(r1, r2, "output must be stable for identical input");
});

test("buildSlidesViewModel: slide chart types match expected sequence", () => {
  const report = makeFakeReport();
  const result = buildSlidesViewModel(report, { t: mockT });
  
  const expectedTypes = ["conversion", "cvw", "backend", "network", "action"];
  expectedTypes.forEach((type, idx) => {
    assert.equal(result.slides[idx].chartType, type, `slide ${idx + 1} chartType`);
  });
});

test("buildSlidesViewModel: health status derived from score thresholds", () => {
  const report = makeFakeReport();
  const result = buildSlidesViewModel(report, { t: mockT });
  
  // overall score ~90+ should be green
  assert.equal(result.slides[0].healthStatus, "green", "slide 1 (overall) should be green for high score");
  assert.equal(result.slides[4].healthStatus, "green", "slide 5 (overall) should be green for high score");
  
  // performance score ~90+ should be green
  assert.equal(result.slides[1].healthStatus, "green", "slide 2 (performance) should be green");
  assert.equal(result.slides[3].healthStatus, "green", "slide 4 (performance) should be green");
  
  // architecture score ~90+ should be green
  assert.equal(result.slides[2].healthStatus, "green", "slide 3 (architecture) should be green");
});

test("buildSlidesViewModel: metrics contain label/value/unit/comparison", () => {
  const report = makeFakeReport();
  const result = buildSlidesViewModel(report, { t: mockT });
  
  result.slides.forEach((slide) => {
    slide.metrics.forEach((metric) => {
      assert.ok(typeof metric.label === "string" && metric.label.length > 0, "metric.label");
      assert.ok(typeof metric.value === "string" && metric.value.length > 0, "metric.value");
      if (metric.unit !== undefined) assert.ok(typeof metric.unit === "string", "metric.unit");
      if (metric.comparison !== undefined) assert.ok(typeof metric.comparison === "string", "metric.comparison");
    });
  });
});