import { synthesizeAudit } from "./auditSynthesis";
import { collectBrowserEvidence } from "./browserCollector";
import { collectDeterministicEvidence } from "./deterministicCollector";
import { fetchCruxReport } from "./cruxCollector";
import type { AuditIntelligenceResult, BrowserCollectorResult } from "./auditPipelineTypes";
import { normalizeAuditRequestPayload } from "./auditPipelineTypes";
import { assertSafeAuditTargetUrl } from "./securityPolicies";

export async function generateAuditIntelligence(payload: unknown, config?: { openRouterApiKey?: string, apiKey?: string, allowedModels?: string[] }): Promise<AuditIntelligenceResult> {
  const normalizedPayload = normalizeAuditRequestPayload(payload);

  if (!normalizedPayload.url) {
    throw new Error("INVALID_AUDIT_PAYLOAD");
  }

  await assertSafeAuditTargetUrl(normalizedPayload.url);

  const deterministic = await collectDeterministicEvidence(normalizedPayload);

  // Parallel collection via Promise.allSettled to enforce barrier synchronization and prevent failure cascades
  const [browserResult, cruxResult] = await Promise.allSettled([
    collectBrowserEvidence(normalizedPayload, deterministic),
    fetchCruxReport(normalizedPayload.url),
  ]);

  let browser: BrowserCollectorResult;
  if (browserResult.status === "fulfilled") {
    browser = browserResult.value;
  } else {
    browser = {
      stage: "browser",
      status: "failed",
      mode: "stub",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      runtime: {
        runner: "stub",
        instruction: "Parallel execution fallback due to thread rejection",
        startUrl: normalizedPayload.url,
      },
      pages: [],
      flows: [],
      timeline: [],
      observations: ["Browser collection process rejected during orchestration."],
      warnings: [String(browserResult.reason || "Orchestrator timeout or exception")],
      screenshots: [],
      artifacts: {
        screenshotPaths: [],
        logPaths: [],
      },
      error: String(browserResult.reason || "Orchestrator thread failure"),
    };
  }

  const crux = cruxResult.status === "fulfilled" ? cruxResult.value : { hasData: false };

  const synthesis = await synthesizeAudit(normalizedPayload, {
    deterministic,
    browser,
    crux,
  }, config);

  return {
    ...synthesis,
    generatedAt: new Date().toISOString(),
    request: normalizedPayload,
    evidence: {
      deterministic,
      browser,
      crux,
    },
  };
}
