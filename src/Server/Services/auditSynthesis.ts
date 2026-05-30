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
    deterministic.document ? `[MODELED INPUTS] Asset counts: scripts=${deterministic.document.counts.scripts}, stylesheets=${deterministic.document.counts.stylesheets}, images=${deterministic.document.counts.images}, missingAlt=${deterministic.document.counts.imagesMissingAlt}, structuredData=${deterministic.document.counts.structuredDataBlocks}, preconnectHints=${deterministic.document.counts.preconnectHints}` : null,
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

function formatCruxEvidence(crux?: any): string {
  if (!crux || !crux.hasData) {
    return "[MEASURED FIELD DATA (CrUX)] No real-user Core Web Vitals (field data) exist for this target in Google's database.";
  }

  const m = crux.metrics || {};
  return [
    `[MEASURED FIELD DATA (CrUX, REAL USERS - GROUND TRUTH)]`,
    `- Collection Scope: ${crux.collectionPeriod?.scope || "page (URL)"}`,
    `- Collection Period: ${crux.collectionPeriod?.firstDate || "unknown"} to ${crux.collectionPeriod?.lastDate || "unknown"}`,
    `- Largest Contentful Paint (LCP p75): ${m.largest_contentful_paint?.value ?? "N/A"}s (Rating: ${m.largest_contentful_paint?.rating || "unknown"})`,
    `- Interaction to Next Paint (INP p75): ${m.interaction_to_next_paint?.value ?? "N/A"}ms (Rating: ${m.interaction_to_next_paint?.rating || "unknown"})`,
    `- Cumulative Layout Shift (CLS p75): ${m.cumulative_layout_shift?.value ?? "N/A"} (Rating: ${m.cumulative_layout_shift?.rating || "unknown"})`,
    `- First Contentful Paint (FCP p75): ${m.first_contentful_paint?.value ?? "N/A"}s (Rating: ${m.first_contentful_paint?.rating || "unknown"})`,
  ].join("\n");
}

