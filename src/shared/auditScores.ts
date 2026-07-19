import type { AuditEvidenceBundle } from "./types/auditPipelineTypes";

/**
 * The single score formula for {deterministic, browser} evidence. Both the
 * live SSE scan and the queued report used to compute performance/seo/
 * architecture/overall independently and had already drifted — same site,
 * same evidence, different scores depending on which path ran. This is the
 * one place that decides the numbers; both paths call it.
 */

export interface AuditScores {
  overall: number;
  performance: number;
  seo: number;
  architecture: number;
}

const FAILED_DETERMINISTIC_SCORES: AuditScores = { overall: 28, performance: 24, seo: 30, architecture: 36 };

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function computeAuditScores(evidence: AuditEvidenceBundle, averageRouteMs: number | null = null): AuditScores {
  const { deterministic, browser } = evidence;

  if (deterministic.status !== "completed" || !deterministic.document) {
    return FAILED_DETERMINISTIC_SCORES;
  }

  const document = deterministic.document;

  let performance = 92;
  if (typeof deterministic.responseTimeMs === "number") {
    performance -= Math.max(0, (deterministic.responseTimeMs - 600) / 35);
  }
  if (averageRouteMs !== null) {
    performance -= Math.max(0, (averageRouteMs - 800) / 60);
  }
  performance -= Math.max(0, document.counts.scripts - 12) * 1.3;
  performance -= Math.max(0, document.counts.stylesheets - 4) * 1.5;

  let seo = 94;
  if (!document.metaDescription) seo -= 18;
  if (!document.canonical) seo -= 16;
  if (!document.lang) seo -= 8;
  if (!document.viewport) seo -= 8;
  if (document.counts.structuredDataBlocks === 0) seo -= 12;
  if (document.counts.h1 !== 1) seo -= 8;
  if (document.counts.openGraphTags === 0) seo -= 6;
  seo -= Math.min(16, document.counts.imagesMissingAlt * 2);

  let architecture = 82;
  if (browser.status === "partial") architecture -= 10;
  else if (browser.status !== "completed") architecture -= 18;
  if (deterministic.headers?.poweredBy) architecture -= 8;
  if (!deterministic.headers?.cacheControl) architecture -= 6;
  if (deterministic.warnings.length > 2) architecture -= Math.min(18, deterministic.warnings.length * 2);

  const performanceScore = clampScore(performance);
  const seoScore = clampScore(seo);
  const architectureScore = clampScore(architecture);

  return {
    overall: clampScore((performanceScore + seoScore + architectureScore) / 3),
    performance: performanceScore,
    seo: seoScore,
    architecture: architectureScore,
  };
}
