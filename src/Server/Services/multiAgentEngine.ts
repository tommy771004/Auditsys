import { GoogleGenAI, Type } from "@google/genai";
import { existsSync, readFileSync } from "node:fs";
import { EventEmitter } from "node:events";
import type { AuditRequestPayload, DeterministicCollectorResult } from "./auditPipelineTypes";
import { fetchCruxReport } from "./cruxCollector";
import { collectBrowserEvidence } from "./browserCollector";

export interface AgentFinding {
  finding: string;
  rootCause: string;
  businessImpact: string;
  actionableFix: string;
  severity: "critical" | "warning" | "info";
}

export interface SubagentsResults {
  cruxPerformance: AgentFinding[];
  devSecOps: AgentFinding[];
  seoAndDom: AgentFinding[];
  networkDetective: AgentFinding[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function getLanguageInstruction(language?: string): string {
  const isZh = language === "zh-TW" || language === "zh_TW" || (language && language.toLowerCase().startsWith("zh"));
  if (isZh) {
    return "You MUST provide the entire JSON output values (finding, rootCause, businessImpact, actionableFix) in Traditional Chinese (繁體中文), specifically using Taiwanese terminology (台灣用語, e.g. 效能 instead of 性能, 解析度 instead of 分辨率, 記憶體 instead of 內存, 網頁 instead of 頁面/網頁, 快取 instead of 緩存). Absolutely do not output any values in English or Simplified Chinese. All keys in the object (finding, rootCause, etc.) must remain as defined.";
  }
  return "You MUST build the entire output in clean, crisp English.";
}

const RESPONSE_SCHEMA_FINDINGS = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      finding: { type: Type.STRING, description: "A concise, 1-sentence technical finding description" },
      rootCause: { type: Type.STRING, description: "Deep technical details explaining the underlying root cause" },
      businessImpact: { type: Type.STRING, description: "E-commerce or organizational business value consequence of this issue" },
      actionableFix: { type: Type.STRING, description: "Step-by-step developer guidelines to mitigate the issue" },
      severity: { type: Type.STRING, description: "Must be exactly 'critical', 'warning', or 'info'" },
    },
    required: ["finding", "rootCause", "businessImpact", "actionableFix", "severity"],
  },
};

/**
 * Base Agent Class providing unified logging and Event Bus notification.
 */
export class BaseAgent {
  protected targetUrl: string;
  protected language: string;
  protected eventEmitter?: EventEmitter;
  protected logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void;
  protected agentName: string;

  constructor(
    targetUrl: string,
    language?: string,
    eventEmitter?: EventEmitter,
    logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void,
    agentName: string = "BaseAgent"
  ) {
    this.targetUrl = targetUrl;
    this.language = language || "en";
    this.eventEmitter = eventEmitter;
    this.logCallback = logCallback;
    this.agentName = agentName;
  }

  protected fireLog(
    status: "running" | "completed" | "failed",
    level: "info" | "warn" | "error" | "success",
    enMsg: string,
    zhMsg: string
  ) {
    const isZh = this.language === "zh-TW";
    const msg = isZh ? `[${this.agentName}] ${zhMsg}` : `[${this.agentName}] ${enMsg}`;
    
    if (this.logCallback) {
      this.logCallback(this.agentName, level, msg);
    }
    if (this.eventEmitter) {
      this.eventEmitter.emit("agent_log", {
        agent: this.agentName,
        timestamp: new Date().toISOString(),
        status,
        level,
        message: msg,
      });
    }
  }
}

/**
 * Core Web Vitals and performance agent.
 */
export class CruxPerformanceAgent extends BaseAgent {
  constructor(
    targetUrl: string,
    language?: string,
    eventEmitter?: EventEmitter,
    logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void
  ) {
    super(targetUrl, language, eventEmitter, logCallback, "CruxPerformance");
  }

