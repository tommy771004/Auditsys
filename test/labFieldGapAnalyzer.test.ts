import { test } from "node:test";
import assert from "node:assert/strict";
import type { CruxResult, PageSpeedResult } from "../src/types/liveAudit.types";
import { analyzeLabFieldGap } from "../src/Server/Services/labFieldGapAnalyzer";

function fieldData(overrides: Partial<CruxResult["metrics"]> = {}): CruxResult {
  return {
    hasData: true,
    scope: "origin",
    collectionPeriod: "2026-04-01 -> 2026-04-28",
    metrics: {
      lcp: { p75: 1800, rating: "good" },
      inp: { p75: 120, rating: "good" },
      cls: { p75: 0.04, rating: "good" },
      fcp: { p75: 1400, rating: "good" },
      ...overrides,
    },
    history: { lcp: { p75s: [] }, inp: { p75s: [] }, cls: { p75s: [] } },
  };
}

test("analyzeLabFieldGap flags severe network reality when lab LCP is fast but field LCP is slow", () => {
  const lab: PageSpeedResult = { score: 94, FCP: "0.8 s", LCP: "1.2 s", CLS: "0.01" };
  const result = analyzeLabFieldGap(lab, fieldData({ lcp: { p75: 3600, rating: "needs-improvement" } }));

  assert.equal(result.discrepancyLevel, "severe");
  assert.match(result.blindSpotIdentified, /實驗室數據/);
  assert.match(result.blindSpotIdentified, /4G|CDN|區域/);
  assert.match(result.strategicRecommendation, /CDN|preload|首屏/);
});

test("analyzeLabFieldGap flags device reality when lab score is healthy but field INP is poor", () => {
  const lab: PageSpeedResult = { score: 91, FCP: "1.0 s", LCP: "1.8 s", CLS: "0.02" };
  const result = analyzeLabFieldGap(lab, fieldData({ inp: { p75: 620, rating: "poor" } }));

  assert.equal(result.discrepancyLevel, "severe");
  assert.match(result.blindSpotIdentified, /低階行動裝置|低階手機/);
  assert.match(result.blindSpotIdentified, /React hydration|JS/);
  assert.match(result.strategicRecommendation, /Code Splitting|Hydration|第三方/);
});

test("analyzeLabFieldGap reports no discrepancy when lab and field data are both healthy", () => {
  const lab: PageSpeedResult = { score: 96, FCP: "0.9 s", LCP: "1.4 s", CLS: "0.03" };
  const result = analyzeLabFieldGap(lab, fieldData());

  assert.equal(result.discrepancyLevel, "none");
  assert.match(result.blindSpotIdentified, /未發現明顯落差/);
  assert.match(result.strategicRecommendation, /持續監控/);
});
