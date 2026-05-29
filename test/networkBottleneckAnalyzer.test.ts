import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeNetworkBottlenecks } from "../src/Server/Services/networkBottleneckAnalyzer";
import type { NetworkEvidence, NetworkResource } from "../src/types/networkEvidence.types";

function resource(over: Partial<NetworkResource>): NetworkResource {
  return {
    url: "https://example.com/a.js", type: "script", startMs: 0, durationMs: 100,
    transferBytes: 1000, encodedBytes: 1000, contentEncoding: "br", contentType: "application/javascript",
    isThirdParty: false, renderBlocking: false, fromCache: false, ...over,
  };
}

function evidence(resources: NetworkResource[], over: Partial<NetworkEvidence> = {}): NetworkEvidence {
  return {
    collector: "fetch-probe", finalUrl: "https://example.com/", resources,
    page: { fcpMs: null, lcpMs: null, longTasksMs: null, mainThreadBusyMs: null },
    truncated: false, notes: [], ...over,
  };
}

test("flags a slow resource as critical with a measured ms", () => {
  const findings = analyzeNetworkBottlenecks(evidence([resource({ durationMs: 1500 })]));
  const slow = findings.find((f) => f.category === "slow-resource");
  assert.equal(slow?.severity, "critical");
  assert.equal(slow?.measured, true);
  assert.equal(slow?.measuredMs, 1500);
});

test("flags render-blocking head CSS", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ url: "https://example.com/s.css", type: "stylesheet", renderBlocking: true, durationMs: 200 }),
  ]));
  assert.ok(findings.some((f) => f.category === "render-blocking"));
});

test("flags uncompressed large text resource", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ type: "script", contentEncoding: null, transferBytes: 50000, encodedBytes: 50000 }),
  ]));
  assert.ok(findings.some((f) => f.category === "uncompressed"));
});

test("flags legacy image format over size threshold", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ url: "https://example.com/h.jpg", type: "image", contentType: "image/jpeg", transferBytes: 200000, encodedBytes: 200000 }),
  ]));
  assert.ok(findings.some((f) => f.category === "image-format"));
});

test("emits a measured:false info finding for waterfall chains when no initiator data", () => {
  const findings = analyzeNetworkBottlenecks(evidence([resource({})]));
  const wf = findings.find((f) => f.category === "waterfall");
  assert.equal(wf?.measured, false);
  assert.equal(wf?.severity, "info");
});

test("third-party CPU finding is measured:false without longTasksMs", () => {
  const findings = analyzeNetworkBottlenecks(evidence([
    resource({ url: "https://cdn.x.com/t.js", isThirdParty: true, transferBytes: 90000, encodedBytes: 90000 }),
  ]));
  const tp = findings.find((f) => f.category === "third-party");
  assert.ok(tp);
  assert.equal(tp?.measured, false); // no CPU profiling in fetch-probe mode
});
