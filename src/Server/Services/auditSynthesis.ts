import type { AuditEvidenceBundle, AuditRequestPayload, AuditSynthesisResult, BrowserCollectorTimelineStep, DeterministicCollectorResult } from "./auditPipelineTypes";
import { fetchOpenRouterWithFallback } from "./openrouterHelper";

function buildEvidenceLines(payload: AuditRequestPayload, deterministic: DeterministicCollectorResult): string[] {
  const lines = [
    `Target URL: ${payload.url}`,
    payload.companyName ? `Company name: ${payload.companyName}` : null,
    payload.contactEmail ? `Primary contact email: ${payload.contactEmail}` : null,
    payload.teamSize ? `Team size: ${payload.teamSize}` : null,
    payload.goals && payload.goals.length > 0 ? `Business goals: ${payload.goals.join(", ")}` : null,
    payload.stack && payload.stack.length > 0 ? `Current stack: ${payload.stack.join(", ")}` : null,
    payload.notes ? `Additional notes: ${payload.notes}` : null,
    `Deterministic collector status: ${deterministic.status}`,
    deterministic.statusCode ? `HTTP status: ${deterministic.statusCode}` : null,
    deterministic.responseTimeMs ? `Initial HTML response time: ${deterministic.responseTimeMs} ms` : null,
    deterministic.finalUrl ? `Resolved URL: ${deterministic.finalUrl}` : null,
    deterministic.document?.title ? `Document title: ${deterministic.document.title}` : null,
    deterministic.document?.metaDescription ? `Meta description: ${deterministic.document.metaDescription}` : null,
    deterministic.document?.canonical ? `Canonical URL: ${deterministic.document.canonical}` : null,
    deterministic.document?.robots ? `Robots meta: ${deterministic.document.robots}` : null,
    deterministic.document ? `Asset counts: scripts=${deterministic.document.counts.scripts}, stylesheets=${deterministic.document.counts.stylesheets}, images=${deterministic.document.counts.images}, missingAlt=${deterministic.document.counts.imagesMissingAlt}, structuredData=${deterministic.document.counts.structuredDataBlocks}` : null,
    deterministic.warnings.length > 0 ? `Detected warnings: ${deterministic.warnings.join(" | ")}` : null,
    deterministic.notes.length > 0 ? `Collector notes: ${deterministic.notes.join(" | ")}` : null,
  ].filter((item): item is string => Boolean(item));

  return lines;
}

function getPrimaryRuntimeGate(evidence: AuditEvidenceBundle): BrowserCollectorTimelineStep | undefined {
  return evidence.browser.timeline?.find((step) => step.status === "blocked")
    ?? evidence.browser.timeline?.find((step) => step.status === "partial" || step.status === "not_run");
}

function formatRuntimeGate(step: BrowserCollectorTimelineStep): string {
  return `${step.label} [${step.status}]${step.detail ? ` ${step.detail}` : ""}`;
}