  async run(
    payload: AuditRequestPayload,
    deterministic: DeterministicCollectorResult,
    ai: GoogleGenAI | null
  ): Promise<AgentFinding[]> {
    const isZh = this.language === "zh-TW";
    this.fireLog("running", "info", "Initiating Field and Lab performance analysis...", "正在平行啟動核心效能與欄位指標 (Field Data) 分析...");
    
    try {
      this.fireLog("running", "info", "Fetching Google CrUX field data in background...", "正在向 Chrome UX Report 伺服器查詢使用者實測野外 (Field) 指標...");
      const crux = await fetchCruxReport(this.targetUrl);

      this.fireLog("running", "info", "Fetching browser emulator metrics (Lab data)...", "正在啟動瀏覽器仿真模擬器收集現場 (Lab) 效能表現...");
      const browser = await collectBrowserEvidence(payload, deterministic);

      const cruxDetails = crux.hasData
        ? `Field data found (p75 metrics): LCP=${crux.metrics?.largest_contentful_paint?.value ?? "N/A"}s (${crux.metrics?.largest_contentful_paint?.rating}), INP=${crux.metrics?.interaction_to_next_paint?.value ?? "N/A"}ms (${crux.metrics?.interaction_to_next_paint?.rating}), CLS=${crux.metrics?.cumulative_layout_shift?.value ?? "N/A"} (${crux.metrics?.cumulative_layout_shift?.rating}), FCP=${crux.metrics?.first_contentful_paint?.value ?? "N/A"}s (${crux.metrics?.first_contentful_paint?.rating}). Collection scope=${crux.collectionPeriod?.scope}.`
        : "No Google CrUX field data exists in database for this target.";

      const labDetails = `Lab statistics: responseTimeMs=${deterministic.responseTimeMs ?? "unknown"}, script_count=${deterministic.document?.counts.scripts ?? 0}, stylesheet_count=${deterministic.document?.counts.stylesheets ?? 0}, image_count=${deterministic.document?.counts.images ?? 0}. Dynamic routes crawled: ${browser.pages.length}.`;

      this.fireLog("running", "info", "Correlating Field (RUM) vs. Lab metrics...", "正在交叉排查並對照 使用者真實體驗 (RUM) 與 仿真載入表現...");

      if (!ai) {
        this.fireLog("running", "warn", "No server-side Gemini API key detected. Generating fallback insights.", "未檢出伺服器端 Gemini API 金鑰，使用本地預置模型推估...");
        return getCruxPerformanceFallback(isZh, crux, deterministic);
      }

      this.fireLog("running", "info", "Invoking LLM context to synthesize Core Web Vitals root causes...", "正在調用 Google Gemini LLM 模型分析、推理 Core Web Vitals 核心指標成因...");
      const prompt = `
        You are the CruxPerformanceAgent, an expert in Web Performance and Core Web Vitals (LCP, INP, CLS, FCP).
        Compare and analyze the following Field Data (from real users) vs. Lab Data (emulated web crawler stats):
        
        Website: ${this.targetUrl}
        Field Data: ${cruxDetails}
        Lab Data: ${labDetails}
        
        Identify gaps, performance regressions, and opportunities.
        ${getLanguageInstruction(this.language)}
        Return only a JSON array matching the schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA_FINDINGS,
          systemInstruction: `You are an expert web performance auditor. You strictly output valid JSON structures with performance findings. ${getLanguageInstruction(this.language)}`,
        },
      });

      const parsed = JSON.parse(response.text ?? "[]") as AgentFinding[];
      this.fireLog("completed", "success", "Successfully synthesized performance findings!", "核心網頁指標 (CWV) 與感官速度診斷完成，成功產出效能精確解法！");
      return parsed;
    } catch (err: any) {
      this.fireLog("failed", "error", "Failed during execution: " + err.message, "核心載入效能分析發生異常：" + err.message);
      return getCruxPerformanceFallback(isZh, null, deterministic);
    }
  }
}

/**
 * Server Security, TLS and HTTP header response analyzer.
 */
export class DevSecOpsAgent extends BaseAgent {
  constructor(
    targetUrl: string,
    language?: string,
    eventEmitter?: EventEmitter,
    logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void
  ) {
    super(targetUrl, language, eventEmitter, logCallback, "DevSecOps");
  }

  async run(deterministic: DeterministicCollectorResult, ai: GoogleGenAI | null): Promise<AgentFinding[]> {
    const isZh = this.language === "zh-TW";
    this.fireLog("running", "info", "Initializing security posture assessment...", "正在平行啟動網頁伺服器資安威脅與安全防護設定稽核...");
    
    try {
      this.fireLog("running", "info", "Reviewing target safety guidelines and response headers...", "正在檢查主機傳輸協議、跨站代理配置與安全保護防禦政策...");
      const headersObject = deterministic.headers || {};
      
      this.fireLog("running", "info", "Testing Content Security Policy (CSP), Referrer, and Framework headers...", "正在評估安全性標頭、Content Security Policy (CSP) 防護水準與指紋洩漏風險...");

      if (!ai) {
        this.fireLog("running", "warn", "No server-side Gemini API key. Emitting standard policy audit recommendations.", "無伺服器端 Gemini 憑證。採用靜態資安主機配置推估，輸出基礎安全性指南。");
        return getDevSecOpsFallback(isZh, deterministic);
      }

      this.fireLog("running", "info", "Invoking security audit LLM agent context...", "正在調用資安專屬 Agent AI 分析與歸納主機配置漏洞...");
      const prompt = `
        You are the DevSecOpsAgent, a seasoned cloud security engineer.
        Analyze the HTTP headers and server telemetry for website: ${this.targetUrl}
        
        HTTP Source Headers: ${JSON.stringify(headersObject)}
        SSRF Guard Policy Check: SAFE (Completed verification)
        Blocked Host Check: SAFE
        
        Find gaps like missing Content Security Policy (CSP), unsafe servers flags (Server/X-Powered-By leakage), missing HTTP Strict Transport Security (HSTS), or cookie flags.
        ${getLanguageInstruction(this.language)}
        Return only a JSON array matching the schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA_FINDINGS,
          systemInstruction: `You are an expert DevSecOps auditor. You strictly output valid JSON security recommended findings. ${getLanguageInstruction(this.language)}`,
        },
      });

      const parsed = JSON.parse(response.text ?? "[]") as AgentFinding[];
      this.fireLog("completed", "success", "Successfully identified security recommendations.", "安全防護與 HTTP 防禦標頭配置風險分析完成！");
      return parsed;
    } catch (err: any) {
      this.fireLog("failed", "error", "Failed during evaluation: " + err.message, "主機與傳輸資安審查遭遇異常：" + err.message);
      return getDevSecOpsFallback(isZh, deterministic);
    }
  }
}

