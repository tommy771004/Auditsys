import type {
  AuditIntelligenceResult,
  BrowserCollectedPage,
  DeterministicDocumentEvidence,
  AuditFindingCategory,
} from "../shared/types/auditPipelineTypes";
import { computeAuditScores, type AuditScores } from "../shared/auditScores";
import type { LiveScanSummary } from "../types/liveAudit.types";
import { categorizeFinding } from "../shared/types/auditPipelineTypes";

export type AuditReportArea = "performance" | "seo" | "architecture" | "runtime";
export type AuditFindingSeverity = "high" | "medium" | "low";

export interface AuditReportFinding {
  id: string;
  area: AuditReportArea;
  severity: AuditFindingSeverity;
  titleKey: string;
  detailKey: string;
  value?: number | string;
  category?: AuditFindingCategory;
  explanation?: string;
}

export interface AuditReportRoute {
  url: string;
  status: number | null;
  responseTimeMs: number | null;
  ok: boolean;
}

export interface AuditReportViewModel {
  target: {
    url: string;
    finalUrl: string;
    host: string;
    companyName?: string;
  };
  generatedAt: string;
  provider: string;
  model?: string;
  summary: string;
  summaryLines: string[];
  scores: AuditScores;
  findings: AuditReportFinding[];
  actions: AuditReportFinding[];
  evidence: {
    deterministic: {
      status: string;
      statusCode: number | null;
      responseTimeMs: number | null;
      contentType: string | null;
      document: DeterministicDocumentEvidence | null;
      warnings: string[];
    };
    browser: {
      status: string;
      mode: string;
      pageCount: number;
      flowCount: number;
      screenshotCount: number;
      warnings: string[];
    };
  };
  charts: {
    scores: Array<{ id: keyof AuditScores; value: number }>;
    assets: Array<{ id: keyof DeterministicDocumentEvidence["counts"]; value: number }>;
    seo: Array<{ id: string; value: number }>;
    routes: AuditReportRoute[];
  };
}

const SUMMARY_HEADINGS = new Set([
  "Executive Summary",
  "Deterministic Findings",
  "Browser Flow Gaps",
  "Architecture Risks",
  "Highest Priority Next Actions",
]);

function getHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function parseSummaryLines(summary: string | undefined): string[] {
  if (!summary) return [];

  return summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^\d+\.\s+/, "").replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .filter((line) => !SUMMARY_HEADINGS.has(line));
}

function buildRoutes(pages: BrowserCollectedPage[]): AuditReportRoute[] {
  return pages.map((page) => ({
    url: page.url,
    status: page.status ?? null,
    responseTimeMs: page.responseTimeMs ?? null,
    ok: page.status !== null && page.status !== undefined ? page.status >= 200 && page.status < 400 : false,
  }));
}

