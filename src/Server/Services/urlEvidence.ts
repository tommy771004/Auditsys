import { assertSafeAuditTargetUrl } from "./securityPolicies";
import { collectDeterministicEvidence } from "./deterministicCollector";
import { fetchCruxReport } from "./cruxCollector";
import type { DeterministicCollectorResult } from "../../shared/types/auditPipelineTypes";

/**
 * SSRF-guarded evidence collection for a target URL: the guard runs before any
 * fetch and its rejection propagates; the individual collectors degrade to null
 * so callers can render partial evidence.
 */

export interface UrlEvidence {
  deterministic: DeterministicCollectorResult | null;
  crux: Awaited<ReturnType<typeof fetchCruxReport>> | null;
}

export interface UrlEvidenceDependencies {
  assertSafeAuditTargetUrl: typeof assertSafeAuditTargetUrl;
  collectDeterministicEvidence: typeof collectDeterministicEvidence;
  fetchCruxReport: typeof fetchCruxReport;
}

export async function collectUrlEvidence(
  targetUrl: string,
  dependencies: UrlEvidenceDependencies = { assertSafeAuditTargetUrl, collectDeterministicEvidence, fetchCruxReport },
): Promise<UrlEvidence> {
  await dependencies.assertSafeAuditTargetUrl(targetUrl);
  const [deterministic, crux] = await Promise.all([
    dependencies.collectDeterministicEvidence({ url: targetUrl }).catch((err: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("Deterministic probe failed:", err instanceof Error ? err.message : err);
      }
      return null;
    }),
    dependencies.fetchCruxReport(targetUrl).catch((err: unknown) => {
      if (process.env.NODE_ENV !== "production") {
        console.error("CrUX fetch failed:", err instanceof Error ? err.message : err);
      }
      return null;
    }),
  ]);
  return { deterministic, crux };
}
