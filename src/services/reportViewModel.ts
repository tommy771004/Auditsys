import type { TFunction } from "i18next";
import type { AuditIntelligenceResult, BrowserCollectorFlow, BrowserCollectorTimelineStep } from "../Server/Services/auditPipelineTypes";

export type ReportSectionId = "overview" | "performance" | "seo" | "architecture" | "actions";

export interface ReportMetricItem {
  id: string;
  value: number;
  labelKey: string;
  support: string;
  glow: "purple" | "cyan" | "blue" | "none";
  tooltip?: string;
}

export interface PanelContent {
  title: string;
  description: string;
  bullets: string[];
}

export interface ReportArchitectureNode {
  id: string;
  label: string;
  className: string;
}

export interface BrowserEvidenceStatItem {
  id: string;
  value: string;
  label: string;
  tone: "default" | "warning" | "success";
}

export interface BrowserEvidenceArtifactItem {
  id: string;
  label: string;
  value: string;
}

export interface BrowserEvidenceTimelineItem {
  id: string;
  label: string;
  detail?: string;
  statusLabel: string;
  tone: "default" | "warning" | "success";
}

export interface BrowserEvidenceViewModel {
  stats: BrowserEvidenceStatItem[];
  details: string[];
  artifacts: BrowserEvidenceArtifactItem[];
  timeline: BrowserEvidenceTimelineItem[];
}

export interface SampleReportViewModel {
  headerSubtitle: string;
  generatedAtLabel: string;
  metadataChips: string[];
  metricItems: ReportMetricItem[];
  panelContentMap: Record<ReportSectionId, PanelContent>;
  browserEvidence: BrowserEvidenceViewModel;
  architectureNodes: ReportArchitectureNode[];
  architectureIssueTitle: string;
  architectureIssueDescription: string;
  actionItems: string[];
  actionSummary: string;
}

const summaryHeadingLines = new Set([
  "Executive Summary",
  "Deterministic Findings",
  "Browser Flow Gaps",
  "Architecture Risks",
  "Highest Priority Next Actions",
]);

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function parseSummaryLines(summary?: string): string[] {
  if (!summary) {
    return [];
  }

  return summary
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^\d+\.\s+/, "").replace(/^[-*]\s+/, "").trim())
    .filter(Boolean)
    .filter((line) => !summaryHeadingLines.has(line));
}