function buildFindings(report: AuditIntelligenceResult): AuditReportFinding[] {
  const { deterministic, browser } = report.evidence;
  const document = deterministic.document;
  const findings: AuditReportFinding[] = [];

  if (deterministic.status !== "completed" || !document) {
    const cat = categorizeFinding({ issue: "deterministic collection failed", affectedMetric: null });
    findings.push({
      id: "runtime.deterministic-collection",
      area: "runtime",
      severity: "high",
      titleKey: "auditReport.findings.deterministicCollection.title",
      detailKey: "auditReport.findings.deterministicCollection.detail",
      category: cat,
      explanation: report.summary?.includes("deterministic") ? undefined : undefined,
    });
    return findings;
  }

  // Helper to add finding with category + explanation
  const addFinding = (finding: Omit<AuditReportFinding, "category" | "explanation"> & { affectedMetric?: string | null }) => {
    const cat = categorizeFinding({ issue: finding.titleKey, affectedMetric: finding.affectedMetric ?? null });
    findings.push({
      ...finding,
      category: cat,
      // explanation will be resolved by the UI layer via i18n (report.explanation.<cat>)
      // but we keep the field for compatibility with LLM-generated findings
      explanation: undefined,
    });
  };

  if (!document.metaDescription) {
    addFinding({
      id: "seo.meta-description",
      area: "seo",
      severity: "high",
      titleKey: "auditReport.findings.metaDescription.title",
      detailKey: "auditReport.findings.metaDescription.detail",
      affectedMetric: "metadata",
    });
  }

  if (!document.canonical) {
    addFinding({
      id: "seo.canonical",
      area: "seo",
      severity: "high",
      titleKey: "auditReport.findings.canonical.title",
      detailKey: "auditReport.findings.canonical.detail",
      affectedMetric: "metadata",
    });
  }

  if (document.counts.imagesMissingAlt > 0) {
    addFinding({
      id: "seo.missing-alt",
      area: "seo",
      severity: "medium",
      titleKey: "auditReport.findings.missingAlt.title",
      detailKey: "auditReport.findings.missingAlt.detail",
      value: document.counts.imagesMissingAlt,
      affectedMetric: "image",
    });
  }

  if (document.counts.scripts > 12) {
    addFinding({
      id: "performance.script-volume",
      area: "performance",
      severity: "medium",
      titleKey: "auditReport.findings.scriptVolume.title",
      detailKey: "auditReport.findings.scriptVolume.detail",
      value: document.counts.scripts,
      affectedMetric: "content",
    });
  }

  if ((deterministic.responseTimeMs ?? 0) > 1800) {
    addFinding({
      id: "performance.response-time",
      area: "performance",
      severity: "high",
      titleKey: "auditReport.findings.responseTime.title",
      detailKey: "auditReport.findings.responseTime.detail",
      value: deterministic.responseTimeMs,
      affectedMetric: "lcp",
    });
  }

  if (!deterministic.headers?.cacheControl) {
    addFinding({
      id: "architecture.cache-control",
      area: "architecture",
      severity: "medium",
      titleKey: "auditReport.findings.cacheControl.title",
      detailKey: "auditReport.findings.cacheControl.detail",
      affectedMetric: "protocol",
    });
  }

  const runtimeGate = browser.timeline?.find((step) => step.status === "blocked" || step.status === "partial" || step.status === "not_run");
  if (runtimeGate) {
    addFinding({
      id: `runtime.${runtimeGate.id}`,
      area: "runtime",
      severity: runtimeGate.status === "blocked" ? "high" : "medium",
      titleKey: "auditReport.findings.runtimeGate.title",
      detailKey: "auditReport.findings.runtimeGate.detail",
      value: runtimeGate.label,
      affectedMetric: null,
    });
  }

  return findings;
}

function buildSeoChart(document: DeterministicDocumentEvidence | undefined): Array<{ id: string; value: number }> {
  return [
    { id: "title", value: document?.title ? 1 : 0 },
    { id: "metaDescription", value: document?.metaDescription ? 1 : 0 },
    { id: "canonical", value: document?.canonical ? 1 : 0 },
    { id: "viewport", value: document?.viewport ? 1 : 0 },
    { id: "structuredData", value: document?.counts.structuredDataBlocks ?? 0 },
    { id: "openGraph", value: document?.counts.openGraphTags ?? 0 },
  ];
}

export function buildAuditReportViewModel(report: AuditIntelligenceResult): AuditReportViewModel {
  const deterministic = report.evidence.deterministic;
  const browser = report.evidence.browser;
  const document = deterministic.document;
  const routes = buildRoutes(browser.pages);
  const routeTimings = routes.flatMap((route) => route.ok && route.responseTimeMs !== null ? [route.responseTimeMs] : []);
  const averageRouteMs = routeTimings.length > 0
    ? routeTimings.reduce((total, value) => total + value, 0) / routeTimings.length
    : null;
  const scores = computeAuditScores(report.evidence, averageRouteMs);
  const findings = buildFindings(report);

  return {
    target: {
      url: report.request.url,
      finalUrl: deterministic.finalUrl ?? report.request.url,
      host: getHost(deterministic.finalUrl ?? report.request.url),
      companyName: report.request.companyName,
    },
    generatedAt: report.generatedAt,
    provider: report.model ? `${report.provider} / ${report.model}` : report.provider,
    model: report.model,
    summary: report.summary?.trim() ?? "",
    summaryLines: parseSummaryLines(report.summary),
    scores,
    findings,
    actions: findings.filter((finding) => finding.area !== "runtime" || finding.severity !== "low").slice(0, 3),
    evidence: {
      deterministic: {
        status: deterministic.status,
        statusCode: deterministic.statusCode ?? null,
        responseTimeMs: deterministic.responseTimeMs ?? null,
        contentType: deterministic.contentType ?? null,
        document: document ?? null,
        warnings: deterministic.warnings,
      },
      browser: {
        status: browser.status,
        mode: browser.mode,
        pageCount: browser.pages.length,
        flowCount: browser.flows.length,
        screenshotCount: browser.screenshots.length,
        warnings: browser.warnings,
      },
    },
    charts: {
      scores: [
        { id: "overall", value: scores.overall },
        { id: "performance", value: scores.performance },
        { id: "seo", value: scores.seo },
        { id: "architecture", value: scores.architecture },
      ],
      assets: [
        { id: "scripts", value: document?.counts.scripts ?? 0 },
        { id: "stylesheets", value: document?.counts.stylesheets ?? 0 },
        { id: "images", value: document?.counts.images ?? 0 },
        { id: "imagesMissingAlt", value: document?.counts.imagesMissingAlt ?? 0 },
      ],
      seo: buildSeoChart(document),
      routes,
    },
  };
}

