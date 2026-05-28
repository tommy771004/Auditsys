import { synthesizeAudit } from "./auditSynthesis";
import { collectBrowserEvidence } from "./browserCollector";
import { collectDeterministicEvidence } from "./deterministicCollector";
import type { AuditIntelligenceResult } from "./auditPipelineTypes";
import { normalizeAuditRequestPayload } from "./auditPipelineTypes";
import { assertSafeAuditTargetUrl } from "./securityPolicies";

export async function generateAuditIntelligence(payload: unknown, config?: { apiKey?: string, allowedModels?: string[] }): Promise<AuditIntelligenceResult> {
  const normalizedPayload = normalizeAuditRequestPayload(payload);

  if (!normalizedPayload.url) {
    throw new Error("INVALID_AUDIT_PAYLOAD");
  }

  await assertSafeAuditTargetUrl(normalizedPayload.url);

  const deterministic = await collectDeterministicEvidence(normalizedPayload);
  const browser = await collectBrowserEvidence(normalizedPayload, deterministic);
  const synthesis = await synthesizeAudit(normalizedPayload, {
    deterministic,
    browser,
  }, config);

  return {
    ...synthesis,
    generatedAt: new Date().toISOString(),
    request: normalizedPayload,
    evidence: {
      deterministic,
      browser,
    },
  };
}