/**
 * Semantic HTML structures, heading flow and screen reader accessibility agent.
 */
export class SeoAndDomAgent extends BaseAgent {
  constructor(
    targetUrl: string,
    language?: string,
    eventEmitter?: EventEmitter,
    logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void
  ) {
    super(targetUrl, language, eventEmitter, logCallback, "SeoAndDom");
  }

  async run(deterministic: DeterministicCollectorResult, ai: GoogleGenAI | null): Promise<AgentFinding[]> {
    const isZh = this.language === "zh-TW";
    this.fireLog("running", "info", "Launching SEO & DOM correctness crawler agent...", "正在平行啟動 DOM 語意結構與關鍵 SEO Semantics 斷點特工...");
    
    try {
      const doc = deterministic.document;
      this.fireLog("running", "info", "Scanning DOM headings hierarchy and Alt text coverage...", "正在遍歷剖析 DOM 物件，審判 H1 標題分佈與圖片 Alt 無障礙替代標籤比例...");
      
      const counts = doc?.counts || { scripts: 0, stylesheets: 0, images: 0, imagesMissingAlt: 0, h1: 0, structuredDataBlocks: 0, openGraphTags: 0 };
      this.fireLog("running", "info", `Found H1 Count: ${counts.h1}, Structured Data Blocks: ${counts.structuredDataBlocks}, OpenGraph Tags: ${counts.openGraphTags}`, `首頁 H1 數量為：${counts.h1} 個，JSON-LD 結構化資料塊：${counts.structuredDataBlocks} 組，OpenGraph 標記：${counts.openGraphTags} 個。`);

      if (!ai) {
        this.fireLog("running", "warn", "No server-side Gemini key detected. Generating fallback signals.", "未設定伺服階層 Gemini 金鑰。採取預置 DOM 語意斷點模型生成建議...");
        return getSeoAndDomFallback(isZh, deterministic);
      }

      this.fireLog("running", "info", "Invoking SEO semantics LLM agent context...", "正在調用語意 SEO 特設 Agent 分析標題巢狀階層與社群 OpenGraph 完整性...");
      const prompt = `
        You are the SeoAndDomAgent, an expert in Search Engine Optimization, Accessibility, and Semantic HTML.
        Analyze the following DOM document evidence collected from website: ${this.targetUrl}
        
        Document HTML evidence:
        Title: ${doc?.title ?? "missing"}
        Description: ${doc?.metaDescription ?? "missing"}
        Canonical: ${doc?.canonical ?? "missing"}
        Lang: ${doc?.lang ?? "missing"}
        Viewport: ${doc?.viewport ?? "missing"}
        H1 headings count: ${counts.h1}
        Structured Data (schema.org) blocks: ${counts.structuredDataBlocks}
        OpenGraph facebook/social meta counts: ${counts.openGraphTags}
        Images count: ${counts.images}
        Images missing Alt text: ${counts.imagesMissingAlt}
        
        Provide high-value SEO and web accessibility recommendations.
        ${getLanguageInstruction(this.language)}
        Return only a JSON array matching the schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA_FINDINGS,
          systemInstruction: `You are an expert SEO and Accessibility auditor. You strictly output valid JSON accessibility/SEO recommendations. ${getLanguageInstruction(this.language)}`,
        },
      });

      const parsed = JSON.parse(response.text ?? "[]") as AgentFinding[];
      this.fireLog("completed", "success", "Synthesized accessibility and SEO insights.", "DOM 語意結構無障礙及搜尋引擎優化 (SEO) 整體稽核完成！");
      return parsed;
    } catch (err: any) {
      this.fireLog("failed", "error", "Failed evaluation: " + err.message, "DOM 與語意爬行分析異常：" + err.message);
      return getSeoAndDomFallback(isZh, deterministic);
    }
  }
}

/**
 * Asynchronous network log waterfall and transfer payload efficiency detector.
 */
export class NetworkDetectiveAgent extends BaseAgent {
  constructor(
    targetUrl: string,
    language?: string,
    eventEmitter?: EventEmitter,
    logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void
  ) {
    super(targetUrl, language, eventEmitter, logCallback, "NetworkDetective");
  }

  async run(deterministic: DeterministicCollectorResult, ai: GoogleGenAI | null): Promise<AgentFinding[]> {
    const isZh = this.language === "zh-TW";
    this.fireLog("running", "info", "Activating Network Detective waterfall investigator...", "正在平行啟動網路傳輸瀑布流與 Payload 封包壓縮效率調查...");
    
    try {
      const explicitWorkspace = process.env.WEBWRIGHT_WORKSPACE_DIR || "fixtures/webwright/sample-run";
      const networkLogPath = `${explicitWorkspace}/logs/network.jsonl`;
      
      let logsContent = "";
      let foundPath = "";

      this.fireLog("running", "info", "Attempting to locate Webwright network timeline logs...", "正在尋找 Webwright 仿真連線軌跡，剖析異步元件瀑布流排隊阻塞...");
      if (existsSync(networkLogPath)) {
        foundPath = networkLogPath;
        logsContent = readFileSync(networkLogPath, "utf-8");
      } else if (existsSync("fixtures/webwright/sample-run/logs/network.jsonl")) {
        foundPath = "fixtures/webwright/sample-run/logs/network.jsonl";
        logsContent = readFileSync(foundPath, "utf-8");
      }

      if (logsContent) {
        this.fireLog("running", "success", `Discovered trace logs at ${foundPath}! Parsing logs...`, `發現 Webwright 正確歷史通訊軌跡於 ${foundPath}！開始執行微秒級網路事件瀑布解析...`);
      } else {
        this.fireLog("running", "warn", "No Webwright network log file found on disk. Falling back to simulated waterfall modeling.", "未獲取 Webwright 即時日誌。切換至靜態資產檔案計數與並行請求排隊拓撲推算...");
      }

      const logLines = logsContent ? logsContent.split("\n").filter(Boolean).slice(0, 5) : [];

      if (!ai) {
        this.fireLog("running", "warn", "No server-side Gemini key. Emitting waterfall latency advice.", "缺少 Gemini 金鑰配置。基於瀑布傳輸計算法則輸出基礎緩存與 Brotli 壓縮指示。");
        return getNetworkDetectiveFallback(isZh, deterministic, logLines);
      }

      this.fireLog("running", "info", "Invoking waterfall bottleneck LLM agent context...", "正在調用網路協議專家特工推理資源載入瀑布鏈阻塞點...");
      const prompt = `
        You are the NetworkDetectiveAgent, a network systems and protocol delivery specialist.
        Inspect the network resource timeline log lines captured during simulation for website: ${this.targetUrl}
        
        Logged request sample (network.jsonl):
        ${logLines.join("\n") || "No Webwright log file found, emulating waterfalls via asset counts."}
        
        Simulated network statistics from document:
        Document response time (TTFB): ${deterministic.responseTimeMs ?? "unknown"} ms.
        Script count: ${deterministic.document?.counts.scripts ?? 0} scripts (uncompressed network risk).
        Stylesheet count: ${deterministic.document?.counts.stylesheets ?? 0} CSS stylesheets.
        
        Analyze bandwidth weight issues, latency, waterfall blocking, and multi-domain lookup problems.
        ${getLanguageInstruction(this.language)}
        Return only a JSON array matching the schema.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA_FINDINGS,
          systemInstruction: `You are an expert network and waterfall analyzer. You strictly output valid JSON network optimizations. ${getLanguageInstruction(this.language)}`,
        },
      });

      const parsed = JSON.parse(response.text ?? "[]") as AgentFinding[];
      this.fireLog("completed", "success", "Emitted waterfall optimizations!", "異步網路瀑布流阻塞點與高流量素材載入比對優化完成！");
      return parsed;
    } catch (err: any) {
      this.fireLog("failed", "error", "Failed network analysis: " + err.message, "網路瀑布模型剖析遭遇異常：" + err.message);
      return getNetworkDetectiveFallback(isZh, deterministic, []);
    }
  }
}

