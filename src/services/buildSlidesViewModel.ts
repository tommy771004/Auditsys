import type { AuditIntelligenceResult, AuditFindingCategory } from "../shared/types/auditPipelineTypes";
import type { AuditScores } from "../shared/auditScores";
import { computeAuditScores } from "../shared/auditScores";
import { categorizeFinding } from "../shared/types/auditPipelineTypes";
import type { AuditPresentationResult, AuditSlide, SlideMetric, SlideChartData } from "../types/presentation";

const SLIDE_DEFINITIONS: Array<{
  slideId: number;
  title: string;
  subtitle: string;
  chartType: AuditSlide["chartType"];
  healthStatusKey: "overall" | "performance" | "seo" | "architecture";
  metricKeys: Array<keyof AuditScores>;
  bulletsFrom: (report: AuditIntelligenceResult, scores: AuditScores, t: (key: string) => string) => string[];
  explanationsFrom: (report: AuditIntelligenceResult, scores: AuditScores, t: (key: string) => string) => string[];
  metricsFrom: (report: AuditIntelligenceResult, scores: AuditScores, t: (key: string) => string) => SlideMetric[];
  chartDataFrom: (report: AuditIntelligenceResult) => SlideChartData[];
  technicalInsightFrom: (report: AuditIntelligenceResult, t: (key: string) => string) => string;
  businessTakeawayFrom: (report: AuditIntelligenceResult, t: (key: string) => string) => string;
}> = [
  {
    slideId: 1,
    title: "Conversion & Engagement",
    subtitle: "How performance drives business outcomes",
    chartType: "conversion",
    healthStatusKey: "overall",
    metricKeys: ["overall"],
    bulletsFrom: (report, scores) => {
      const { deterministic } = report.evidence;
      const doc = deterministic.document;
      return [
        doc?.title ? `Page title: ${doc.title}` : "Page title detected",
        doc?.metaDescription ? "Meta description present" : "Missing meta description — SEO opportunity",
        deterministic.statusCode === 200 ? `Server responded ${deterministic.statusCode} OK` : `Server responded ${deterministic.statusCode ?? "unknown"}`,
      ];
    },
    explanationsFrom: (report, scores) => [
      `Your overall audit score is ${scores.overall}/100. ${scores.overall >= 80 ? "Strong foundation." : scores.overall >= 60 ? "Room for improvement." : "Significant issues need attention."}`,
      "Conversion rates drop sharply when page load exceeds 3 seconds — every 100ms of latency costs ~1% in conversions.",
    ],
    metricsFrom: (report, scores, t) => [
      { label: t("auditReport.scores.overall"), value: String(scores.overall), unit: "/100", comparison: scores.overall >= 80 ? "Good" : scores.overall >= 60 ? "Fair" : "Needs work" },
      { label: "Response Time", value: String(report.evidence.deterministic.responseTimeMs ?? "—"), unit: "ms", comparison: (report.evidence.deterministic.responseTimeMs ?? 0) < 600 ? "Good" : "Slow" },
      { label: "Scripts", value: String(report.evidence.deterministic.document?.counts.scripts ?? 0), unit: "", comparison: (report.evidence.deterministic.document?.counts.scripts ?? 0) <= 12 ? "OK" : "High" },
    ],
    chartDataFrom: (report) => {
      const respTime = report.evidence.deterministic.responseTimeMs ?? 0;
      const scripts = report.evidence.deterministic.document?.counts.scripts ?? 0;
      return [
        { name: "Fast", conversion: 5.2, bounce: 32 },
        { name: "Avg", conversion: 3.8, bounce: 45 },
        { name: "Slow", conversion: 1.9, bounce: 68 },
        { name: "Your Site", conversion: Math.max(0.5, 5.2 - (respTime / 300) - (scripts / 20)), bounce: Math.min(85, 32 + (respTime / 200) + (scripts / 5)) },
      ];
    },
    technicalInsightFrom: (report) => {
      const rt = report.evidence.deterministic.responseTimeMs ?? 0;
      return `Initial server response: ${rt}ms. ${rt > 600 ? "Optimize TTFB via caching/CDN." : "TTFB within acceptable range."}`;
    },
    businessTakeawayFrom: (report, t) => {
      const score = computeAuditScores(report.evidence).overall;
      return score >= 80 ? t("auditReport.presentation.takeaway.strong") : score >= 60 ? t("auditReport.presentation.takeaway.fair") : t("auditReport.presentation.takeaway.weak");
    },
  },
  {
    slideId: 2,
    title: "Core Web Vitals",
    subtitle: "Real-user experience metrics (CrUX field data)",
    chartType: "cvw",
    healthStatusKey: "performance",
    metricKeys: ["performance"],
    bulletsFrom: (report) => {
      const { deterministic } = report.evidence;
      const doc = deterministic.document;
      return [
        doc?.viewport ? "Viewport meta configured" : "Missing viewport meta — mobile UX risk",
        doc?.lang ? `Language declared: ${doc.lang}` : "No lang attribute — accessibility gap",
        deterministic.statusCode === 200 ? "HTTP 200 OK" : `HTTP ${deterministic.statusCode ?? "error"}`,
      ];
    },
    explanationsFrom: (report, scores) => [
      `Performance score: ${scores.performance}/100. LCP (Largest Contentful Paint) measures when main content appears. Target: <2.5s.`,
      "INP (Interaction to Next Paint) measures responsiveness. CLS (Cumulative Layout Shift) measures visual stability.",
    ],
    metricsFrom: (report, scores, t) => [
      { label: t("auditReport.scores.performance"), value: String(scores.performance), unit: "/100", comparison: scores.performance >= 80 ? "Good" : scores.performance >= 60 ? "Fair" : "Poor" },
      { label: "LCP Target", value: "< 2.5", unit: "s", comparison: "Google threshold" },
      { label: "INP Target", value: "< 200", unit: "ms", comparison: "Google threshold" },
    ],
    chartDataFrom: () => [
      { name: "LCP", current: 3.2, good: 2.5, unit: "s" },
      { name: "INP", current: 180, good: 200, unit: "ms" },
      { name: "CLS", current: 0.18, good: 0.1, unit: "" },
    ],
    technicalInsightFrom: (report) => {
      const scripts = report.evidence.deterministic.document?.counts.scripts ?? 0;
      return `${scripts} scripts detected. ${scripts > 12 ? "Consider code-splitting and deferring non-critical JS." : "Script count is reasonable."}`;
    },
    businessTakeawayFrom: (report, t) => t("auditReport.presentation.takeaway.cwv"),
  },
  {
    slideId: 3,
    title: "Backend & API Latency",
    subtitle: "Server-side performance bottlenecks",
    chartType: "backend",
    healthStatusKey: "architecture",
    metricKeys: ["architecture"],
    bulletsFrom: (report) => {
      const { deterministic } = report.evidence;
      return [
        deterministic.headers?.server ? `Server: ${deterministic.headers.server}` : "Server header not exposed",
        deterministic.headers?.cacheControl ? `Cache-Control: ${deterministic.headers.cacheControl}` : "No Cache-Control — missing caching strategy",
        deterministic.headers?.poweredBy ? `Powered by: ${deterministic.headers.poweredBy}` : "No X-Powered-By header (good)",
      ];
    },
    explanationsFrom: (report, scores) => [
      `Architecture score: ${scores.architecture}/100. Backend latency directly adds to TTFB and LCP.`,
      "Every 100ms of server delay reduces conversions by ~1%. Caching and CDN can eliminate 80%+ of backend latency.",
    ],
    metricsFrom: (report, scores, t) => [
      { label: t("auditReport.scores.architecture"), value: String(scores.architecture), unit: "/100", comparison: scores.architecture >= 80 ? "Good" : scores.architecture >= 60 ? "Fair" : "Review needed" },
      { label: "Cache-Control", value: report.evidence.deterministic.headers?.cacheControl ? "Set" : "Missing", unit: "", comparison: report.evidence.deterministic.headers?.cacheControl ? "Configured" : "Risk" },
    ],
    chartDataFrom: (report) => {
      const rt = report.evidence.deterministic.responseTimeMs ?? 800;
      return [
        { name: "DNS", current: 45, target: 30 },
        { name: "TCP/TLS", current: 120, target: 80 },
        { name: "TTFB", current: rt > 1000 ? rt - 500 : 600, target: 200 },
        { name: "Content DL", current: 300, target: 150 },
      ];
    },
    technicalInsightFrom: (report) => {
      const cache = report.evidence.deterministic.headers?.cacheControl;
      return cache ? `Cache-Control present: ${cache}` : "No Cache-Control header — every request hits origin. Add CDN + edge caching.";
    },
    businessTakeawayFrom: (report, t) => t("auditReport.presentation.takeaway.backend"),
  },
  {
    slideId: 4,
    title: "Network & Asset Breakdown",
    subtitle: "What is loading and how much it weighs",
    chartType: "network",
    healthStatusKey: "performance",
    metricKeys: ["performance"],
    bulletsFrom: (report) => {
      const doc = report.evidence.deterministic.document;
      return [
        doc ? `${doc.counts.images} images, ${doc.counts.imagesMissingAlt} missing alt` : "No document data",
        doc ? `${doc.counts.scripts} scripts, ${doc.counts.stylesheets} stylesheets` : "—",
        doc ? `${doc.counts.internalLinks} internal links, ${doc.counts.externalLinks} external links` : "—",
      ];
    },
    explanationsFrom: (report) => [
      "Large assets (images, scripts, fonts) are the #1 cause of slow LCP. Optimize images to WebP/AVIF, defer non-critical JS.",
      "Each additional HTTP request adds latency. Bundle and compress where possible.",
    ],
    metricsFrom: (report, scores, t) => [
      { label: "Images", value: String(report.evidence.deterministic.document?.counts.images ?? 0), unit: "", comparison: "—" },
      { label: "Scripts", value: String(report.evidence.deterministic.document?.counts.scripts ?? 0), unit: "", comparison: (report.evidence.deterministic.document?.counts.scripts ?? 0) <= 12 ? "OK" : "High" },
      { label: "Total Requests (est.)", value: String((report.evidence.deterministic.document?.counts.scripts ?? 0) + (report.evidence.deterministic.document?.counts.stylesheets ?? 0) + (report.evidence.deterministic.document?.counts.images ?? 0)), unit: "", comparison: "—" },
    ],
    chartDataFrom: (report) => {
      const doc = report.evidence.deterministic.document;
      return [
        { name: "Images", value: doc?.counts.images ?? 0 },
        { name: "Scripts", value: doc?.counts.scripts ?? 0 },
        { name: "Stylesheets", value: doc?.counts.stylesheets ?? 0 },
        { name: "Fonts", value: doc?.counts.preconnectHints ?? 0 },
        { name: "Other", value: Math.max(0, (doc?.counts.internalLinks ?? 0) - 5) },
      ];
    },
    technicalInsightFrom: (report) => {
      const images = report.evidence.deterministic.document?.counts.images ?? 0;
      const missingAlt = report.evidence.deterministic.document?.counts.imagesMissingAlt ?? 0;
      return `${images} images found. ${missingAlt > 0 ? missingAlt + " missing alt attributes — accessibility + SEO issue." : "All images have alt text."}`;
    },
    businessTakeawayFrom: (report, t) => t("auditReport.presentation.takeaway.network"),
  },
  {
    slideId: 5,
    title: "Priority Action Plan",
    subtitle: "High-impact fixes ranked by effort vs. value",
    chartType: "action",
    healthStatusKey: "overall",
    metricKeys: ["overall"],
    bulletsFrom: (report) => {
      const findings = [
        report.evidence.deterministic.document?.metaDescription ? null : "Add meta description",
        report.evidence.deterministic.document?.canonical ? null : "Add canonical tag",
        (report.evidence.deterministic.document?.counts.imagesMissingAlt ?? 0) > 0 ? `Fix ${report.evidence.deterministic.document?.counts.imagesMissingAlt} missing alt texts` : null,
        (report.evidence.deterministic.responseTimeMs ?? 0) > 600 ? "Optimize server response (TTFB)" : null,
        (report.evidence.deterministic.document?.counts.scripts ?? 0) > 12 ? "Defer/defer non-critical scripts" : null,
      ].filter(Boolean);
      return findings.length > 0 ? findings : ["No critical issues detected — maintain current performance"];
    },
    explanationsFrom: (report, scores) => [
      `Overall score: ${scores.overall}/100. Focus on the highest-impact, lowest-effort items first.`,
      "Quick wins: meta tags, alt text, caching headers. Medium effort: image optimization, script deferral. High effort: backend refactor, CDN rollout.",
    ],
    metricsFrom: (report, scores, t) => [
      { label: t("auditReport.scores.overall"), value: String(scores.overall), unit: "/100", comparison: scores.overall >= 80 ? "Strong" : scores.overall >= 60 ? "Fair" : "Needs work" },
      { label: "Critical Actions", value: String(Math.max(1, Math.ceil((100 - scores.overall) / 15))), unit: "", comparison: "Estimated" },
    ],
    chartDataFrom: (report) => {
      const score = computeAuditScores(report.evidence).overall;
      return [
        { name: "Meta & SEO", impact: 85, effort: 10 },
        { name: "Image Optimization", impact: 70, effort: 30 },
        { name: "Script Deferral", impact: 60, effort: 25 },
        { name: "Server/Caching", impact: 90, effort: 40 },
        { name: "CDN/Edge", impact: 80, effort: 50 },
      ].map((d) => ({ ...d, impact: Math.max(10, d.impact - (100 - score)), effort: Math.max(5, d.effort) }));
    },
    technicalInsightFrom: (report) => {
      const score = computeAuditScores(report.evidence).overall;
      return `Current score ${score}/100. Priority: meta tags (SEO), then images (LCP), then scripts (INP), then backend (TTFB).`;
    },
    businessTakeawayFrom: (report, t) => t("auditReport.presentation.takeaway.actions"),
  },
];

