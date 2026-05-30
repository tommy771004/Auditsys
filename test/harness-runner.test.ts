import test from "node:test";
import assert from "node:assert/strict";
import { runAuditHarness } from "../src/Server/Services/harnessRunner.ts";
import type {
  AuditEvidenceBundle,
  AuditRequestPayload,
  AuditSynthesisResult,
  BrowserCollectorResult,
  DeterministicCollectorResult,
} from "../src/Server/Services/auditPipelineTypes.ts";

const request: AuditRequestPayload = {
  url: "https://example.com",
  language: "en",
};

function makeDeterministic(status: DeterministicCollectorResult["status"]): DeterministicCollectorResult {
  return {
    stage: "deterministic",
    status,
    startedAt: "2026-05-30T00:00:00.000Z",
    completedAt: "2026-05-30T00:00:01.000Z",
    targetUrl: request.url,
    finalUrl: request.url,
    statusCode: status === "completed" ? 200 : undefined,
    contentType: status === "completed" ? "text/html" : undefined,
    responseTimeMs: status === "completed" ? 120 : undefined,
    headers: status === "completed"
      ? {
          cacheControl: "max-age=60",
          server: "example",
          poweredBy: null,
        }
      : undefined,
    document: status === "completed"
      ? {
          title: "Example",
          metaDescription: "Example site",
          canonical: request.url,
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
        }
      : undefined,
    notes: status === "completed" ? ["Resolved host: example.com"] : ["Fetch failed"],
    warnings: [],
    error: status === "failed" ? "fetch_failed" : undefined,
  };
}

function makeBrowser(status: BrowserCollectorResult["status"]): BrowserCollectorResult {
  return {
    stage: "browser",
    status,
    mode: status === "skipped" ? "stub" : "crawler",
    startedAt: "2026-05-30T00:00:01.000Z",
    completedAt: "2026-05-30T00:00:02.000Z",
    runtime: {
      runner: status === "skipped" ? "stub" : "crawler",
      instruction: "Inspect example.com",
      startUrl: request.url,
      finalUrl: request.url,
      taskId: "test-browser",
      workspaceDir: "outputs/test",
    },
    pages: [
      {
        url: request.url,
        title: "Example",
        notes: ["Captured test page"],
      },
    ],
    flows: [
      {
        id: "landing",
        label: "Landing page",
        status: status === "completed" ? "completed" : "not_run",
        summary: "Landing page evidence",
        steps: ["Fetch page"],
      },
    ],
    timeline: status === "completed"
      ? [
          {
            id: "step-1",
            label: "Fetch Primary Document",
            status: "completed",
            detail: "HTTP 200",
          },
        ]
      : [],
    observations: ["Browser test observation"],
    warnings: [],
    screenshots: [],
    artifacts: {
      screenshotPaths: [],
      logPaths: [],
    },
    reason: status === "skipped" ? "browser_not_configured" : undefined,
  };
}

function makeSynthesis(evidence: AuditEvidenceBundle): AuditSynthesisResult {
  return {
    provider: "fallback",
    queued: false,
    reason: evidence.deterministic.status === "completed" ? "test" : "collector_failed",
    summary: JSON.stringify({
      executiveSummary: "Evidence-backed summary",
      deterministicFindings: [],
      browserFlowGaps: [],
      architectureRisks: [],
      nextActions: [],
    }),
  };
}

test("runAuditHarness applies the two-retry cap and passes when the third attempt clears the gate", async () => {
  let deterministicCalls = 0;

  const result = await runAuditHarness(request, undefined, {
    dependencies: {
      collectDeterministicEvidence: async () => {
        deterministicCalls += 1;
        return makeDeterministic(deterministicCalls < 3 ? "failed" : "completed");
      },
      collectBrowserEvidence: async () => makeBrowser("completed"),
      synthesizeAudit: async (_payload, evidence) => makeSynthesis(evidence),
    },
  });

  assert.equal(deterministicCalls, 3);
  assert.equal(result.harness.status, "passed");
  assert.equal(result.harness.attempts.length, 3);
  assert.equal(result.harness.governance.retriesUsed, 2);
  assert.equal(result.harness.pivots.length, 2);
  assert.equal(result.harness.qualityGate.failedCount, 0);
  assert.equal(result.harness.toolRegistry.length, 3);
});

test("runAuditHarness sends incomplete browser evidence to manual review without retrying a non-failed gate", async () => {
  let deterministicCalls = 0;

  const result = await runAuditHarness(request, undefined, {
    dependencies: {
      collectDeterministicEvidence: async () => {
        deterministicCalls += 1;
        return makeDeterministic("completed");
      },
      collectBrowserEvidence: async () => makeBrowser("skipped"),
      synthesizeAudit: async (_payload, evidence) => makeSynthesis(evidence),
    },
  });

  assert.equal(deterministicCalls, 1);
  assert.equal(result.harness.status, "manual_review");
  assert.equal(result.harness.attempts.length, 1);
  assert.equal(result.harness.governance.retriesUsed, 0);
  assert.equal(result.harness.handoffRequired, true);
  assert.equal(result.harness.handoffReason, "quality_gate_requires_manual_review");
  assert.equal(result.harness.qualityGate.warningCount > 0, true);
});
