import type { AuditEvidenceBundle, AuditRequestPayload, AuditSynthesisResult, BrowserCollectorTimelineStep, DeterministicCollectorResult } from "../../shared/types/auditPipelineTypes";
import { resolveProviderCredentials, callLlmProvider } from "./llmProvider";

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

  const languageInstruction = payload.language === "zh-TW" 
    ? "You MUST write the ENTIRE report in Traditional Chinese (繁體中文), specifically using Taiwanese terminology (台灣用語, e.g. 效能 instead of 性能, 解析度 instead of 分辨率, 記憶體 instead of 內存)." 
    : payload.language
      ? `You MUST write the ENTIRE report in ${payload.language} language.`
      : "You MUST write the ENTIRE report in English.";

  return [
    "You are a senior web performance and architecture auditor for productized consulting engagements.",
    "Perform a discovery-first website review based strictly on the provided evidence.",
    "Base every claim on the supplied evidence. If browser evidence is unavailable, state the uncertainty rather than inventing observations.",
    "If a browser runtime gate is blocked or incomplete, explicitly name that gate in both the Executive Summary and Browser Flow Gaps sections.",
    languageInstruction,
    "You MUST output your response as a valid JSON object matching the following structure EXACTLY. DO NOT wrap the output in markdown code blocks (e.g., no ```json). Output ONLY the raw JSON object.",
    "{",
    `  "executiveSummary": "A concise, professional overview of the site's health and readiness. Focus on business impact, user experience, and technical readiness. Write this for C-level executives and stakeholders.",`,
    '  "deterministicFindings": [{ "issue": "The technical issue found", "impact": "The business or UX impact", "severity": "high|medium|low", "affectedMetric": "lcp|metadata|contrast|protocol|resource|image|content|null", "explanation": "Plain-language explanation for non-technical stakeholders" }],',
    '  "browserFlowGaps": [{ "issue": "The flow gap or blocked gate", "impact": "How this affects user conversion or traversal", "severity": "high|medium|low", "affectedMetric": "lcp|metadata|contrast|protocol|resource|image|content|null", "explanation": "Plain-language explanation for non-technical stakeholders" }],',
    '  "architectureRisks": [{ "issue": "The architecture or scaling concern", "impact": "Long-term business or operational impact", "severity": "high|medium|low", "affectedMetric": "lcp|metadata|contrast|protocol|resource|image|content|null", "explanation": "Plain-language explanation for non-technical stakeholders" }],',
    '  "nextActions": [{ "action": "Clear, actionable step", "impact": "The expected improvement" }]',
    "}",
    "Keep the tone consultative, professional, and actionable. Frame technical issues in terms of business impact.",
    "For affectedMetric, use one of: lcp, metadata, contrast, protocol, resource, image, content, or null if not applicable.",
    "For explanation, write ONE sentence in the report language that a university student would understand — what the issue means for their website, not the technical details.",
    "Category examples:",
    "  - slow_lcp: affectedMetric='lcp', explanation='Your website takes too long to show the main content, causing visitors to leave.'",
    "  - missing_meta: affectedMetric='metadata', explanation='Search engines cannot properly describe your page in results, reducing clicks.'",
    "  - low_contrast: affectedMetric='contrast', explanation='Text is hard to read against the background, making your site inaccessible to some users.'",
    "  - insecure_protocol: affectedMetric='protocol', explanation='Your site uses insecure connections, putting visitor data at risk.'",
    "  - blocked_resource: affectedMetric='resource', explanation='Important files are blocked from loading, breaking functionality.'",
    "  - heavy_image: affectedMetric='image', explanation='Large images slow down your page, hurting user experience and SEO.'",
    "  - sparse_content: affectedMetric='content', explanation='Your pages have too little content, making it hard for search engines to understand them.'",
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
  const findings: Array<{ issue: string; impact: string; severity: string; affectedMetric?: string | null; explanation?: string }> = [];
  const nextActions: string[] = [];

  const isZh = payload.language === "zh-TW";

  if (deterministic.status === "failed") {
    findings.push({
      issue: isZh ? "靜態收集失敗，目前結果僅視為初始資料收集，並非完整稽核。" : "Deterministic collection failed, so the current result should be treated as an intake stub rather than a finished audit.",
      impact: isZh ? "無法取得基礎證據" : "Unable to gather baseline evidence",
      severity: "high",
      affectedMetric: null,
      explanation: isZh ? "無法完成初步掃描，請確認網址可存取後重試。" : "Initial scan could not complete. Please verify the URL is accessible and try again."
    });
  } else {
    findings.push({
      issue: isZh ? `目標網址解析為 ${deterministic.finalUrl ?? payload.url}，狀態碼 ${deterministic.statusCode ?? "未知"}。` : `The target resolved to ${deterministic.finalUrl ?? payload.url} with status ${deterministic.statusCode ?? "unknown"}.`,
      impact: isZh ? "網站基礎連線正常" : "Basic site connectivity works",
      severity: "low",
      affectedMetric: null,
      explanation: isZh ? "您的網站可以正常連線並回應。" : "Your website connects and responds normally."
    });

    if (typeof deterministic.responseTimeMs === "number") {
      findings.push({
        issue: isZh ? `初始 HTML 回應時間測量為 ${deterministic.responseTimeMs} 毫秒。` : `Initial HTML response time measured ${deterministic.responseTimeMs} ms during the deterministic pass.`,
        impact: isZh ? "回應速度影響使用者第一印象" : "Response speed affects first impression",
        severity: deterministic.responseTimeMs > 600 ? "medium" : "low",
        affectedMetric: "lcp",
        explanation: deterministic.responseTimeMs > 600
          ? (isZh ? "伺服器回應較慢，建議優化伺服器或啟用快取。" : "Server response is slow. Consider optimizing the server or enabling caching.")
          : (isZh ? "伺服器回應速度尚可。" : "Server response speed is acceptable.")
      });
    }

    if (deterministic.document?.metaDescription === null) {
      findings.push({
        issue: isZh ? "缺少 Meta Description，影響基礎 SEO 指標。" : "Meta description is missing, which weakens baseline SEO hygiene.",
        impact: isZh ? "搜尋結果無法正確顯示摘要" : "Search results cannot show proper snippet",
        severity: "medium",
        affectedMetric: "metadata",
        explanation: isZh ? "搜尋引擎無法正確描述您的頁面，會減少點擊率。" : "Search engines cannot properly describe your page in results, reducing clicks."
      });
    }

    if (!deterministic.document?.canonical) {
      findings.push({
        issue: isZh ? "未偵測到 Canonical 標籤，重複內容風險需要進一步檢視。" : "Canonical tagging was not detected, so duplicate-surface control needs review.",
        impact: isZh ? "可能造成重複內容問題" : "May cause duplicate content issues",
        severity: "medium",
        affectedMetric: "metadata",
        explanation: isZh ? "缺少標準網址標記，搜尋引擎可能索引重複頁面。" : "Missing canonical tag may cause search engines to index duplicate pages."
      });
    }

    if ((deterministic.document?.counts.imagesMissingAlt ?? 0) > 0) {
      findings.push({
        issue: isZh ? `初始 HTML 中有 ${deterministic.document?.counts.imagesMissingAlt} 張圖片缺少 alt 替代文字。` : `${deterministic.document?.counts.imagesMissingAlt} images are missing alt text in the initial HTML.`,
        impact: isZh ? "影響無障礙存取與 SEO" : "Affects accessibility and SEO",
        severity: "low",
        affectedMetric: "image",
        explanation: isZh ? "視障使用者無法理解圖片內容，搜尋引擎也難以索引圖片。" : "Visually impaired users cannot understand images, and search engines struggle to index them."
      });
    }

    if ((deterministic.document?.counts.structuredDataBlocks ?? 0) === 0) {
      findings.push({
        issue: isZh ? "在初始 HTML 回應中未發現結構化資料 (Structured Data)。" : "No structured data blocks were found in the deterministic HTML response.",
        impact: isZh ? "搜尋結果無法顯示豐富摘要" : "Search results cannot show rich snippets",
        severity: "low",
        affectedMetric: "metadata",
        explanation: isZh ? "缺少結構化資料，搜尋結果較不吸引人。" : "Missing structured data makes search results less attractive."
      });
    }

    if (deterministic.warnings.length === 0) {
      findings.push({
        issue: isZh ? "靜態收集證據未在初始 HTML 回應中發現嚴重的基礎性問題。" : "Deterministic evidence did not reveal critical baseline issues in the initial HTML response.",
        impact: isZh ? "基礎 HTML 結構良好" : "Baseline HTML structure is healthy",
        severity: "low",
        affectedMetric: null,
        explanation: isZh ? "您的網頁基礎結構沒有明顯問題。" : "Your page's basic structure has no obvious issues."
      });
    }
  }

  if (primaryRuntimeGate) {
    nextActions.push(isZh ? `在進行完整流程涵蓋前，需解開此階段受阻的執行檢查：“${primaryRuntimeGate.label}”。` : `Unblock the browser runtime gate "${primaryRuntimeGate.label}" before treating this run as full flow coverage.`);
  } else {
    nextActions.push(isZh ? "針對同意橫幅、路由轉換或結帳路徑等狀態性流程，啟用瀏覽器收集器模擬。" : "Enable browser collectors for stateful flows such as consent banners, route transitions, and checkout-like paths.");
  }

  nextActions.push(isZh ? "一旦管道脫離僅接收模式，應加入 bots.txt、Sitemap 與核心網路指標 (Core Web Vitals) 的自定義檢查。" : "Add deterministic checks for robots.txt, sitemap, and Core Web Vitals once the pipeline moves beyond intake-only mode.");

  let execSumZh = `本次稽核於 Fallback 降級模式執行 (原因：${reason})。 `;
  execSumZh += primaryRuntimeGate ? `有主要的瀏覽器執行檢查被阻擋或未完成：${formatRuntimeGate(primaryRuntimeGate)}，影響了深入流程的掌握。` : "瀏覽器時間軸中尚未明確發現受阻的執行檢查。";

  const executiveSummary = isZh
    ? execSumZh
    : `The audit was executed in fallback synthesis mode (${reason}). ${primaryRuntimeGate ? `A primary runtime gate was blocked or incomplete: ${formatRuntimeGate(primaryRuntimeGate)}, impacting deep-flow visibility.` : "No blocked runtime gate was explicitly identified in the browser timeline."}`;

  const browserFlowGaps = [
    { 
      issue: isZh ? `瀏覽器收集器狀態：${evidence.browser.status}` : `Browser collector status: ${evidence.browser.status}`, 
      impact: evidence.browser.reason ?? (isZh ? "未捕捉到更多瀏覽器細節，因此限制了動態互動的驗證程度。" : "No additional browser detail was captured, which limits dynamic interactivity validation."),
      severity: "medium",
      affectedMetric: null,
      explanation: isZh ? "瀏覽器層級的細節未被捕捉，動態互動無法完整驗證。" : "Browser-level details were not captured, limiting dynamic interactivity validation."
    },
    { 
      issue: isZh ? `瀏覽器收集器模式：${evidence.browser.mode}` : `Browser collector mode: ${evidence.browser.mode}`, 
      impact: isZh ? "決定用戶端 JavaScript 執行與網路追蹤的深度。" : "Determines the depth of client-side JavaScript execution and network tracking.",
      severity: "low",
      affectedMetric: null,
      explanation: isZh ? "收集器模式決定了能觀察到多少 JavaScript 執行細節。" : "The collector mode determines how much JavaScript execution detail we can observe."
    }
  ];

  if (evidence.browser.flows.length > 0) {
    browserFlowGaps.push({
      issue: isZh ? "瀏覽器流程準備狀態" : "Browser flow readiness",
      impact: evidence.browser.flows.map((flow) => `${flow.label} (${flow.status})`).join(", "),
      severity: evidence.browser.flows.some(f => f.status === "blocked") ? "high" : "low",
      affectedMetric: null,
      explanation: isZh ? "瀏覽器流程顯示了哪些頁面路徑可正常存取。" : "Browser flows show which page paths are accessible."
    });
  }

  if (primaryRuntimeGate) {
    browserFlowGaps.push({
      issue: isZh ? "主要執行階段受阻" : "Primary runtime gate blocked",
      impact: formatRuntimeGate(primaryRuntimeGate),
      severity: "high",
      affectedMetric: null,
      explanation: isZh ? "瀏覽器在執行關鍵流程時被阻擋，需解決後才能完整稽核。" : "Browser was blocked during a critical flow, must be resolved for complete audit."
    });
  }

  const architectureRisks = [
    {
      issue: primaryRuntimeGate ? (isZh ? "需要解決執行邊界問題" : "Runtime Boundary Remediation Required") : (isZh ? "架構證據有限" : "Limited Architecture Evidence"),
      impact: primaryRuntimeGate
        ? (isZh ? `受阻的執行閘門代表須在此次執行前修復「僅限瀏覽器」界線，以進行具高信賴度的架構聲明。` : `The blocked runtime gate suggests a browser-only boundary needs remediation before this run can support high-confidence architecture claims.`)
        : (isZh ? "目前的架構證據僅限預載中繼資料與被動式 HTML 檢測；實例執行邊界仍待瀏覽器等級確認。" : "Current architecture evidence is limited to intake metadata and deterministic HTML inspection; runtime boundaries still need browser-level verification."),
      severity: primaryRuntimeGate ? "high" : "medium",
      affectedMetric: null,
      explanation: primaryRuntimeGate
        ? (isZh ? "瀏覽器執行邊界受阻，架構風險無法完整評估。" : "Browser execution boundary blocked, architecture risk cannot be fully assessed.")
        : (isZh ? "僅有靜態 HTML 證據，架構風險評估有限。" : "Only static HTML evidence available, architecture risk assessment is limited.")
    }
  ];

  return JSON.stringify({
    executiveSummary,
    deterministicFindings: findings,
    browserFlowGaps,
    architectureRisks,
    nextActions: nextActions.map(a => ({ action: a, impact: isZh ? "提升整體管道的可見度與穩定度。" : "Improves overall pipeline visibility and stability." })),
  });
}

