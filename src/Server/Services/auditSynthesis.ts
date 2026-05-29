import type { AuditEvidenceBundle, AuditRequestPayload, AuditSynthesisResult, BrowserCollectorTimelineStep, DeterministicCollectorResult } from "./auditPipelineTypes";
import type { CruxMetric, CruxResult } from "../../types/liveAudit.types";
import { fetchOpenRouterWithFallback } from "./openrouterHelper";

function formatCruxMetric(label: string, metric: CruxMetric, unit: "ms" | ""): string | null {
  if (metric.p75 === null) {
    return null;
  }
  return `${label}: p75=${metric.p75}${unit} rating=${metric.rating ?? "unrated"} [MEASURED, real users]`;
}

function buildCruxLines(crux?: CruxResult): string[] {
  if (!crux || !crux.hasData) {
    return [
      "Measured field data (CrUX, real users): NONE AVAILABLE.",
      "No real-user Core Web Vitals field data exists for this target. Do NOT invent or estimate numeric LCP/INP/CLS/FCP values; explicitly state that field data is unavailable.",
    ];
  }
  const scopeText = crux.scope === "origin" ? "site-wide origin" : "this page URL";
  const header = `Measured field data (CrUX, real users) — scope: ${scopeText}${crux.collectionPeriod ? `, collection period: ${crux.collectionPeriod}` : ""}. Treat these as MEASURED ground truth:`;
  return [
    header,
    formatCruxMetric("LCP (largest contentful paint)", crux.metrics.lcp, "ms"),
    formatCruxMetric("INP (interaction to next paint)", crux.metrics.inp, "ms"),
    formatCruxMetric("CLS (cumulative layout shift)", crux.metrics.cls, ""),
    formatCruxMetric("FCP (first contentful paint)", crux.metrics.fcp, "ms"),
  ].filter((line): line is string => Boolean(line));
}

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

