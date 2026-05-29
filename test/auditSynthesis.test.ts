import { test } from "node:test";
import assert from "node:assert/strict";
import type { AuditEvidenceBundle, AuditRequestPayload } from "../src/Server/Services/auditPipelineTypes";
import type { CruxResult } from "../src/types/liveAudit.types";
import { buildAuditPrompt, buildFallbackSummary } from "../src/Server/Services/auditSynthesis";

function baseEvidence(overrides: Partial<AuditEvidenceBundle> = {}): AuditEvidenceBundle {
  const now = new Date().toISOString();
  return {
    deterministic: {
      stage: "deterministic",
      status: "completed",
      startedAt: now,
      completedAt: now,
      targetUrl: "https://example.com/",
      finalUrl: "https://example.com/",
      statusCode: 200,
      responseTimeMs: 1200,
      headers: { cacheControl: null, server: "nginx", poweredBy: null },
      document: {
        title: "Example",
        metaDescription: "desc",
        canonical: "https://example.com/",
        robots: null,
        lang: "en",
        viewport: "width=device-width",
        counts: {
          scripts: 18, stylesheets: 7, images: 10, imagesMissingAlt: 0,
          structuredDataBlocks: 1, headings: 5, h1: 1, internalLinks: 20,
          externalLinks: 4, openGraphTags: 3, preconnectHints: 1,
        },
      },
      notes: [],
      warnings: [],
    },
    browser: {
      stage: "browser",
      status: "completed",
      mode: "crawler",
      startedAt: now,
      completedAt: now,
      runtime: { runner: "crawler", instruction: "crawl", startUrl: "https://example.com/" },
      pages: [],
      flows: [],
      observations: [],
      warnings: [],
      screenshots: [],
      artifacts: { screenshotPaths: [], logPaths: [] },
    },
    ...overrides,
  };
}

function cruxWithData(): CruxResult {
  return {
    hasData: true,
    scope: "origin",
    collectionPeriod: "2026-04-01 → 2026-04-28",
    metrics: {
      lcp: { p75: 4200, rating: "poor" },
      inp: { p75: 180, rating: "good" },
      cls: { p75: 0.05, rating: "good" },
      fcp: { p75: 2100, rating: "needs-improvement" },
    },
    history: { lcp: { p75s: [] }, inp: { p75s: [] }, cls: { p75s: [] } },
  };
}

const enPayload: AuditRequestPayload = { url: "https://example.com/", language: "en" };

test("buildAuditPrompt includes measured CrUX values when hasData is true", () => {
  const prompt = buildAuditPrompt(enPayload, baseEvidence({ crux: cruxWithData() }));
  assert.match(prompt, /4200/);
  assert.match(prompt, /LCP/);
  assert.match(prompt, /MEASURED/);
});

test("buildAuditPrompt states no field data and omits fabricated vitals when CrUX is absent", () => {
  const prompt = buildAuditPrompt(enPayload, baseEvidence({ crux: { hasData: false, reason: "no_field_data", metrics: { lcp: { p75: null, rating: null }, inp: { p75: null, rating: null }, cls: { p75: null, rating: null }, fcp: { p75: null, rating: null } }, history: { lcp: { p75s: [] }, inp: { p75s: [] }, cls: { p75s: [] } } } }));
  assert.match(prompt, /no real-user/i);
  assert.doesNotMatch(prompt, /p75=\d/);
});

test("buildAuditPrompt instructs the rich schema with performanceFindings", () => {
  const prompt = buildAuditPrompt(enPayload, baseEvidence({ crux: cruxWithData() }));
  assert.match(prompt, /performanceFindings/);
  assert.match(prompt, /rootCause/);
  assert.match(prompt, /businessImpact/);
  assert.match(prompt, /actionableFix/);
});

test("buildFallbackSummary emits valid JSON with the rich schema arrays", () => {
  const json = buildFallbackSummary(enPayload, baseEvidence({ crux: cruxWithData() }), "test");
  const parsed = JSON.parse(json);
  assert.ok(typeof parsed.executiveSummary === "string");
  assert.ok(Array.isArray(parsed.performanceFindings));
  assert.ok(Array.isArray(parsed.deterministicFindings));
  assert.ok(Array.isArray(parsed.nextActions));
});

test("buildFallbackSummary uses measured CrUX p75 and tags modeled inferences (zh-TW)", () => {
  const zhPayload: AuditRequestPayload = { url: "https://example.com/", language: "zh-TW" };
  const json = buildFallbackSummary(zhPayload, baseEvidence({ crux: cruxWithData() }), "test");
  const parsed = JSON.parse(json);
  const lcp = parsed.performanceFindings.find((f: { finding: string }) => f.finding.includes("4200"));
  assert.ok(lcp, "expected an LCP finding carrying the measured p75");
  assert.equal(lcp.severity, "critical"); // poor rating → critical
  assert.match(JSON.stringify(parsed.performanceFindings), /估算|模型推估/);
});

test("buildFallbackSummary does NOT emit numeric vitals when CrUX is absent", () => {
  const json = buildFallbackSummary(enPayload, baseEvidence(), "test");
  const parsed = JSON.parse(json);
  assert.equal(parsed.performanceFindings.length, 1);
  assert.equal(parsed.performanceFindings[0].severity, "info");
  assert.match(parsed.performanceFindings[0].finding, /no real-user|field data/i);
});