export async function synthesizeAudit(payload: AuditRequestPayload, evidence: AuditEvidenceBundle, config?: { aiProvider?: string, agentRouterApiKey?: string, openRouterApiKey?: string, nvidiaApiKey?: string, apiKey?: string, allowedModels?: string[] }): Promise<AuditSynthesisResult> {
  const credentials = resolveProviderCredentials(config);

  if (evidence.deterministic.status === "failed") {
    const reason = `deterministic_collector_failed: ${evidence.deterministic.error ?? "unknown_error"}`;
    return {
      provider: "fallback",
      queued: false,
      reason,
      summary: buildFallbackSummary(payload, evidence, reason),
    };
  }

  if (!credentials.apiKey) {
    return {
      provider: "fallback",
      queued: false,
      reason: "missing_api_key",
      summary: buildFallbackSummary(payload, evidence, "missing_api_key"),
    };
  }

  try {
    const prompt = buildAuditPrompt(payload, evidence);
    const response = await callLlmProvider(credentials, prompt);

    return {
      provider: credentials.provider,
      queued: false,
      summary: response.text ?? "",
      model: response.model,
    };
  } catch (error) {
    // Surface the real provider failure so nvidia/agentrouter errors are diagnosable
    // instead of collapsing every failure into an opaque "api_error".
    const detail = error instanceof Error ? error.message : String(error);
    const reason = `api_error: ${detail}`;
    return {
      provider: "fallback",
      queued: false,
      reason,
      summary: buildFallbackSummary(payload, evidence, reason),
    };
  }
}
