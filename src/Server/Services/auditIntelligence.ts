import type { AuditIntelligenceResult } from "./auditPipelineTypes";
import { normalizeAuditRequestPayload } from "./auditPipelineTypes";
import { runAuditHarness } from "./harnessRunner";
import { assertSafeAuditTargetUrl } from "./securityPolicies";

export async function generateAuditIntelligence(payload: unknown, config?: { aiProvider?: string, agentRouterApiKey?: string, openRouterApiKey?: string, apiKey?: string, allowedModels?: string[] }): Promise<AuditIntelligenceResult> {
  const normalizedPayload = normalizeAuditRequestPayload(payload);

  if (!normalizedPayload.url) {
    throw new Error("INVALID_AUDIT_PAYLOAD");
  }

  await assertSafeAuditTargetUrl(normalizedPayload.url);

  const { synthesis, evidence, harness } = await runAuditHarness(normalizedPayload, config);

  return {
    ...synthesis,
    generatedAt: new Date().toISOString(),
    request: normalizedPayload,
    evidence,
    harness,
  };
}