/** Adapts the SSE report to the same read model used by queued audits. */
export function buildLiveAuditReportViewModel(summary: LiveScanSummary, targetUrl: string, generatedAt = ""): AuditReportViewModel {
  const findings: AuditReportFinding[] = [];

  if (!summary.seo.hasMetaDescription) {
    findings.push({ id: "seo.meta-description", area: "seo", severity: "high", titleKey: "auditReport.findings.metaDescription.title", detailKey: "auditReport.findings.metaDescription.detail" });
  }
  if (!summary.seo.hasCanonical) {
    findings.push({ id: "seo.canonical", area: "seo", severity: "high", titleKey: "auditReport.findings.canonical.title", detailKey: "auditReport.findings.canonical.detail" });
  }
  if (summary.assets.imagesMissingAlt > 0) {
    findings.push({ id: "seo.missing-alt", area: "seo", severity: "medium", titleKey: "auditReport.findings.missingAlt.title", detailKey: "auditReport.findings.missingAlt.detail", value: summary.assets.imagesMissingAlt });
  }
  if (summary.responseTimeMs !== null && summary.responseTimeMs > 1800) {
    findings.push({ id: "performance.response-time", area: "performance", severity: "high", titleKey: "auditReport.findings.responseTime.title", detailKey: "auditReport.findings.responseTime.detail", value: summary.responseTimeMs });
  }
  if (summary.warnings.length > 0) {
    findings.push({ id: "runtime.warnings", area: "runtime", severity: "medium", titleKey: "auditReport.findings.runtimeGate.title", detailKey: "auditReport.findings.runtimeGate.detail", value: summary.warnings[0] });
  }

  return {
    target: { url: targetUrl, finalUrl: summary.finalUrl, host: getHost(summary.finalUrl) },
    generatedAt,
    provider: "live scan",
    summary: "",
    summaryLines: [],
    scores: summary.scores,
    findings,
    actions: findings.slice(0, 3),
    evidence: {
      deterministic: {
        status: summary.statusCode !== null && summary.statusCode >= 200 && summary.statusCode < 400 ? "completed" : "failed",
        statusCode: summary.statusCode,
        responseTimeMs: summary.responseTimeMs,
        contentType: null,
        document: null,
        warnings: summary.warnings,
      },
      browser: {
        status: summary.browserStatus,
        mode: summary.browserMode,
        pageCount: summary.routes.length,
        flowCount: summary.routes.length > 0 ? 1 : 0,
        screenshotCount: 0,
        warnings: summary.warnings,
      },
    },
    charts: {
      scores: [
        { id: "overall", value: summary.scores.overall },
        { id: "performance", value: summary.scores.performance },
        { id: "seo", value: summary.scores.seo },
        { id: "architecture", value: summary.scores.architecture },
      ],
      assets: [
        { id: "scripts", value: summary.assets.scripts },
        { id: "stylesheets", value: summary.assets.stylesheets },
        { id: "images", value: summary.assets.images },
        { id: "imagesMissingAlt", value: summary.assets.imagesMissingAlt },
      ],
      seo: [
        { id: "title", value: summary.seo.hasTitle ? 1 : 0 },
        { id: "metaDescription", value: summary.seo.hasMetaDescription ? 1 : 0 },
        { id: "canonical", value: summary.seo.hasCanonical ? 1 : 0 },
        { id: "viewport", value: summary.seo.hasViewport ? 1 : 0 },
        { id: "structuredData", value: summary.seo.structuredDataBlocks },
        { id: "openGraph", value: summary.seo.openGraphTags },
      ],
      routes: summary.routes,
    },
  };
}
