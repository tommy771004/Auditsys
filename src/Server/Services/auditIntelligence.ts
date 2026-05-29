import { synthesizeAudit } from "./auditSynthesis";
import { collectBrowserEvidence } from "./browserCollector";
import { collectDeterministicEvidence } from "./deterministicCollector";
import { fetchCruxReport } from "./cruxCollector";
import type { AuditIntelligenceResult } from "./auditPipelineTypes";
import { normalizeAuditRequestPayload } from "./auditPipelineTypes";
import { assertSafeAuditTargetUrl } from "./securityPolicies";

export async function generateAuditIntelligence(payload: unknown, config?: { openRouterApiKey?: string, apiKey?: string, allowedModels?: string[] }): Promise<AuditIntelligenceResult> {
  const normalizedPayload = normalizeAuditRequestPayload(payload);

  if (!normalizedPayload.url) {
    throw new Error("INVALID_AUDIT_PAYLOAD");
  }

  await assertSafeAuditTargetUrl(normalizedPayload.url);

  const deterministic = await collectDeterministicEvidence(normalizedPayload);
  // fetchCruxReport never throws (returns hasData:false on failure), so it is
  // safe to run in parallel with the browser collector without a try/catch.
  const [browser, crux] = await Promise.all([
    collectBrowserEvidence(normalizedPayload, deterministic),
    fetchCruxReport(normalizedPayload.url),
  ]);
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
