import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzePerformanceTrend } from "../src/Server/Services/performanceTrendAnalyzer";

test("analyzePerformanceTrend detects an LCP spike after a stable baseline", () => {
  const report = analyzePerformanceTrend([
    { scanId: "1", lcpMs: 1500, inpMs: 160, jsBytes: 720_000 },
    { scanId: "2", lcpMs: 1480, inpMs: 155, jsBytes: 725_000 },
    { scanId: "3", lcpMs: 1520, inpMs: 162, jsBytes: 730_000 },
    { scanId: "4", lcpMs: 1510, inpMs: 166, jsBytes: 735_000 },
    { scanId: "5", lcpMs: 3800, inpMs: 340, jsBytes: 760_000 },
  ]);

  assert.equal(report.trendStatus, "regressing");
  assert.match(report.trendSummary, /效能正在衰退/);
  assert.ok(report.keyRegressions.some((item) => item.includes("LCP 增加 +2.3 秒")));
  assert.match(report.hypothesizedRootCause, /首屏|hero|影片|圖片/);
});

test("analyzePerformanceTrend detects JavaScript payload bloat between adjacent scans", () => {
  const report = analyzePerformanceTrend([
    { scanId: "1", lcpMs: 1800, inpMs: 180, jsBytes: 700_000 },
    { scanId: "2", lcpMs: 1820, inpMs: 190, jsBytes: 720_000 },
    { scanId: "3", lcpMs: 1790, inpMs: 185, jsBytes: 740_000 },
    { scanId: "4", lcpMs: 2600, inpMs: 360, jsBytes: 1_190_000 },
    { scanId: "5", lcpMs: 2700, inpMs: 390, jsBytes: 1_230_000 },
  ]);

  assert.equal(report.trendStatus, "regressing");
  assert.ok(report.keyRegressions.some((item) => item.includes("JavaScript bundle 增加 +450 KB")));
  assert.match(report.hypothesizedRootCause, /第三方|函式庫|bundle|INP/);
});

test("analyzePerformanceTrend parses raw audit record result JSON", () => {
  const report = analyzePerformanceTrend([
    {
      id: "scan-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      result: JSON.stringify({
        evidence: {
          crux: { hasData: true, metrics: { lcp: { p75: 1600 }, inp: { p75: 140 }, cls: { p75: 0.04 } } },
          network: { totalScriptBytes: 600_000 },
        },
      }),
    },
    {
      id: "scan-2",
      createdAt: "2026-05-08T00:00:00.000Z",
      result: JSON.stringify({
        evidence: {
          crux: { hasData: true, metrics: { lcp: { p75: 1650 }, inp: { p75: 145 }, cls: { p75: 0.04 } } },
          network: { totalScriptBytes: 610_000 },
        },
      }),
    },
    {
      id: "scan-3",
      createdAt: "2026-05-15T00:00:00.000Z",
      result: JSON.stringify({
        evidence: {
          crux: { hasData: true, metrics: { lcp: { p75: 1700 }, inp: { p75: 150 }, cls: { p75: 0.05 } } },
          network: { totalScriptBytes: 620_000 },
        },
      }),
    },
    {
      id: "scan-4",
      createdAt: "2026-05-22T00:00:00.000Z",
      result: JSON.stringify({
        evidence: {
          crux: { hasData: true, metrics: { lcp: { p75: 1720 }, inp: { p75: 155 }, cls: { p75: 0.05 } } },
          network: { totalScriptBytes: 625_000 },
        },
      }),
    },
    {
      id: "scan-5",
      createdAt: "2026-05-29T00:00:00.000Z",
      result: JSON.stringify({
        evidence: {
          crux: { hasData: true, metrics: { lcp: { p75: 4100 }, inp: { p75: 520 }, cls: { p75: 0.08 } } },
          network: { totalScriptBytes: 1_075_000 },
        },
      }),
    },
  ]);

  assert.equal(report.trendStatus, "regressing");
  assert.ok(report.keyRegressions.some((item) => item.includes("LCP")));
  assert.ok(report.keyRegressions.some((item) => item.includes("INP")));
  assert.ok(report.keyRegressions.some((item) => item.includes("JavaScript")));
});
