import { test } from "node:test";
import assert from "node:assert/strict";
import { formatBottleneckReport } from "../src/Server/Services/networkReportFormatter";
import type { BottleneckFinding } from "../src/types/networkEvidence.types";

const critical: BottleneckFinding = {
  severity: "critical", target: "example.com/app.js", measuredMs: 1500, category: "slow-resource",
  diagnosis: "回應太慢。", resolution: "啟用 HTTP/2。", measured: true,
};
const infoUnmeasured: BottleneckFinding = {
  severity: "info", target: "瀑布鏈分析", measuredMs: null, category: "waterfall",
  diagnosis: "需真實瀏覽器。", resolution: "啟用 Playwright。", measured: false,
};

test("critical finding maps to error level and includes measured ms", () => {
  const lines = formatBottleneckReport([critical]);
  assert.equal(lines[1].level, "error");
  assert.match(lines[1].message, /🔴/);
  assert.match(lines[1].message, /1500ms/);
  assert.match(lines[1].message, /診斷/);
  assert.match(lines[1].message, /建議解法/);
});

test("unmeasured info finding maps to info level and omits the ms line", () => {
  const lines = formatBottleneckReport([infoUnmeasured]);
  assert.equal(lines[1].level, "info");
  assert.doesNotMatch(lines[1].message, /ms/);
});

test("emits a header line when findings exist", () => {
  const lines = formatBottleneckReport([critical]);
  assert.ok(lines.length >= 2);
  assert.match(lines[0].message, /網路瓶頸/);
});

test("returns a success line when there are no findings", () => {
  const lines = formatBottleneckReport([]);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].level, "success");
});