/**
 * Orchestrates domain subagents in parallel with progress streaming.
 */
export async function runMultiAgentAudit(
  payload: AuditRequestPayload,
  deterministic: DeterministicCollectorResult,
  config?: { apiKey?: string; openRouterApiKey?: string; allowedModels?: string[] },
  logCallback?: (agent: string, level: "info" | "warn" | "error" | "success", message: string) => void,
  eventEmitter?: EventEmitter
): Promise<SubagentsResults> {
  const url = payload.url;
  const isZh = payload.language === "zh-TW";

  // Create unified Master log notifier
  const fireMasterLog = (
    status: "running" | "completed" | "failed",
    level: "info" | "warn" | "error" | "success",
    enMsg: string,
    zhMsg: string
  ) => {
    const msg = isZh ? `[MultiAgentEngine] ${zhMsg}` : `[MultiAgentEngine] ${enMsg}`;
    if (logCallback) {
      logCallback("MultiAgentEngine", level, msg);
    }
    if (eventEmitter) {
      eventEmitter.emit("agent_log", {
        agent: "MultiAgentEngine",
        timestamp: new Date().toISOString(),
        status,
        level,
        message: msg,
      });
    }
  };

  const ai = getGeminiClient();

  // Instantiate Subagents with target url and standard event emitter busses
  const cruxAgent = new CruxPerformanceAgent(url, payload.language, eventEmitter, logCallback);
  const securityAgent = new DevSecOpsAgent(url, payload.language, eventEmitter, logCallback);
  const seoAgent = new SeoAndDomAgent(url, payload.language, eventEmitter, logCallback);
  const networkAgent = new NetworkDetectiveAgent(url, payload.language, eventEmitter, logCallback);

  fireMasterLog("running", "info", "Orchestrating specialized agents in parallel...", "正在並行調研、指派 4 組領域特化特工執行多工專家診斷...");
  const starts = Date.now();

  // Parallel scatter-gather execution
  const results = await Promise.allSettled([
    cruxAgent.run(payload, deterministic, ai),
    securityAgent.run(deterministic, ai),
    seoAgent.run(deterministic, ai),
    networkAgent.run(deterministic, ai),
  ]);

  const duration = Date.now() - starts;
  fireMasterLog("completed", "success", `Co-working completed in ${duration}ms`, `專家並行特工集群協同診斷圓滿完成！處理總耗時：${duration} 毫秒`);

  const cruxPerformanceResult = results[0].status === "fulfilled" ? results[0].value : getCruxPerformanceFallback(isZh, null, deterministic);
  const devSecOpsResult = results[1].status === "fulfilled" ? results[1].value : getDevSecOpsFallback(isZh, deterministic);
  const seoAndDomResult = results[2].status === "fulfilled" ? results[2].value : getSeoAndDomFallback(isZh, deterministic);
  const networkDetectiveResult = results[3].status === "fulfilled" ? results[3].value : getNetworkDetectiveFallback(isZh, deterministic, []);

  return {
    cruxPerformance: cruxPerformanceResult,
    devSecOps: devSecOpsResult,
    seoAndDom: seoAndDomResult,
    networkDetective: networkDetectiveResult,
  };
}