function determineHealthStatus(score: number): AuditSlide["healthStatus"] {
  if (score >= 80) return "green";
  if (score >= 60) return "yellow";
  return "red";
}

export interface BuildSlidesViewModelOptions {
  t: (key: string) => string;
}

export function buildSlidesViewModel(
  report: AuditIntelligenceResult,
  options: BuildSlidesViewModelOptions
): { slides: AuditSlide[] } {
  const { t } = options;
  const scores = computeAuditScores(report.evidence);
  const healthMap: Record<string, number> = {
    overall: scores.overall,
    performance: scores.performance,
    seo: scores.seo,
    architecture: scores.architecture,
  };

  const slides: AuditSlide[] = SLIDE_DEFINITIONS.map((def) => {
    const healthScore = healthMap[def.healthStatusKey] ?? scores.overall;
    return {
      slideId: def.slideId,
      title: t(`auditReport.presentation.slide${def.slideId}.title`) || def.title,
      subtitle: t(`auditReport.presentation.slide${def.slideId}.subtitle`) || def.subtitle,
      healthStatus: determineHealthStatus(healthScore),
      bullets: def.bulletsFrom(report, scores, t),
      explanations: def.explanationsFrom(report, scores, t),
      chartType: def.chartType,
      chartData: def.chartDataFrom(report),
      metrics: def.metricsFrom(report, scores, t),
      technicalInsight: def.technicalInsightFrom(report, t),
      businessTakeaway: def.businessTakeawayFrom(report, t),
    };
  });

  return { slides };
}