function getHost(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function formatGeneratedAt(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getStatusLabel(status: string, t: TFunction): string {
  return t(`report.runtime.status.${status}`);
}

function getModeLabel(mode: string, t: TFunction): string {
  return t(`report.runtime.modes.${mode}`);
}

function hasBrowserRuntimeEvidence(status: string): boolean {
  return status === "completed" || status === "partial";
}

function getFirstRelevantFlow(flows: BrowserCollectorFlow[]): BrowserCollectorFlow | undefined {
  return flows.find((flow) => flow.status !== "not_run") ?? flows[0];
}

function getPrimaryRuntimeGate(steps: BrowserCollectorTimelineStep[] | undefined): BrowserCollectorTimelineStep | undefined {
  return steps?.find((step) => step.status === "blocked")
    ?? steps?.find((step) => step.status === "partial" || step.status === "not_run");
}

function formatArtifactLocation(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalizedValue = value.replace(/\\/g, "/");
  const segments = normalizedValue.split("/").filter(Boolean);

  return segments.length <= 3 ? normalizedValue : segments.slice(-3).join("/");
}

function buildArtifactItems(report: AuditIntelligenceResult, t: TFunction): BrowserEvidenceArtifactItem[] {
  const browser = report.evidence.browser;
  const items: BrowserEvidenceArtifactItem[] = [];

  if (browser.artifacts.reportPath) {
    items.push({
      id: "report",
      label: t("report.runtime.evidence.manifest.labels.report"),
      value: formatArtifactLocation(browser.artifacts.reportPath) ?? browser.artifacts.reportPath,
    });
  }

  if (browser.artifacts.tracePath) {
    items.push({
      id: "trace",
      label: t("report.runtime.evidence.manifest.labels.trace"),
      value: formatArtifactLocation(browser.artifacts.tracePath) ?? browser.artifacts.tracePath,
    });
  } else if (browser.artifacts.trajectoryPath) {
    items.push({
      id: "trajectory",
      label: t("report.runtime.evidence.manifest.labels.trajectory"),
      value: formatArtifactLocation(browser.artifacts.trajectoryPath) ?? browser.artifacts.trajectoryPath,
    });
  }

  browser.artifacts.screenshotPaths.slice(0, 3).forEach((path, index) => {
    items.push({
      id: `screenshot-${index + 1}`,
      label: t("report.runtime.evidence.manifest.labels.screenshot", { index: index + 1 }),
      value: formatArtifactLocation(path) ?? path,
    });
  });

  browser.artifacts.logPaths.slice(0, 2).forEach((path, index) => {
    items.push({
      id: `log-${index + 1}`,
      label: t("report.runtime.evidence.manifest.labels.log", { index: index + 1 }),
      value: formatArtifactLocation(path) ?? path,
    });
  });

  return items;
}

function buildTimelineItems(steps: BrowserCollectorTimelineStep[] | undefined, t: TFunction): BrowserEvidenceTimelineItem[] {
  if (!steps?.length) {
    return [];
  }

  return steps.slice(0, 6).map((step) => ({
    id: step.id,
    label: step.label,
    detail: step.detail,
    statusLabel: getStatusLabel(step.status, t),
    tone: step.status === "completed" ? "success" : step.status === "partial" || step.status === "blocked" ? "warning" : "default",
  }));
}

function buildBrowserEvidence(report: AuditIntelligenceResult, t: TFunction, modeLabel: string, statusLabel: string): BrowserEvidenceViewModel {
  const browser = report.evidence.browser;
  const browserRuntimeAvailable = hasBrowserRuntimeEvidence(browser.status);
  const activeFlowCount = browser.flows.filter((flow) => flow.status === "completed" || flow.status === "partial").length;
  const artifacts = buildArtifactItems(report, t);
  const timeline = buildTimelineItems(browser.timeline, t);
  const stats: BrowserEvidenceStatItem[] = [
    {
      id: "pages",
      value: String(browser.pages.length),
      label: t("report.runtime.evidence.stats.pages"),
      tone: browser.pages.length > 0 ? "success" : browserRuntimeAvailable ? "warning" : "default",
    },
    {
      id: "flows",
      value: `${activeFlowCount}/${browser.flows.length}`,
      label: t("report.runtime.evidence.stats.flows"),
      tone: activeFlowCount > 0 ? "success" : browserRuntimeAvailable ? "warning" : "default",
    },
    {
      id: "screenshots",
      value: String(browser.screenshots.length),
      label: t("report.runtime.evidence.stats.screenshots"),
      tone: browser.screenshots.length > 0 ? "success" : browserRuntimeAvailable ? "warning" : "default",
    },
    {
      id: "logs",
      value: String(browser.artifacts.logPaths.length),
      label: t("report.runtime.evidence.stats.logs"),
      tone: browser.artifacts.logPaths.length > 0 ? "success" : "default",
    },
  ];

  const details = uniqueStrings([
    t("report.runtime.evidence.detail.runtime", {
      status: statusLabel,
      mode: modeLabel,
    }),
    browser.runtime.workspaceDir
      ? t("report.runtime.evidence.detail.workspace", {
          value: formatArtifactLocation(browser.runtime.workspaceDir) ?? browser.runtime.workspaceDir,
        })
      : t("report.runtime.evidence.detail.workspaceMissing"),
    browser.runtime.taskId
      ? t("report.runtime.evidence.detail.taskId", {
          value: browser.runtime.taskId,
        })
      : undefined,
    browser.artifacts.reportPath
      ? t("report.runtime.evidence.detail.reportPath", {
          value: formatArtifactLocation(browser.artifacts.reportPath) ?? browser.artifacts.reportPath,
        })
      : t("report.runtime.evidence.detail.reportMissing"),
    browser.artifacts.tracePath
      ? t("report.runtime.evidence.detail.tracePath", {
          value: formatArtifactLocation(browser.artifacts.tracePath) ?? browser.artifacts.tracePath,
        })
      : browser.artifacts.trajectoryPath
        ? t("report.runtime.evidence.detail.trajectoryPath", {
            value: formatArtifactLocation(browser.artifacts.trajectoryPath) ?? browser.artifacts.trajectoryPath,
          })
        : t("report.runtime.evidence.detail.traceMissing"),
    browser.runtime.finalUrl && browser.runtime.finalUrl !== browser.runtime.startUrl
      ? t("report.runtime.evidence.detail.finalUrl", {
          value: browser.runtime.finalUrl,
        })
      : t("report.runtime.evidence.detail.startUrl", {
          value: browser.runtime.startUrl,
        }),
    browser.warnings[0]
      ? t("report.runtime.evidence.detail.warning", {
          value: browser.warnings[0],
        })
      : undefined,
  ]).slice(0, 6);

  return {
    stats,
    details,
    artifacts,
    timeline,
  };
}

function buildPerformanceScore(report: AuditIntelligenceResult): number {
  const deterministic = report.evidence.deterministic;

  if (deterministic.status !== "completed") {
    return 24;
  }

  let score = 92;

  if (typeof deterministic.responseTimeMs === "number") {
    score -= Math.max(0, (deterministic.responseTimeMs - 600) / 35);
  }

  if (deterministic.document) {
    score -= Math.max(0, deterministic.document.counts.scripts - 12) * 1.3;
    score -= Math.max(0, deterministic.document.counts.stylesheets - 4) * 1.5;
  }

  return clampScore(score);
}

function buildSeoScore(report: AuditIntelligenceResult): number {
  const deterministic = report.evidence.deterministic;

  if (deterministic.status !== "completed" || !deterministic.document) {
    return 30;
  }

  let score = 94;

  if (!deterministic.document.metaDescription) {
    score -= 18;
  }

  if (!deterministic.document.canonical) {
    score -= 16;
  }

  if (!deterministic.document.lang) {
    score -= 8;
  }

  if (deterministic.document.counts.structuredDataBlocks === 0) {
    score -= 14;
  }

  score -= Math.min(16, deterministic.document.counts.imagesMissingAlt * 2);

  return clampScore(score);
}

function buildArchitectureScore(report: AuditIntelligenceResult): number {
  const deterministic = report.evidence.deterministic;
  const browser = report.evidence.browser;

  let score = 82;

  if (browser.status === "partial") {
    score -= 10;
  } else if (browser.status !== "completed") {
    score -= 18;
  }

  if (deterministic.headers?.poweredBy) {
    score -= 8;
  }

  if (!deterministic.headers?.cacheControl) {
    score -= 6;
  }

  if (deterministic.warnings.length > 2) {
    score -= Math.min(18, deterministic.warnings.length * 2);
  }

  if (deterministic.status !== "completed") {
    score = 36;
  }

  return clampScore(score);
}

function buildOverallScore(performance: number, seo: number, architecture: number): number {
  return clampScore((performance + seo + architecture) / 3);
}

function buildActionItems(report: AuditIntelligenceResult, t: TFunction): string[] {
  const deterministic = report.evidence.deterministic;
  const browser = report.evidence.browser;
  const actions: string[] = [];
  const blockedTimelineStep = browser.timeline?.find((step) => step.status === "blocked");
  const incompleteTimelineStep = browser.timeline?.find((step) => step.status === "partial" || step.status === "not_run");

  if (blockedTimelineStep) {
    actions.push(
      t("report.runtime.panels.actions.actionResolveBlockedStep", {
        step: blockedTimelineStep.label,
      }),
    );
  } else if (incompleteTimelineStep) {
    actions.push(
      t("report.runtime.panels.actions.actionReviewPartialStep", {
        step: incompleteTimelineStep.label,
      }),
    );
  }

  if ((deterministic.responseTimeMs ?? 0) > 1800) {
    actions.push(t("report.runtime.panels.actions.actionReduceResponseTime"));
  }

  if ((deterministic.document?.counts.scripts ?? 0) > 12) {
    actions.push(t("report.runtime.panels.actions.actionReviewScripts"));
  }

  if (!deterministic.document?.metaDescription) {
    actions.push(t("report.runtime.panels.actions.actionAddMeta"));
  }

  if (!deterministic.document?.canonical) {
    actions.push(t("report.runtime.panels.actions.actionAddCanonical"));
  }

  if ((deterministic.document?.counts.structuredDataBlocks ?? 0) === 0) {
    actions.push(t("report.runtime.panels.actions.actionAddStructuredData"));
  }

  if ((deterministic.document?.counts.imagesMissingAlt ?? 0) > 0) {
    actions.push(t("report.runtime.panels.actions.actionFixAlt"));
  }

  if (!hasBrowserRuntimeEvidence(browser.status)) {
    actions.push(t("report.runtime.panels.actions.actionEnableBrowser"));
  }

  if (!deterministic.headers?.cacheControl) {
    actions.push(t("report.runtime.panels.actions.actionReviewCache"));
  }

  if (actions.length === 0) {
    actions.push(t("report.runtime.panels.actions.actionGeneral"));
  }

  return uniqueStrings(actions).slice(0, 3);
}

export function buildSampleReportViewModel(report: AuditIntelligenceResult, t: TFunction, language: string): SampleReportViewModel {
  const deterministic = report.evidence.deterministic;
  const browser = report.evidence.browser;
  const summaryLines = parseSummaryLines(report.summary);
  const performanceScore = buildPerformanceScore(report);
  const seoScore = buildSeoScore(report);
  const architectureScore = buildArchitectureScore(report);
  const overallScore = buildOverallScore(performanceScore, seoScore, architectureScore);
  const firstFlow = getFirstRelevantFlow(browser.flows);
  const missingSeoSignals = [
    !deterministic.document?.metaDescription,
    !deterministic.document?.canonical,
    !deterministic.document?.lang,
    (deterministic.document?.counts.structuredDataBlocks ?? 0) === 0,
    (deterministic.document?.counts.imagesMissingAlt ?? 0) > 0,
  ].filter(Boolean).length;
  const host = getHost(deterministic.finalUrl ?? report.request.url);
  const documentLabel = deterministic.document?.title ?? deterministic.document?.lang ?? host;
  const serverLabel = deterministic.headers?.server ?? deterministic.headers?.poweredBy ?? host;
  const modeLabel = getModeLabel(browser.mode, t);
  const statusLabel = getStatusLabel(browser.status, t);
  const browserEvidence = buildBrowserEvidence(report, t, modeLabel, statusLabel);
  const primaryRuntimeGate = getPrimaryRuntimeGate(browser.timeline);

  const overviewBullets = uniqueStrings([
    primaryRuntimeGate
      ? primaryRuntimeGate.detail
        ? t("report.runtime.panels.overview.primaryRuntimeGateWithDetail", {
            step: primaryRuntimeGate.label,
            status: getStatusLabel(primaryRuntimeGate.status, t),
            detail: primaryRuntimeGate.detail,
          })
        : t("report.runtime.panels.overview.primaryRuntimeGate", {
            step: primaryRuntimeGate.label,
            status: getStatusLabel(primaryRuntimeGate.status, t),
          })
      : undefined,
    ...summaryLines.slice(0, primaryRuntimeGate ? 1 : 2),
    t("report.runtime.panels.overview.deterministicStatus", {
      status: getStatusLabel(deterministic.status, t),
    }),
    t("report.runtime.panels.overview.browserStatus", {
      status: statusLabel,
      mode: modeLabel,
    }),
  ]).slice(0, 3);

  const performanceBullets = uniqueStrings([
    typeof deterministic.responseTimeMs === "number"
      ? t("report.runtime.panels.performance.responseTime", { value: deterministic.responseTimeMs })
      : t("report.runtime.panels.performance.responseTimeMissing"),
    t("report.runtime.panels.performance.scriptCount", {
      value: deterministic.document?.counts.scripts ?? 0,
      stylesheets: deterministic.document?.counts.stylesheets ?? 0,
    }),
    deterministic.headers?.cacheControl
      ? t("report.runtime.panels.performance.cacheControl", { value: deterministic.headers.cacheControl })
      : t("report.runtime.panels.performance.cacheControlMissing"),
  ]).slice(0, 3);

  const seoBullets = uniqueStrings([
    deterministic.document?.metaDescription ? t("report.runtime.panels.seo.metaPresent") : t("report.runtime.panels.seo.metaMissing"),
    deterministic.document?.canonical
      ? t("report.runtime.panels.seo.canonicalPresent", { value: deterministic.document.canonical })
      : t("report.runtime.panels.seo.canonicalMissing"),
    (deterministic.document?.counts.structuredDataBlocks ?? 0) > 0
      ? t("report.runtime.panels.seo.structuredDataPresent", { value: deterministic.document?.counts.structuredDataBlocks ?? 0 })
      : t("report.runtime.panels.seo.structuredDataMissing"),
    (deterministic.document?.counts.imagesMissingAlt ?? 0) > 0
      ? t("report.runtime.panels.seo.altMissing", { value: deterministic.document?.counts.imagesMissingAlt ?? 0 })
      : t("report.runtime.panels.seo.altComplete"),
  ]).slice(0, 3);

  const architectureBullets = uniqueStrings([
    firstFlow
      ? t("report.runtime.panels.architecture.browserFlow", {
          label: firstFlow.label,
          status: getStatusLabel(firstFlow.status, t),
        })
      : t("report.runtime.panels.architecture.browserFlowMissing"),
    deterministic.headers?.server
      ? t("report.runtime.panels.architecture.serverHeader", { value: deterministic.headers.server })
      : t("report.runtime.panels.architecture.serverHeaderMissing"),
    deterministic.headers?.poweredBy
      ? t("report.runtime.panels.architecture.poweredBy", { value: deterministic.headers.poweredBy })
      : t("report.runtime.panels.architecture.poweredByMissing"),
  ]).slice(0, 3);

  const architectureIssueKey = browser.status === "partial" ? "browserPartial" : browser.status !== "completed" ? "browserPending" : (deterministic.responseTimeMs ?? 0) > 1800 ? "performance" : missingSeoSignals > 0 ? "seo" : "general";
  const actionItems = buildActionItems(report, t);

  return {
    headerSubtitle: report.request.companyName ?? host,
    generatedAtLabel: formatGeneratedAt(report.generatedAt, language),
    metadataChips: [
      t("report.runtime.chips.target", { value: host }),
      t("report.runtime.chips.provider", { value: report.model ? `${report.provider} / ${report.model}` : report.provider }),
      t("report.runtime.chips.browser", { value: modeLabel }),
    ],
    metricItems: [
      {
        id: "overall",
        value: overallScore,
        labelKey: "report.metrics.overall.label",
        support:
          deterministic.status !== "completed"
            ? t("report.runtime.metrics.overall.failed")
            : browser.status === "completed"
              ? t("report.runtime.metrics.overall.withBrowser", { warningCount: deterministic.warnings.length + browser.warnings.length })
              : browser.status === "partial"
                ? t("report.runtime.metrics.overall.withPartial", { warningCount: deterministic.warnings.length + browser.warnings.length })
              : t("report.runtime.metrics.overall.withoutBrowser"),
        glow: "purple",
      },
      {
        id: "performance",
        value: performanceScore,
        labelKey: "report.metrics.performance.label",
        support:
          typeof deterministic.responseTimeMs === "number"
            ? t("report.runtime.metrics.performance.withValue", {
                value: deterministic.responseTimeMs,
                scripts: deterministic.document?.counts.scripts ?? 0,
              })
            : t("report.runtime.metrics.performance.missing"),
        glow: "cyan",
        tooltip: "API Latency measures total Time-to-First-Byte (TTFB) plus DOM rendering payload cost.",
      },
      {
        id: "seo",
        value: seoScore,
        labelKey: "report.metrics.seo.label",
        support:
          missingSeoSignals > 0
            ? t("report.runtime.metrics.seo.withSignals", { missingCount: missingSeoSignals })
            : t("report.runtime.metrics.seo.clean"),
        glow: "blue",
      },
      {
        id: "architecture",
        value: architectureScore,
        labelKey: "report.metrics.architecture.label",
        support: browser.status === "completed" ? t("report.runtime.metrics.architecture.withBrowser") : browser.status === "partial" ? t("report.runtime.metrics.architecture.withPartial") : t("report.runtime.metrics.architecture.withoutBrowser"),
        glow: "none",
      },
    ],
    panelContentMap: {
      overview: {
        title: t("report.runtime.panels.overview.title"),
        description: summaryLines.length > 0 ? t("report.runtime.panels.overview.descriptionWithSummary") : t("report.runtime.panels.overview.descriptionWithoutSummary"),
        bullets: overviewBullets.length > 0 ? overviewBullets : [t("report.runtime.panels.overview.summaryUnavailable")],
      },
      performance: {
        title: t("report.runtime.panels.performance.title"),
        description: t("report.runtime.panels.performance.description"),
        bullets: performanceBullets,
      },
      seo: {
        title: t("report.runtime.panels.seo.title"),
        description: t("report.runtime.panels.seo.description"),
        bullets: seoBullets,
      },
      architecture: {
        title: t("report.runtime.panels.architecture.title"),
        description: browser.status === "completed" ? t("report.runtime.panels.architecture.descriptionWithBrowser") : browser.status === "partial" ? t("report.runtime.panels.architecture.descriptionWithPartial") : t("report.runtime.panels.architecture.descriptionWithoutBrowser"),
        bullets: architectureBullets,
      },
      actions: {
        title: t("report.runtime.panels.actions.title"),
        description: t("report.runtime.panels.actions.description"),
        bullets: actionItems,
      },
    },
    browserEvidence,
    architectureNodes: [
      {
        id: "target",
        label: t("report.runtime.lens.nodes.target", { value: host }),
        className: "left-5 top-8 border-cyan-300/40 text-cyan-200",
      },
      {
        id: "document",
        label: t("report.runtime.lens.nodes.document", { value: documentLabel }),
        className: "left-[38%] top-[42%] border-violet-300/40 text-violet-200",
      },
      {
        id: "collector",
        label: t("report.runtime.lens.nodes.collector", { value: modeLabel }),
        className: "right-6 top-12 border-rose-300/40 text-rose-200",
      },
      {
        id: "server",
        label: t("report.runtime.lens.nodes.server", { value: serverLabel }),
        className: "right-[18%] bottom-10 border-blue-300/40 text-blue-200",
      },
    ],
    architectureIssueTitle: t(`report.runtime.lens.issueTitle.${architectureIssueKey}`),
    architectureIssueDescription: t(`report.runtime.lens.issueDescription.${architectureIssueKey}`, {
      mode: modeLabel,
    }),
    actionItems,
    actionSummary: t("report.runtime.panels.actions.description"),
  };
}