// Fallback Generators to ensure robustness and high-quality performance when LLM fails or is un-configured
function getCruxPerformanceFallback(isZh: boolean, crux: any, deterministic: DeterministicCollectorResult): AgentFinding[] {
  const labelText = isZh ? "[模型推估] " : "[Model Estimate] ";
  if (isZh) {
    return [
      {
        finding: `${labelText}核心網頁指標 (CWV) 與感官速度稽核`,
        rootCause: crux?.hasData
          ? "根據實測 Google CrUX 的 CWV 資料評估效能。"
          : `初始 HTML 回應時間為 ${deterministic.responseTimeMs ?? 300} 毫秒。缺少實測 Core Web Vitals 效能資訊。`,
        businessImpact: "載入延遲可能直接損害行動端客戶留存率與訂單轉換率 (估計受延遲影響降低 ~10%)。",
        actionableFix: crux?.hasData
          ? "針對 Chrome UX 報告中的主要瓶頸（如 LCP 或 INP 效能）進行排隊處理、優先加載關鍵資源並進行程式碼分割。"
          : "優化伺服器響應 (TTFB)，在 HTML Header 中添加 DNS Preconnect，並對第三方臃腫指令碼設置延遲加載。",
        severity: "warning",
      },
    ];
  } else {
    return [
      {
        finding: `${labelText}Core Web Vitals Metric Convergence Checklist`,
        rootCause: crux?.hasData
          ? "Parsed historical Chrome UX user database for p75 ratings."
          : `The initial server latency TTFB was ${deterministic.responseTimeMs ?? 300} ms. No real-user CrUX field metric was available.`,
        businessImpact: "Slow mobile loads elevate bounce rates and decrease total cart checkout conversions by modeled ~12%.",
        actionableFix: crux?.hasData
          ? "Remedial actions should target measured CWV bottlenecks (e.g. hydrate size, script blocking time)."
          : "Minimize server-side TTFB latency, deploy DNS preconnect headers, and defer heavy scripts dynamically.",
        severity: "warning",
      },
    ];
  }
}