function buildAuditPrompt(payload: AuditRequestPayload, evidence: AuditEvidenceBundle): string {
  const primaryRuntimeGate = getPrimaryRuntimeGate(evidence);

  return [
    "You are a senior web performance and architecture auditor for productized consulting engagements.",
    "Perform a discovery-first website review based strictly on the provided evidence.",
    "Base every claim on the supplied evidence. If browser evidence is unavailable, state the uncertainty rather than inventing observations.",
    "If a browser runtime gate is blocked or incomplete, explicitly name that gate in both the Executive Summary and Browser Flow Gaps sections.",
    "You MUST output your response as a valid JSON object matching the following structure EXACTLY. DO NOT wrap the output in markdown code blocks (e.g., no ```json). Output ONLY the raw JSON object.",
    "{",
    `  "executiveSummary": "A concise, professional overview of the site's health and readiness. Focus on business impact, user experience, and technical readiness. Write this for C-level executives and stakeholders.",`,
    '  "deterministicFindings": [{ "issue": "The technical issue found", "impact": "The business or UX impact", "severity": "high|medium|low" }],',
    '  "browserFlowGaps": [{ "issue": "The flow gap or blocked gate", "impact": "How this affects user conversion or traversal", "severity": "high|medium|low" }],',
    '  "architectureRisks": [{ "issue": "The architecture or scaling concern", "impact": "Long-term business or operational impact", "severity": "high|medium|low" }],',
    '  "nextActions": [{ "action": "Clear, actionable step", "impact": "The expected improvement" }]',
    "}",
    "Keep the tone consultative, professional, and actionable. Frame technical issues in terms of business impact.",
    buildEvidenceLines(payload, evidence.deterministic).join("\n"),
    `Browser collector status: ${evidence.browser.status}`,
    `Browser collector mode: ${evidence.browser.mode}`,
    `Browser runtime instruction: ${evidence.browser.runtime.instruction}`,
    `Browser runtime start URL: ${evidence.browser.runtime.startUrl}`,
    evidence.browser.runtime.finalUrl ? `Browser runtime final URL: ${evidence.browser.runtime.finalUrl}` : null,
    evidence.browser.runtime.taskId ? `Browser runtime task ID: ${evidence.browser.runtime.taskId}` : null,
    evidence.browser.runtime.workspaceDir ? `Browser runtime workspace: ${evidence.browser.runtime.workspaceDir}` : null,
    evidence.browser.flows.length > 0
      ? `Browser flow summaries: ${evidence.browser.flows.map((flow) => `${flow.label} [${flow.status}] ${flow.summary}`).join(" | ")}`
      : null,
    primaryRuntimeGate ? `Primary runtime gate: ${formatRuntimeGate(primaryRuntimeGate)}` : null,
    evidence.browser.timeline?.length
      ? `Browser runtime timeline: ${evidence.browser.timeline.map((step) => formatRuntimeGate(step)).join(" | ")}`
      : null,
    evidence.browser.pages.length > 0 ? `Browser pages captured: ${evidence.browser.pages.map((page) => page.url).join(" | ")}` : null,
    `Browser collector notes: ${evidence.browser.observations.join(" | ")}`,
    evidence.browser.warnings.length > 0 ? `Browser collector warnings: ${evidence.browser.warnings.join(" | ")}` : null,
    evidence.browser.artifacts.reportPath ? `Browser report artifact: ${evidence.browser.artifacts.reportPath}` : null,
    evidence.browser.artifacts.trajectoryPath ? `Browser trajectory artifact: ${evidence.browser.artifacts.trajectoryPath}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildFallbackSummary(payload: AuditRequestPayload, evidence: AuditEvidenceBundle, reason: string): string {
  const deterministic = evidence.deterministic;
  const primaryRuntimeGate = getPrimaryRuntimeGate(evidence);
  const findings: string[] = [];
  const nextActions: string[] = [];

  if (deterministic.status === "failed") {
    findings.push("- Deterministic collection failed, so the current result should be treated as an intake stub rather than a finished audit.");
  } else {
    findings.push(`- The target resolved to ${deterministic.finalUrl ?? payload.url} with status ${deterministic.statusCode ?? "unknown"}.`);

    if (typeof deterministic.responseTimeMs === "number") {
      findings.push(`- Initial HTML response time measured ${deterministic.responseTimeMs} ms during the deterministic pass.`);
    }

    if (deterministic.document?.metaDescription === null) {
      findings.push("- Meta description is missing, which weakens baseline SEO hygiene.");
    }

    if (!deterministic.document?.canonical) {
      findings.push("- Canonical tagging was not detected, so duplicate-surface control needs review.");
    }

    if ((deterministic.document?.counts.imagesMissingAlt ?? 0) > 0) {
      findings.push(`- ${deterministic.document?.counts.imagesMissingAlt} images are missing alt text in the initial HTML.`);
    }

    if ((deterministic.document?.counts.structuredDataBlocks ?? 0) === 0) {
      findings.push("- No structured data blocks were found in the deterministic HTML response.");
    }

    if (deterministic.warnings.length === 0) {
      findings.push("- Deterministic evidence did not reveal critical baseline issues in the initial HTML response.");
    }
  }

  if (primaryRuntimeGate) {
    nextActions.push(`- Unblock the browser runtime gate \"${primaryRuntimeGate.label}\" before treating this run as full flow coverage.`);
  } else {
    nextActions.push("- Enable browser collectors for stateful flows such as consent banners, route transitions, and checkout-like paths.");
  }

  nextActions.push("- Add deterministic checks for robots.txt, sitemap, and Core Web Vitals once the pipeline moves beyond intake-only mode.");

  const executiveSummary = `The audit was executed in fallback synthesis mode (${reason}). ${primaryRuntimeGate ? `A primary runtime gate was blocked or incomplete: ${formatRuntimeGate(primaryRuntimeGate)}, impacting deep-flow visibility.` : "No blocked runtime gate was explicitly identified in the browser timeline."}`;
  
  const browserFlowGaps = [
    { 
      issue: `Browser collector status: ${evidence.browser.status}`, 
      impact: evidence.browser.reason ?? "No additional browser detail was captured, which limits dynamic interactivity validation.",
      severity: "medium"
    },
    { 
      issue: `Browser collector mode: ${evidence.browser.mode}`, 
      impact: "Determines the depth of client-side JavaScript execution and network tracking.",
      severity: "low"
    }
  ];

  if (evidence.browser.flows.length > 0) {
    browserFlowGaps.push({
      issue: "Browser flow readiness",
      impact: evidence.browser.flows.map((flow) => `${flow.label} (${flow.status})`).join(", "),
      severity: evidence.browser.flows.some(f => f.status === "blocked") ? "high" : "low"
    });
  }

  if (primaryRuntimeGate) {
    browserFlowGaps.push({
      issue: "Primary runtime gate blocked",
      impact: formatRuntimeGate(primaryRuntimeGate),
      severity: "high"
    });
  }

  const architectureRisks = [
    {
      issue: primaryRuntimeGate ? "Runtime Boundary Remediation Required" : "Limited Architecture Evidence",
      impact: primaryRuntimeGate
        ? `The blocked runtime gate suggests a browser-only boundary needs remediation before this run can support high-confidence architecture claims.`
        : "Current architecture evidence is limited to intake metadata and deterministic HTML inspection; runtime boundaries still need browser-level verification.",
      severity: primaryRuntimeGate ? "high" : "medium"
    }
  ];

  return JSON.stringify({
    executiveSummary,
    deterministicFindings: findings.map(f => ({ issue: f, impact: "Requires further investigation", severity: "medium" })),
    browserFlowGaps,
    architectureRisks,
    nextActions: nextActions.map(a => ({ action: a, impact: "Improves overall pipeline visibility and stability." })),
  });
}

export async function synthesizeAudit(payload: AuditRequestPayload, evidence: AuditEvidenceBundle, config?: { apiKey?: string, allowedModels?: string[] }): Promise<AuditSynthesisResult> {
  const apiKey = config?.apiKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      provider: "fallback",
      queued: false,
      reason: "missing_openrouter_api_key",
      summary: buildFallbackSummary(payload, evidence, "missing_openrouter_api_key"),
    };
  }

  try {
    const prompt = buildAuditPrompt(payload, evidence);

    const response = await fetchOpenRouterWithFallback(apiKey, prompt, config?.allowedModels);

    return {
      provider: "openrouter",
      queued: false,
      summary: response.text ?? "",
      model: response.model,
    };
  } catch (error) {
    // If it's a rate limit or similar error, we can still return a fallback
    return {
      provider: "fallback",
      queued: false,
      reason: "openrouter_api_error",
      summary: buildFallbackSummary(payload, evidence, "openrouter_api_error"),
    };
  }
}