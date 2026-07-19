import { categorizeFinding, type AuditFindingCategory } from "../shared/types/auditPipelineTypes";

export type AuditRow = {
  id: string;
  targetUrl: string;
  status: "completed" | "pending" | "failed";
  result: string | null;
  userId: number | null;
  createdAt: string;
  companyName?: string | null;
};

export interface AdminStatsViewModel {
  statusBreakdown: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  recentAudits: Array<{
    id: string;
    targetUrl: string;
    status: "completed" | "pending" | "failed";
    createdAt: string;
    score?: number;
  }>;
  totals: {
    completed: number;
    pending: number;
    failed: number;
    total: number;
  };
}

const STATUS_COLORS = {
  completed: "#10b981",
  pending: "#f59e0b",
  failed: "#ef4444",
} as const;

export function buildAdminStatsViewModel(audits: AuditRow[]): AdminStatsViewModel {
  const completed = audits.filter((a) => a.status === "completed");
  const pending = audits.filter((a) => a.status === "pending");
  const failed = audits.filter((a) => a.status === "failed");

  const statusBreakdown = [
    { name: "Completed", value: completed.length, color: STATUS_COLORS.completed },
    { name: "Pending", value: pending.length, color: STATUS_COLORS.pending },
    { name: "Failed", value: failed.length, color: STATUS_COLORS.failed },
  ].filter((item) => item.value > 0);

  const recentAudits = [...audits]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20)
    .map((audit) => ({
      id: audit.id,
      targetUrl: audit.targetUrl,
      status: audit.status,
      createdAt: audit.createdAt,
      score: audit.result
        ? (() => {
            try {
              const parsed = JSON.parse(audit.result);
              return parsed.overall ?? parsed.scores?.overall;
            } catch {
              return undefined;
            }
          })()
        : undefined,
    }));

  return {
    statusBreakdown,
    recentAudits,
    totals: {
      completed: completed.length,
      pending: pending.length,
      failed: failed.length,
      total: audits.length,
    },
  };
}

export interface BuildAdminReportViewModelOptions {
  t: (key: string) => string;
}

export interface AdminReportViewModel {
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
  scores: {
    overall: number;
    performance: number;
    seo: number;
    architecture: number;
  };
  findings: Array<{
    id: string;
    area: "performance" | "seo" | "architecture" | "runtime";
    severity: "high" | "medium" | "low";
    titleKey: string;
    detailKey: string;
    value?: number | string;
    category?: AuditFindingCategory;
    explanation?: string;
    affectedMetric?: string | null;
  }>;
  charts: {
    scores: Array<{ id: string; value: number }>;
  };
}

export function buildAdminReportViewModel(
  audit: AuditRow,
  options: BuildAdminReportViewModelOptions
): AdminReportViewModel | null {
  const { t } = options;

  if (!audit.result) {
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(audit.result);
  } catch {
    return null;
  }

  const scoresObj = parsed.scores as Record<string, unknown> | undefined;
  const scores = {
    overall: (parsed.overall as number) ?? (scoresObj?.overall as number) ?? 0,
    performance: (scoresObj?.performance as number) ?? 0,
    seo: (scoresObj?.seo as number) ?? 0,
    architecture: (scoresObj?.architecture as number) ?? 0,
  };

  const findings = [];
  if (parsed.deterministicFindings) {
    findings.push(...(parsed.deterministicFindings as Array<Record<string, unknown>>).map((f, idx) => ({
      id: `deterministic-${idx}`,
      area: "performance" as const,
      severity: (f.severity as "high" | "medium" | "low") || "medium",
      titleKey: `auditReport.findings.deterministic.${idx}.title`,
      detailKey: `auditReport.findings.deterministic.${idx}.detail`,
      value: f.value,
      category: categorizeFinding({ issue: String(f.issue), affectedMetric: f.affectedMetric as string | null }),
      explanation: f.explanation,
      affectedMetric: f.affectedMetric,
    })));
  }
  if (parsed.browserFlowGaps) {
    findings.push(...(parsed.browserFlowGaps as Array<Record<string, unknown>>).map((f, idx) => ({
      id: `browser-${idx}`,
      area: "runtime" as const,
      severity: (f.severity as "high" | "medium" | "low") || "medium",
      titleKey: `auditReport.findings.browser.${idx}.title`,
      detailKey: `auditReport.findings.browser.${idx}.detail`,
      value: f.value,
      category: categorizeFinding({ issue: String(f.issue), affectedMetric: f.affectedMetric as string | null }),
      explanation: f.explanation,
      affectedMetric: f.affectedMetric,
    })));
  }
  if (parsed.architectureRisks) {
    findings.push(...(parsed.architectureRisks as Array<Record<string, unknown>>).map((f, idx) => ({
      id: `architecture-${idx}`,
      area: "architecture" as const,
      severity: (f.severity as "high" | "medium" | "low") || "medium",
      titleKey: `auditReport.findings.architecture.${idx}.title`,
      detailKey: `auditReport.findings.architecture.${idx}.detail`,
      value: f.value,
      category: categorizeFinding({ issue: String(f.issue), affectedMetric: f.affectedMetric as string | null }),
      explanation: f.explanation,
      affectedMetric: f.affectedMetric,
    })));
  }

  return {
    target: {
      url: audit.targetUrl,
      finalUrl: audit.targetUrl,
      host: (() => { try { return new URL(audit.targetUrl).hostname; } catch { return audit.targetUrl; } })(),
      companyName: audit.companyName,
    },
    generatedAt: audit.createdAt,
    provider: (parsed.provider as string) ? `${parsed.provider as string} / ${(parsed.model as string) ?? ""}` : "fallback",
    model: (parsed.model as string) ?? undefined,
    summary: (parsed.executiveSummary as string) ?? "",
    scores,
    findings,
    charts: {
      scores: [
        { id: "overall", value: scores.overall },
        { id: "performance", value: scores.performance },
        { id: "seo", value: scores.seo },
        { id: "architecture", value: scores.architecture },
      ],
    },
  };
}