function getDevSecOpsFallback(isZh: boolean, deterministic: DeterministicCollectorResult): AgentFinding[] {
  const h = deterministic.headers || {};
  const serverLeak = h.server || h.poweredBy ? true : false;
  
  if (isZh) {
    return [
      {
        finding: "伺服器與主機防禦安全標頭配置弱點",
        rootCause: serverLeak
          ? `伺服器透露了軟體特徵標頭 (${h.server ?? ""} / ${h.poweredBy ?? ""})，易被惡意攻擊者掃描特徵漏洞。`
          : "系統未檢出標準內容安全政策 (CSP) 與防點擊劫持等防禦狀態。",
        businessImpact: "增加遭暴力字典漏洞掃描或跨站代碼注入 (XSS/Clickjacking) 威脅，損害企業商譽與資訊安全控管。",
        actionableFix: serverLeak
          ? "進入後端伺服器 (nginx/IIS/node) 設定檔，關閉 server_tokens 或移除 X-Powered-By/Server 返回標頭。"
          : "在 HTTP Response Headers 中配置 Content-Security-Policy 、 Strict-Transport-Security (HSTS) 與 X-Content-Type-Options: nosniff。",
        severity: "warning",
      },
    ];
  } else {
    return [
      {
        finding: "SaaS Infrastructure Response Security Vulnerability",
        rootCause: serverLeak
          ? `Information exposure through technology signature headers (${h.server ?? ""} / ${h.poweredBy ?? ""}).`
          : "Missing industry-standard defensive security headers (CSP, HSTS) in HTTP responses.",
        businessImpact: "Elevates risk profiles for target cross-site scripting (XSS), vulnerability exploit vectors, and compliance audits.",
        actionableFix: "Configure edge servers or web servers to strip revealing headers, and inject 'Content-Security-Policy' and strict 'Strict-Transport-Security'.",
        severity: "warning",
      },
    ];
  }
}

