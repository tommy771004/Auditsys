import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runAuditHarness } from "../src/Server/Services/harnessRunner.ts";
import { calculateModelCost, CostTracker } from "../src/Server/Services/harness/ObservabilityTelemetry.ts";
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

test("runAuditHarness keeps browser evidence mandatory for security and content goal routing", async () => {
  const goalCases = [
    ["security audit"],
    ["improve marketing copy"],
  ];

  for (const goals of goalCases) {
    let browserCalls = 0;
    const result = await runAuditHarness({ ...request, goals }, undefined, {
      dependencies: {
        collectDeterministicEvidence: async () => makeDeterministic("completed"),
        collectBrowserEvidence: async () => {
          browserCalls += 1;
          return makeBrowser("completed");
        },
        synthesizeAudit: async (_payload, evidence) => makeSynthesis(evidence),
      },
    });

    assert.equal(browserCalls, 1, `browser collector should run for goals: ${goals.join(", ")}`);
    assert.equal(result.harness.status, "passed");
    assert.equal(result.evidence.browser.status, "completed");
  }
});

test("runAuditHarness does not persist PROJECT_MEMORY.md unless explicitly enabled", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "auditsys-memory-"));
  const previousCwd = process.cwd();
  const previousPersistMemory = process.env.HARNESS_PERSIST_MEMORY;

  try {
    delete process.env.HARNESS_PERSIST_MEMORY;
    process.chdir(workspace);

    await runAuditHarness(request, undefined, {
      dependencies: {
        collectDeterministicEvidence: async () => makeDeterministic("completed"),
        collectBrowserEvidence: async () => makeBrowser("completed"),
        synthesizeAudit: async (_payload, evidence) => makeSynthesis(evidence),
      },
    });

    await assert.rejects(
      access(path.join(workspace, "PROJECT_MEMORY.md")),
      (error: NodeJS.ErrnoException) => error.code === "ENOENT",
    );
  } finally {
    process.chdir(previousCwd);
    if (previousPersistMemory === undefined) {
      delete process.env.HARNESS_PERSIST_MEMORY;
    } else {
      process.env.HARNESS_PERSIST_MEMORY = previousPersistMemory;
    }
    await rm(workspace, { recursive: true, force: true });
  }
});

test("free model accounting remains zero-cost under the USD budget tracker", () => {
  const costUsd = calculateModelCost("google/gemini-2.5-flash:free", 500_000, 250_000);
  const tracker = new CostTracker(0.01).add({
    model: "google/gemini-2.5-flash:free",
    inputTokens: 500_000,
    outputTokens: 250_000,
    costUsd,
  });

  assert.equal(costUsd, 0);
  assert.equal(tracker.totalCost, 0);
  assert.equal(tracker.overBudget, false);
});

test("runAuditHarness exposes backend-owned zero cost for free fallback models", async () => {
  const result = await runAuditHarness(request, { allowedModels: ["google/gemini-2.5-flash:free"] }, {
    dependencies: {
      collectDeterministicEvidence: async () => makeDeterministic("completed"),
      collectBrowserEvidence: async () => makeBrowser("completed"),
      synthesizeAudit: async (_payload, evidence) => ({
        ...makeSynthesis(evidence),
        model: "google/gemini-2.5-flash:free",
      }),
    },
  });

  assert.equal(result.harness.governance.costUsd, 0);
});

test("low Lighthouse scores are warnings and do not trigger retry attempts", async () => {
  const previousPagespeedKey = process.env.PAGESPEED_API_KEY;
  const previousVitePagespeedKey = process.env.VITE_PAGESPEED_API_KEY;
  const previousFetch = globalThis.fetch;
  let pagespeedCalls = 0;

  try {
    process.env.PAGESPEED_API_KEY = "test-key";
    delete process.env.VITE_PAGESPEED_API_KEY;
    globalThis.fetch = (async () => {
      pagespeedCalls += 1;
      return new Response(JSON.stringify({
        lighthouseResult: {
          categories: {
            performance: { score: 0.21 },
            accessibility: { score: 0.72 },
            seo: { score: 0.64 },
          },
        },
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const result = await runAuditHarness({ ...request, goals: ["performance"] }, undefined, {
      dependencies: {
        collectDeterministicEvidence: async () => makeDeterministic("completed"),
        collectBrowserEvidence: async () => makeBrowser("completed"),
        synthesizeAudit: async (_payload, evidence) => makeSynthesis(evidence),
      },
    });

    const lighthouseChecks = result.harness.qualityGate.checks.filter((check) => check.id.startsWith("lighthouse_"));

    assert.equal(pagespeedCalls, 1);
    assert.equal(result.harness.attempts.length, 1);
    assert.equal(result.harness.status, "manual_review");
    assert.equal(lighthouseChecks.length, 3);
    assert.equal(lighthouseChecks.every((check) => check.status === "warning"), true);
    assert.equal(lighthouseChecks.some((check) => check.status === "failed"), false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousPagespeedKey === undefined) {
      delete process.env.PAGESPEED_API_KEY;
    } else {
      process.env.PAGESPEED_API_KEY = previousPagespeedKey;
    }
    if (previousVitePagespeedKey === undefined) {
      delete process.env.VITE_PAGESPEED_API_KEY;
    } else {
      process.env.VITE_PAGESPEED_API_KEY = previousVitePagespeedKey;
    }
  }
});