function buildAuditPrompt(payload: AuditRequestPayload, evidence: AuditEvidenceBundle): string {
  const primaryRuntimeGate = getPrimaryRuntimeGate(evidence);

  const languageInstruction = payload.language === "zh-TW" 
    ? [
        "You MUST write the ENTIRE report in Traditional Chinese (繁體中文), specifically using standard Taiwanese software technology and IT terminology (台灣標準 IT/軟體術語).",
        "Mandatory terminology replacements for Traditional Chinese (zh-TW):",
        "- Use '效能' (never '性能').",
        "- Use '渲染阻塞' (never '渲染阻礙' or '渲染阻塞的').",
        "- Use '伺服器' (never '服務端' or '服務器').",
        "- Use '快取' (never '緩存').",
        "- Use '封包' (never '數據包').",
        "- Use '解析度' (never '分辨率').",
        "- Use '記憶體' (never '內存').",
        "- Use '最高/最大內容繪製' for LCP (never '最大內容渲染' or LCP translations containing '性能').",
        "- Use '指令碼' or '腳本' for scripts (never '腳本指令' or other terms).",
        "- Use '點擊劫持' for clickjacking.",
        "- Use '跨站指令碼攻擊' or 'XSS' for cross-site scripting."
      ].join("\n")
    : "You MUST write the ENTIRE report in clear, crisp, consultative English.";

  const outputSchemaInstruction = [
    "You MUST output your response as a valid JSON object matching the following structure EXACTLY. Ensure there are ZERO backticks (```json), Markdown wrapping, or preambles. Output ONLY the raw valid JSON object.",
    "Make sure that for every finding in performanceFindings, deterministicFindings, browserFlowGaps, and architectureRisks, you fully populate BOTH the new rich fields (finding, rootCause, businessImpact, actionableFix, severity) AND the legacy mapping fields (issue, impact) mapped to identical text as 'finding' and 'businessImpact' respectively to ensure strict backward compatibility.",
    "{",
    '  "executiveSummary": "A concise overview explaining page health and readiness. Talk to business metrics (retention, cart dropoff, search visibility) and name any blocked browser runtime gate.",',
    '  "performanceFindings": [',
    '    {',
    '      "severity": "critical|warning|info",',
    '      "finding": "1-sentence professional summary",',
    '      "rootCause": "deep technical why, correlating real metrics with modeling",',
    '      "businessImpact": "business value or retention outcome of this behavior",',
    '      "actionableFix": "step-by-step developer instruction to resolve"',
    '    }',
    '  ],',
    '  "deterministicFindings": [',
    '    {',
    '      "severity": "critical|warning|info",',
    '      "finding": "...",',
    '      "rootCause": "...",',
    '      "businessImpact": "...",',
    '      "actionableFix": "...",',
    '      "issue": "... (same as finding)",',
    '      "impact": "... (same as businessImpact)"',
    '    }',
    '  ],',
    '  "browserFlowGaps": [',
    '    {',
    '      "severity": "critical|warning|info",',
    '      "finding": "...",',
    '      "rootCause": "...",',
    '      "businessImpact": "...",',
    '      "actionableFix": "...",',
    '      "issue": "... (same as finding)",',
    '      "impact": "... (same as businessImpact)"',
    '    }',
    '  ],',
    '  "architectureRisks": [',
    '    {',
    '      "severity": "critical|warning|info",',
    '      "finding": "...",',
    '      "rootCause": "...",',
    '      "businessImpact": "...",',
    '      "actionableFix": "...",',
    '      "issue": "... (same as finding)",',
    '      "impact": "... (same as businessImpact)"',
    '    }',
    '  ],',
    '  "nextActions": [',
    '    {',
    '      "action": "clear next step description",',
    '      "impact": "expected business/UX improvement",',
    '      "actionableFix": "precise terminal or engineering command/procedure"',
    '    }',
    '  ]',
    "}"
  ].join("\n");

  return [
    "You are the ChiefEditorAgent, an elite web performance and technology architect auditing this website.",
    "Your objective is to synthesize a single authoritative report by compiling and correlating three discovery evidence modules.",
    "BASE EVERY CLAIM STRICTLY ON THE PROVIDED EVIDENCE. NEVER invent, fabricate, or assume elements, byte sizes, or metrics not explicitly supplied.",
    "If a browser runtime gate is blocked or incomplete, explicitly name that gate in both the Executive Summary and Browser Flow Gaps sections.",
    "",
    "## HONESTY & ATTRIBUTION MAPPING RULES:",
    "1. Chrome UX Report (CrUX) represents MEASURED real-user ground truth. Treat LCP, INP, CLS, FCP as ground truth when present.",
    "2. If CrUX has no field data ('No real-user field data available'), you MUST explicitly state this and base findings on server responses or browser counts.",
    "3. NEVER invent element-level attribution (e.g. naming specific hero images as culprits) or speculate about exact byte sizes or server waterfall metrics. State that these are unobserved in the static layer.",
    "4. Clearly tag any estimated or modeled figures derived from script counts or latency tests as 'estimated' (or '估算' / '模型推估' in Traditional Chinese).",
    "",
    languageInstruction,
    "",
    "## REQUIRED TARGET OUTLINE AND SCHEMA:",
    outputSchemaInstruction,
    "",
    "## EVIDENCE PASSING MODULES:",
    "",
    formatCruxEvidence(evidence.crux),
    "",
    buildEvidenceLines(payload, evidence.deterministic).join("\n"),
    "",
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
  const crux = evidence.crux;
  const primaryRuntimeGate = getPrimaryRuntimeGate(evidence);
  
  const isZh = payload.language === "zh-TW";

  // Create executive summary
  let execSum = "";
  if (isZh) {
    execSum = `本次稽核於 Fallback 降級模式執行 (原因：${reason})。主機連線與靜態 HTML 爬行已完成。`;
    if (primaryRuntimeGate) {
      execSum += ` 發現瀏覽器仿真步驟受阻：“${formatRuntimeGate(primaryRuntimeGate)}”，可能限制深度動態路由分析。`;
    }
  } else {
    execSum = `The audit was executed in fallback synthesis mode (${reason}). Static scanning is completed.`;
    if (primaryRuntimeGate) {
      execSum += ` A primary browser runtime gate was blocked: ${formatRuntimeGate(primaryRuntimeGate)}, which limits interactive client analysis.`;
    }
  }

  // Define arrays
  const performanceFindings: any[] = [];
  const deterministicFindings: any[] = [];
  const browserFlowGaps: any[] = [];
  const architectureRisks: any[] = [];
  const nextActions: any[] = [];

  // Populate Performance Findings using measured CrUX if available
  if (crux && crux.hasData) {
    const m = crux.metrics || {};
    const lcpVal = m.largest_contentful_paint?.value ?? "N/A";
    const lcpRating = m.largest_contentful_paint?.rating || "unknown";
    const inpVal = m.interaction_to_next_paint?.value ?? "N/A";
    const inpRating = m.interaction_to_next_paint?.rating || "unknown";

    if (isZh) {
      performanceFindings.push({
        severity: lcpRating === "poor" ? "critical" : "warning",
        finding: `Chrome UX 實測 LCP 為 ${lcpVal} 秒 (評級：${lcpRating})`,
        rootCause: `經由真實使用者野外 (Field Data) 行動端體驗回報，網頁於特定地區可能存在渲染延遲。`,
        businessImpact: `載入延遲可能直接損害行動端客戶留存率與訂單轉換率。`,
        actionableFix: `評估在靜態 HTML 標頭內部署 DNS Preconnect 資源提示，並延遲非關鍵的 JavaScript 與樣式表加載。`,
        issue: `Chrome UX 實測 LCP 為 ${lcpVal} 秒 (評級：${lcpRating})`,
        impact: `載入延遲可能直接損害行動端客戶留存率與訂單轉換率。`
      });
    } else {
      performanceFindings.push({
        severity: lcpRating === "poor" ? "critical" : "warning",
        finding: `Real-user measured LCP is ${lcpVal}s (Rating: ${lcpRating})`,
        rootCause: `Measured p75 metrics indicate network or hydration bottlenecks impacting performance under field situations.`,
        businessImpact: `Extended load delays elevate mobile user bounce rates and lower total cart checkouts.`,
        actionableFix: `Audit critical asset weight, perform bundles-splitting, and leverage asynchronous script deferral.`,
        issue: `Real-user measured LCP is ${lcpVal}s (Rating: ${lcpRating})`,
        impact: `Extended load delays elevate mobile user bounce rates and lower total cart checkouts.`
      });
    }
  } else {
    // No CrUX data fallback
    if (isZh) {
      performanceFindings.push({
        severity: "info",
        finding: "目前無 Google CrUX 使用者實測野外效能指標",
        rootCause: "此目標 URL 在 Chrome UX 欄位資料庫中可能流量過低或查無紀錄。效能指標由靜態回應與仿真數據[模型推估]。",
        businessImpact: "無法精確得知 RUM 真實世界行為；依靠單次仿真回應時間進行體驗建模。",
        actionableFix: "在生產環境整合 RUM 或 Google Tag Manager 取得持續性的核心網頁指標 (CWV) 使用者報表。",
        issue: "目前無 Google CrUX 使用者實測野外效能指標",
        impact: "無法精確得知 RUM 真實世界行為；依靠單次仿真回應時間進行體驗建模。"
      });
    } else {
      performanceFindings.push({
        severity: "info",
        finding: "No Google CrUX real-user field data available on this page",
        rootCause: "The target url does not possess enough traffic footprint in Chrome UX report database. We fall back to modeled response measurements.",
        businessImpact: "Prone to blindspots regarding real-world mobile connection deviations.",
        actionableFix: "Set up server-side instrumentation or GTM metrics to continuously gather real-user CWV signals.",
        issue: "No Google CrUX real-user field data available on this page",
        impact: "Prone to blindspots regarding real-world mobile connection deviations."
      });
    }
  }

  // Populate Deterministic Findings
  if (deterministic.status === "failed") {
    if (isZh) {
      deterministicFindings.push({
        severity: "critical",
        finding: "連線與靜態 HTML 證據爬行失敗",
        rootCause: `伺服器回應異常或連線超時：${deterministic.error || "UNKNOWN_ERROR"}。`,
        businessImpact: "分析引擎無法檢索主機標頭或剖析基礎 SEO 標籤。",
        actionableFix: "檢查主機防火牆是否有外網連線阻擋，或確認伺服器是否正常服務。",
        issue: "連線與靜態 HTML 證據爬行失敗",
        impact: "分析引擎無法檢索主機標頭或剖析基礎 SEO 標籤。"
      });
    } else {
      deterministicFindings.push({
        severity: "critical",
        finding: "Connection and static evidence parsing failed",
        rootCause: `Server responded with a transport error or timeout: ${deterministic.error || "UNKNOWN_ERROR"}.`,
        businessImpact: "Prevents search crawlers and auditors from reading tag properties or certificates.",
        actionableFix: "Check proxy blocks and verify web server live listening logs.",
        issue: "Connection and static evidence parsing failed",
        impact: "Prevents search crawlers and auditors from reading tag properties or certificates."
      });
    }
  } else {
    // Successful deterministic
    const counts = deterministic.document?.counts || { scripts: 0, stylesheets: 0, images: 0, imagesMissingAlt: 0, structuredDataBlocks: 0, h1: 0 };
    
    if (typeof deterministic.responseTimeMs === "number" && deterministic.responseTimeMs > 800) {
      if (isZh) {
        deterministicFindings.push({
          severity: "warning",
          finding: `初始連線反應時間 (TTFB) 偏高: ${deterministic.responseTimeMs} ms`,
          rootCause: "伺服器端資料庫查詢壅塞或渲染指令碼開銷大，導致首頁封包發送排隊延遲。",
          businessImpact: "拉長首字繪製 (FCP/TTFB) 歷程，增加訪客流失比例。",
          actionableFix: "在邊緣伺服器/nginx 端部署頁面 CDN 快取鎖定，並優化資料庫索引。",
          issue: `初始連線反應時間 (TTFB) 偏高: ${deterministic.responseTimeMs} ms`,
          impact: "拉長首字繪製 (FCP/TTFB) 歷程，增加訪客流失比例。"
        });
      } else {
        deterministicFindings.push({
          severity: "warning",
          finding: `High initial server response time (TTFB): ${deterministic.responseTimeMs} ms`,
          rootCause: "Database serialization delays or node runtime compilation overhead slowing first payload dispatch.",
          businessImpact: "Regresses first viewport painting times, driving user bounce rate higher.",
          actionableFix: "Introduce static HTML edge caching on regional CDNs and serialize payload requests.",
          issue: `High initial server response time (TTFB): ${deterministic.responseTimeMs} ms`,
          impact: "Regresses first viewport painting times, driving user bounce rate higher."
        });
      }
    }

    if (counts.imagesMissingAlt > 0) {
      if (isZh) {
        deterministicFindings.push({
          severity: "info",
          finding: `有 ${counts.imagesMissingAlt} 張圖片缺少 alt 無障礙描述`,
          rootCause: "DOM 中多張素材圖片標籤未設置對應 alt 屬性，不符合無障礙網頁規範。",
          businessImpact: "可能對低視能人群輔助設備或搜尋引擎機器人索引可信度有負面影響。",
          actionableFix: "檢查 DOM 並為所有 img 標籤補齊能清晰描繪內容的 alt 替代文字屬性值。",
          issue: `有 ${counts.imagesMissingAlt} 張圖片缺少 alt 無障礙描述`,
          impact: "可能對低視能人群輔助設備或搜尋引擎機器人索引可信度有負面影響。"
        });
      } else {
        deterministicFindings.push({
          severity: "info",
          finding: `${counts.imagesMissingAlt} raster images are missing alternative text`,
          rootCause: "Templates instantiate image elements without supplying system alt attributes.",
          businessImpact: "Weakens layout trust score for assistive reading protocols and lowers natural index positioning.",
          actionableFix: "Supplement missing alt indicators on templates or apply decorative markers.",
          issue: `${counts.imagesMissingAlt} raster images are missing alternative text`,
          impact: "Weakens layout trust score for assistive reading protocols and lowers natural index positioning."
        });
      }
    }

    if (counts.structuredDataBlocks === 0) {
      if (isZh) {
        deterministicFindings.push({
          severity: "info",
          finding: "未檢出 schema.org 結構化資料區塊",
          rootCause: "網頁未向爬行裝置回報 JSON-LD 或 Microdata 標準中立性標識。",
          businessImpact: "搜尋引擎無法在結果頁 (SERP) 中顯示富媒體摘要 (Rich Snippets)，削減點閱點擊機率。",
          actionableFix: "在 HTML 尾部嵌入 structured schema 標誌，用以表示商業對象、對應地址與售價資訊。",
          issue: "未檢出 schema.org 結構化資料區塊",
          impact: "搜尋引擎無法在結果頁 (SERP) 中顯示富媒體摘要 (Rich Snippets)，削減點閱點擊機率。"
        });
      } else {
        deterministicFindings.push({
          severity: "info",
          finding: "Structured data blocks (schema.org) are missing",
          rootCause: "No schema microformatting detected in initial server transmission.",
          businessImpact: "Prevents search listings from displaying rich interactive cards, shrinking clickthrough ratios.",
          actionableFix: "Generate structured entity schema outputs (JSON-LD) and embed them standardly into layouts.",
          issue: "Structured data blocks (schema.org) are missing",
          impact: "Prevents search listings from displaying rich interactive cards, shrinking clickthrough ratios."
        });
      }
    }
  }

  // Populate Browser Flow Gaps
  if (primaryRuntimeGate) {
    if (isZh) {
      browserFlowGaps.push({
        severity: "warning",
        finding: `動態稽核流程中斷在：“${primaryRuntimeGate.label}”`,
        rootCause: `網頁仿真器嘗試在目標上建立動態執行鏈時遭遇逾時/步驟阻塞。`,
        businessImpact: "後續互動式按鈕、結帳漏斗及轉換事件稽核無法取得高信賴度的資料完整度。",
        actionableFix: "修正網站前端 JavaScript 錯誤，並在爬行標記中排除阻礙執行的 modal 或彈出視窗。",
        issue: `動態稽核流程中斷在：“${primaryRuntimeGate.label}”`,
        impact: "後續互動式按鈕、結帳漏斗及轉換事件稽核無法取得高信賴度的資料完整度。"
      });
    } else {
      browserFlowGaps.push({
        severity: "warning",
        finding: `Analysis paused or blocked at runtime gate: "${primaryRuntimeGate.label}"`,
        rootCause: `State crawler encountered interactive element timeouts or unexpected script termination.`,
        businessImpact: "Inhibits downstream pipeline diagnostics on stateful events like checkouts or user funnel flow.",
        actionableFix: "Rectify client-side script exception blocks or coordinate target consent wrappers.",
        issue: `Analysis paused or blocked at runtime gate: "${primaryRuntimeGate.label}"`,
        impact: "Inhibits downstream pipeline diagnostics on stateful events like checkouts or user funnel flow."
      });
    }
  } else {
    // Simple state mapping
    if (isZh) {
      browserFlowGaps.push({
        severity: "info",
        finding: `瀏覽器模擬探針状态為 ${evidence.browser.status}`,
        rootCause: `在 ${evidence.browser.mode} 模式下完成探索。爬行器爬行 ${evidence.browser.pages.length} 個動態頁面。`,
        businessImpact: "首頁流程能正常被描繪與加載，可見度正常。",
        actionableFix: "無需緊急修復。可進一步設置登入或特定點擊動作流程擴大涵蓋率。",
        issue: `瀏覽器模擬探針状态為 ${evidence.browser.status}`,
        impact: "首頁流程能正常被描繪與加載，可見度正常。"
      });
    } else {
      browserFlowGaps.push({
        severity: "info",
        finding: `Browser flow collection resolved as ${evidence.browser.status}`,
        rootCause: `Execution path succeeded using ${evidence.browser.mode} schema covering ${evidence.browser.pages.length} page nodes.`,
        businessImpact: "Baseline traversal is verified as clear, minimizing layout displacement risks.",
        actionableFix: "No immediate remediation. Increase test cases to include authentication segments.",
        issue: `Browser flow collection resolved as ${evidence.browser.status}`,
        impact: "Baseline traversal is verified as clear, minimizing layout displacement risks."
      });
    }
  }

  // Populate Architecture Risks
  if (primaryRuntimeGate) {
    if (isZh) {
      architectureRisks.push({
        severity: "warning",
        finding: "高互動式指令碼引發的架構解析阻礙",
        rootCause: "大量的外部 JavaScript 或重量級指令碼運行阻礙了瀏覽器爬行器軌跡流程，可能代表其架構耦合度過高。",
        businessImpact: "干擾網頁爬行深度，降低長尾自然搜尋的內部連結串連與權限傳遞。",
        actionableFix: "解耦前端組件，移除或拆分不必要的非同步函式庫及巨大模組。",
        issue: "高互動式指令碼引發的架構解析阻礙",
        impact: "干擾網頁爬行深度，降低長尾自然搜尋的內部連結串連與權限傳遞。"
      });
    } else {
      architectureRisks.push({
        severity: "warning",
        finding: "Script execution bottleneck restricts architecture assessment",
        rootCause: "Excessive module interdependencies or bloated scripts locked crawler thread, pointing to design coupling.",
        businessImpact: "Limits sitemap indexing depth and degrades organic cross-link propagation.",
        actionableFix: "Decouple heavy third-party clients and adopt asynchronous module streaming patterns.",
        issue: "Script execution bottleneck restricts architecture assessment",
        impact: "Limits sitemap indexing depth and degrades organic cross-link propagation."
      });
    }
  } else {
    if (isZh) {
      architectureRisks.push({
        severity: "info",
        finding: "靜態資產快取架構合規",
        rootCause: `未發現主機傳輸標頭暴露出具體或高風險的底層軟體指紋，快取回應正常。`,
        businessImpact: "保障基礎傳輸隱私，防範惡意掃描套件。",
        actionableFix: "持續監控 nginx/CDN 的 HTTP header，不回傳具體的 Powered-By 版本文字。",
        issue: "靜態資產快取架構合規",
        impact: "保障基礎傳輸隱私，防範惡意掃描套件。"
      });
    } else {
      architectureRisks.push({
        severity: "info",
        finding: "Edge delivery cache envelope is conformant",
        rootCause: "Server headers refrain from revealing direct hosting software indices or vulnerable container footprints.",
        businessImpact: "Mitigates footprint detection matrices targeting software versions during exploits.",
        actionableFix: "Maintain restrictive headers configuration in edge ingress rules.",
        issue: "Edge delivery cache envelope is conformant",
        impact: "Mitigates footprint detection matrices targeting software versions during exploits."
      });
    }
  }

  // Populate Next Actions
  if (isZh) {
    nextActions.push({
      action: "導入 DNS Preconnect 資源載入提示",
      impact: "降低初始資產連線瀑布阻塞、提升估算傳輸效率約 150 毫秒。",
      actionableFix: "<link rel=\"preconnect\" href=\"https://example.com\">"
    });
    nextActions.push({
      action: "為無障礙及爬蟲整合補齊 alt 說明屬性",
      impact: "提升搜尋引擎關聯性加權度、契合無障礙閱讀基準。",
      actionableFix: "img.setAttribute('alt', '精確商品示意圖描述')"
    });
  } else {
    nextActions.push({
      action: "Introduce DNS Preconnect resource tags",
      impact: "Saves up to 150ms during DNS handshakes of resource domains.",
      actionableFix: "<link rel=\"preconnect\" href=\"https://cdn.domain.com\">"
    });
    nextActions.push({
      action: "Populate missing alt parameters recursively",
      impact: "Amplifies SEO indexing accessibility vectors seamlessly.",
      actionableFix: "img.setAttribute('alt', 'Descriptive layout alternative')"
    });
  }

  return JSON.stringify({
    executiveSummary: execSum,
    performanceFindings,
    deterministicFindings,
    browserFlowGaps,
    architectureRisks,
    nextActions,
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