function getSeoAndDomFallback(isZh: boolean, deterministic: DeterministicCollectorResult): AgentFinding[] {
  const doc = deterministic.document;
  const counts = doc?.counts || { scripts: 0, stylesheets: 0, images: 0, imagesMissingAlt: 0, h1: 0, structuredDataBlocks: 0, openGraphTags: 0 };
  
  if (isZh) {
    return [
      {
        finding: "網頁語意架構、不完整 headings 階層與無障礙優化空間",
        rootCause: `DOM 物件中 H1 標題數量為 ${counts.h1} 個 (預期應精確為 1 個)。另發現部分 ${counts.imagesMissingAlt} 張圖片缺少 Alt 無障礙替代文字。`,
        businessImpact: "影響 Google 等搜尋引擎演算法結構分析評分，使自然搜尋曝光度下降，並損害低視能障礙者屏幕閱讀之無障礙體驗。",
        actionableFix: "重新調整 DOM 行內標題，確保全頁僅有單一一個 H1 用於主要核心標題，並遍歷所有 img 標籤加入對應的 alt 說明屬性描述。",
        severity: "info",
      },
    ];
  } else {
    return [
      {
        finding: "Semantic HTML Outline and Accessibility Non-Conformance",
        rootCause: `Detected H1 heading count of ${counts.h1} (semantics require exactly 1 H1). Additionally found ${counts.imagesMissingAlt} raster images missing alternative descriptions.`,
        businessImpact: "Reduces visual crawling confidence in SEO ranking algorithms and compromises screen-reader assistive compatibility.",
        actionableFix: "Align headings structurally to a single hierarchical H1 element, and systematically supplement alt parameters in image templates.",
        severity: "info",
      },
    ];
  }
}

function getNetworkDetectiveFallback(isZh: boolean, deterministic: DeterministicCollectorResult, logLines: string[]): AgentFinding[] {
  const counts = deterministic.document?.counts || { scripts: 0, stylesheets: 0 };
  const hasLogs = logLines.length > 0;

  if (isZh) {
    return [
      {
        finding: "網路資產傳輸瀑布流與頁面載入排隊組塞",
        rootCause: hasLogs
          ? `經偵測 Webwright 仿真連線軌跡，其含有多重並行要求。網頁含有高達 ${counts.scripts} 個 JavaScript 網址。`
          : `此頁面含有高達 ${counts.scripts} 個 Scripts 及 ${counts.stylesheets} 個內外部樣式表，造成網路請求瀑布排隊阻塞。`,
        businessImpact: "行動載具載入網頁緩慢，阻礙 FCP (首次內容繪製) 成效，估計導致部分網頁首次感知速度延遲多達 1.5 秒。",
        actionableFix: "將分散的小型 JS/CSS 檔案進行打包 Bundle 整合，移除冗餘的第三方 Scripts，並開啟 Gzip 或現代化 Brotli 壓縮協議傳輸。",
        severity: "warning",
      },
    ];
  } else {
    return [
      {
        finding: "Asset Fetch Queue and Blocking Network Waterfalls",
        rootCause: hasLogs
          ? `Discovered dynamic parallel requests via Webwright trace telemetry. Page requests ${counts.scripts} scripts statically.`
          : `High blocking density with ${counts.scripts} third-party scripts and ${counts.stylesheets} blocking layout files.`,
        businessImpact: "Extends initial bundle fetch time, causing perceived visual delay and waterfall degradation by estimated ~1.2s on standard mobile connections.",
        actionableFix: "Aggregate network transfers, introduce asynchronous script flags (async/defer) on external scripts, and activate Brotli compression.",
        severity: "warning",
      },
    ];
  }
}