export function buildAuditPrompt(payload: AuditRequestPayload, evidence: AuditEvidenceBundle): string {
  const primaryRuntimeGate = getPrimaryRuntimeGate(evidence);

  const languageInstruction = payload.language === "zh-TW" 
    ? "You MUST write the ENTIRE report in Traditional Chinese (繁體中文), specifically using Taiwanese terminology (台灣用語, e.g. 效能 instead of 性能, 解析度 instead of 分辨率, 記憶體 instead of 內存)." 
    : "You MUST write the ENTIRE report in English.";

  return [
    "You are a senior web performance and architecture auditor for productized consulting engagements.",
    "Perform a discovery-first website review based strictly on the provided evidence.",
    "Base every claim on the supplied evidence. If browser evidence is unavailable, state the uncertainty rather than inventing observations.",
    "If a browser runtime gate is blocked or incomplete, explicitly name that gate in both the Executive Summary and Browser Flow Gaps sections.",
    languageInstruction,
    "You MUST output your response as a valid JSON object matching the following structure EXACTLY. DO NOT wrap the output in markdown code blocks (e.g., no ```json). Output ONLY the raw JSON object.",
    "Every finding object MUST include: severity ('critical' | 'warning' | 'info'), finding (one professional sentence), rootCause (technical why), businessImpact (e.g. effect on conversion/retention), actionableFix (precise step-by-step developer instruction).",
    "{",
    `  "executiveSummary": "A concise, professional overview of the site's health and readiness for C-level stakeholders.",`,
    '  "performanceFindings": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "deterministicFindings": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "browserFlowGaps": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "architectureRisks": [{ "severity": "critical|warning|info", "finding": "...", "rootCause": "...", "businessImpact": "...", "actionableFix": "..." }],',
    '  "nextActions": [{ "action": "Clear actionable step", "impact": "Expected improvement", "actionableFix": "Precise developer instruction" }]',
    "}",
    "ANALYSIS RULES:",
    "- Treat CrUX values as measured ground truth. When no field data is available, say so and do NOT output numeric Core Web Vitals.",
    "- Infer LCP/INP root cause ONLY from the MODELED inputs supplied (server response time/TTFB, render-blocking stylesheet/script counts, crawled route timings). You have NO per-request waterfall and NO LCP-element attribution — never claim a specific element or HTTP request caused a vital.",
    "- Tag every modeled or estimated figure explicitly (zh-TW: 估算 or 模型推估; en: 'estimated').",
    "- Use performanceFindings for Core Web Vitals / latency; keep deterministicFindings, browserFlowGaps, architectureRisks for their respective concerns.",
    "Keep the tone consultative, professional, and actionable. Frame technical issues in terms of business impact.",
    buildEvidenceLines(payload, evidence.deterministic).join("\n"),
    buildCruxLines(evidence.crux).join("\n"),
    `MODELED inputs for performance root-cause (not per-asset measurements): TTFB=${evidence.deterministic.responseTimeMs ?? "unknown"}ms, stylesheets=${evidence.deterministic.document?.counts.stylesheets ?? 0}, scripts=${evidence.deterministic.document?.counts.scripts ?? 0}, preconnectHints=${evidence.deterministic.document?.counts.preconnectHints ?? 0}.`,
    evidence.browser.pages.length > 0
      ? `Crawled route timings: ${evidence.browser.pages.map((page) => `${page.url} — ${page.notes.join("; ")}`).join(" | ")}`
      : null,
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

interface RichFinding {
  severity: "critical" | "warning" | "info";
  finding: string;
  rootCause: string;
  businessImpact: string;
  actionableFix: string;
}

function severityFromRating(rating: CruxResult["metrics"]["lcp"]["rating"]): "critical" | "warning" | "info" {
  if (rating === "poor") return "critical";
  if (rating === "needs-improvement") return "warning";
  return "info";
}

function buildPerformanceFindings(evidence: AuditEvidenceBundle, isZh: boolean): RichFinding[] {
  const crux = evidence.crux;
  const det = evidence.deterministic;

  if (!crux || !crux.hasData) {
    return [
      {
        severity: "info",
        finding: isZh
          ? "無真實使用者欄位資料 (CrUX)，本次未量測核心網頁指標 (Core Web Vitals)。"
          : "No real-user field data (CrUX) available; Core Web Vitals were not measured this run.",
        rootCause: isZh
          ? "目標流量不足或 CRUX_API_KEY 未設定，Chrome UX Report 無資料可回傳。"
          : "Target lacks sufficient traffic or CRUX_API_KEY is unset, so the Chrome UX Report returned no field data.",
        businessImpact: isZh
          ? "無法以實測數據佐證效能對轉換率的影響。"
          : "Performance-to-conversion impact cannot be evidenced with measured data.",
        actionableFix: isZh
          ? "設定 CRUX_API_KEY，或改用實驗室量測（PageSpeed/Lighthouse）取得效能數據。"
          : "Configure CRUX_API_KEY, or use a lab measurement (PageSpeed/Lighthouse) to obtain performance data.",
      },
    ];
  }

  const ttfb = det.responseTimeMs ?? null;
  const stylesheets = det.document?.counts.stylesheets ?? 0;
  const scripts = det.document?.counts.scripts ?? 0;
  const modeledZh = `（根因為模型推估，非逐項量測）`;
  const modeledEn = `(root cause is modeled, not per-asset measured)`;

  const configs: Array<{
    key: "lcp" | "inp" | "cls";
    unit: string;
    nameZh: string;
    nameEn: string;
    rootZh: string;
    rootEn: string;
    fixZh: string;
    fixEn: string;
    bizZh: string;
    bizEn: string;
  }> = [
    {
      key: "lcp",
      unit: "ms",
      nameZh: "最大內容繪製 (LCP)",
      nameEn: "Largest Contentful Paint (LCP)",
      rootZh: `初始 HTML 回應時間 ${ttfb ?? "未知"}ms 與 ${stylesheets} 個樣式表、${scripts} 個指令碼為可能的渲染阻塞來源 ${modeledZh}。`,
      rootEn: `Server response time ${ttfb ?? "unknown"}ms plus ${stylesheets} stylesheets / ${scripts} scripts are likely render-blocking contributors ${modeledEn}.`,
      fixZh: "壓縮並預先載入 (preload) 首屏圖片、為渲染阻塞樣式表內聯關鍵 CSS、延後非關鍵指令碼。",
      fixEn: "Compress and preload the hero image, inline critical CSS for render-blocking stylesheets, and defer non-critical scripts.",
      bizZh: "LCP 偏高會降低首屏體驗與轉換率（影響程度為估算）。",
      bizEn: "High LCP degrades above-the-fold experience and conversion (impact is estimated).",
    },
    {
      key: "inp",
      unit: "ms",
      nameZh: "互動到下次繪製 (INP)",
      nameEn: "Interaction to Next Paint (INP)",
      rootZh: `主執行緒上的 JavaScript 執行量偏高（${scripts} 個指令碼）可能延遲互動回應 ${modeledZh}。`,
      rootEn: `Heavy main-thread JavaScript (${scripts} scripts) likely delays interaction responsiveness ${modeledEn}.`,
      fixZh: "拆分長任務、延後第三方指令碼、減少 hydration 成本。",
      fixEn: "Break up long tasks, defer third-party scripts, and reduce hydration cost.",
      bizZh: "INP 偏高會讓互動感覺遲鈍，降低使用者完成關鍵動作的比率（影響程度為估算）。",
      bizEn: "High INP makes interactions feel sluggish, lowering completion of key actions (impact is estimated).",
    },
    {
      key: "cls",
      unit: "",
      nameZh: "累計版面位移 (CLS)",
      nameEn: "Cumulative Layout Shift (CLS)",
      rootZh: `無尺寸保留的圖片或晚載入字型可能造成版面位移 ${modeledZh}。`,
      rootEn: `Images without reserved dimensions or late-loading fonts can cause layout shift ${modeledEn}.`,
      fixZh: "為圖片與廣告容器設定明確尺寸、使用 font-display: optional/swap 並預先載入字型。",
      fixEn: "Set explicit dimensions on images/ad slots and use font-display: optional/swap with preloaded fonts.",
      bizZh: "CLS 偏高會造成誤點與挫折感，傷害信任與轉換（影響程度為估算）。",
      bizEn: "High CLS causes misclicks and frustration, harming trust and conversion (impact is estimated).",
    },
  ];

  const findings: RichFinding[] = [];
  for (const config of configs) {
    const metric = crux.metrics[config.key];
    if (metric.p75 === null) {
      continue;
    }
    findings.push({
      severity: severityFromRating(metric.rating),
      finding: isZh
        ? `${config.nameZh} 實測 p75 為 ${metric.p75}${config.unit}（評級：${metric.rating ?? "無資料"}）。`
        : `${config.nameEn} measured p75 is ${metric.p75}${config.unit} (rating: ${metric.rating ?? "no data"}).`,
      rootCause: isZh ? config.rootZh : config.rootEn,
      businessImpact: isZh ? config.bizZh : config.bizEn,
      actionableFix: isZh ? config.fixZh : config.fixEn,
    });
  }
  return findings;
}

export function buildFallbackSummary(payload: AuditRequestPayload, evidence: AuditEvidenceBundle, reason: string): string {
  const deterministic = evidence.deterministic;
  const primaryRuntimeGate = getPrimaryRuntimeGate(evidence);
  const findings: string[] = [];
  const nextActions: string[] = [];

  const isZh = payload.language === "zh-TW";

  if (deterministic.status === "failed") {
    findings.push(isZh ? "- 靜態收集失敗，目前結果僅視為初始資料收集，並非完整稽核。" : "- Deterministic collection failed, so the current result should be treated as an intake stub rather than a finished audit.");
  } else {
    findings.push(isZh ? `- 目標網址解析為 ${deterministic.finalUrl ?? payload.url}，狀態碼 ${deterministic.statusCode ?? "未知"}。` : `- The target resolved to ${deterministic.finalUrl ?? payload.url} with status ${deterministic.statusCode ?? "unknown"}.`);

    if (typeof deterministic.responseTimeMs === "number") {
      findings.push(isZh ? `- 初始 HTML 回應時間測量為 ${deterministic.responseTimeMs} 毫秒。` : `- Initial HTML response time measured ${deterministic.responseTimeMs} ms during the deterministic pass.`);
    }

    if (deterministic.document?.metaDescription === null) {
      findings.push(isZh ? "- 缺少 Meta Description，影響基礎 SEO 指標。" : "- Meta description is missing, which weakens baseline SEO hygiene.");
    }

    if (!deterministic.document?.canonical) {
      findings.push(isZh ? "- 未偵測到 Canonical 標籤，重複內容風險需要進一步檢視。" : "- Canonical tagging was not detected, so duplicate-surface control needs review.");
    }

    if ((deterministic.document?.counts.imagesMissingAlt ?? 0) > 0) {
      findings.push(isZh ? `- 初始 HTML 中有 ${deterministic.document?.counts.imagesMissingAlt} 張圖片缺少 alt 替代文字。` : `- ${deterministic.document?.counts.imagesMissingAlt} images are missing alt text in the initial HTML.`);
    }

    if ((deterministic.document?.counts.structuredDataBlocks ?? 0) === 0) {
      findings.push(isZh ? "- 在初始 HTML 回應中未發現結構化資料 (Structured Data)。" : "- No structured data blocks were found in the deterministic HTML response.");
    }

    if (deterministic.warnings.length === 0) {
      findings.push(isZh ? "- 靜態收集證據未在初始 HTML 回應中發現嚴重的基礎性問題。" : "- Deterministic evidence did not reveal critical baseline issues in the initial HTML response.");
    }
  }

  if (primaryRuntimeGate) {
    nextActions.push(isZh ? `- 在進行完整流程涵蓋前，需解開此階段受阻的執行檢查：“${primaryRuntimeGate.label}”。` : `- Unblock the browser runtime gate \"${primaryRuntimeGate.label}\" before treating this run as full flow coverage.`);
  } else {
    nextActions.push(isZh ? "- 針對同意橫幅、路由轉換或結帳路徑等狀態性流程，啟用瀏覽器收集器模擬。" : "- Enable browser collectors for stateful flows such as consent banners, route transitions, and checkout-like paths.");
  }

  nextActions.push(isZh ? "- 一旦管道脫離僅接收模式，應加入 bots.txt、Sitemap 與核心網路指標 (Core Web Vitals) 的自定義檢查。" : "- Add deterministic checks for robots.txt, sitemap, and Core Web Vitals once the pipeline moves beyond intake-only mode.");

  let execSumZh = `本次稽核於 Fallback 降級模式執行 (原因：${reason})。 `;
  execSumZh += primaryRuntimeGate ? `有主要的瀏覽器執行檢查被阻擋或未完成：${formatRuntimeGate(primaryRuntimeGate)}，影響了深入流程的掌握。` : "瀏覽器時間軸中尚未明確發現受阻的執行檢查。";

  const executiveSummary = isZh 
    ? execSumZh 
    : `The audit was executed in fallback synthesis mode (${reason}). ${primaryRuntimeGate ? `A primary runtime gate was blocked or incomplete: ${formatRuntimeGate(primaryRuntimeGate)}, impacting deep-flow visibility.` : "No blocked runtime gate was explicitly identified in the browser timeline."}`;

  const browserFlowGaps = [
    { 
      issue: isZh ? `瀏覽器收集器狀態：${evidence.browser.status}` : `Browser collector status: ${evidence.browser.status}`, 
      impact: evidence.browser.reason ?? (isZh ? "未捕捉到更多瀏覽器細節，因此限制了動態互動的驗證程度。" : "No additional browser detail was captured, which limits dynamic interactivity validation."),
      severity: "medium"
    },
    { 
      issue: isZh ? `瀏覽器收集器模式：${evidence.browser.mode}` : `Browser collector mode: ${evidence.browser.mode}`, 
      impact: isZh ? "決定用戶端 JavaScript 執行與網路追蹤的深度。" : "Determines the depth of client-side JavaScript execution and network tracking.",
      severity: "low"
    }
  ];

  if (evidence.browser.flows.length > 0) {
    browserFlowGaps.push({
      issue: isZh ? "瀏覽器流程準備狀態" : "Browser flow readiness",
      impact: evidence.browser.flows.map((flow) => `${flow.label} (${flow.status})`).join(", "),
      severity: evidence.browser.flows.some(f => f.status === "blocked") ? "high" : "low"
    });
  }

  if (primaryRuntimeGate) {
    browserFlowGaps.push({
      issue: isZh ? "主要執行階段受阻" : "Primary runtime gate blocked",
      impact: formatRuntimeGate(primaryRuntimeGate),
      severity: "high"
    });
  }

  const architectureRisks = [
    {
      issue: primaryRuntimeGate ? (isZh ? "需要解決執行邊界問題" : "Runtime Boundary Remediation Required") : (isZh ? "架構證據有限" : "Limited Architecture Evidence"),
      impact: primaryRuntimeGate
        ? (isZh ? `受阻的執行閘門代表須在此次執行前修復「僅限瀏覽器」界線，以進行具高信賴度的架構聲明。` : `The blocked runtime gate suggests a browser-only boundary needs remediation before this run can support high-confidence architecture claims.`)
        : (isZh ? "目前的架構證據僅限預載中繼資料與被動式 HTML 檢測；實例執行邊界仍待瀏覽器等級確認。" : "Current architecture evidence is limited to intake metadata and deterministic HTML inspection; runtime boundaries still need browser-level verification."),
      severity: primaryRuntimeGate ? "high" : "medium"
    }
  ];

  const performanceFindings = buildPerformanceFindings(evidence, isZh);

  return JSON.stringify({
    executiveSummary,
    performanceFindings,
    deterministicFindings: findings.map((f) => ({
      severity: "warning" as const,
      finding: f,
      rootCause: isZh ? "由靜態收集證據推得，尚未經瀏覽器執行驗證。" : "Derived from deterministic evidence; not yet verified by browser execution.",
      businessImpact: isZh ? "需進一步調查以量化影響。" : "Requires further investigation to quantify impact.",
      actionableFix: isZh ? "啟用瀏覽器收集器以取得執行期證據後再行確認。" : "Enable the browser collector to confirm with runtime evidence.",
      issue: f,
      impact: isZh ? "需要進一步調查" : "Requires further investigation",
    })),
    browserFlowGaps,
    architectureRisks,
    nextActions: nextActions.map((a) => ({
      action: a,
      impact: isZh ? "提升整體管道的可見度與穩定度。" : "Improves overall pipeline visibility and stability.",
      actionableFix: a,
    })),
  });
}

export async function synthesizeAudit(payload: AuditRequestPayload, evidence: AuditEvidenceBundle, config?: { openRouterApiKey?: string, apiKey?: string, allowedModels?: string[] }): Promise<AuditSynthesisResult> {
  const apiKey = config?.openRouterApiKey || config?.apiKey || process.env.OPENROUTER_API_KEY;

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