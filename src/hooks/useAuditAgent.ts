import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { AuditIntelligenceResult, BrowserCollectorTimelineStep } from "../Server/Services/auditPipelineTypes";
import { postAuditRequest } from "../services/auditApi";
import { saveLatestAuditReport } from "../services/auditReportStore";
import type { AgentPhase, AgentReportSource, MemoryUpdate, Subagent, ToolCall, ToolCallArgs, ToolCallStatus, UseAgentResult } from "../types/agent.types";

interface MockSubagentDefinition {
  id: string;
  roleKey: string;
  toolName: string;
  args: ToolCallArgs;
  logKeys: string[];
  intervalMs: number;
}

type AgentWorkflowEvent =
  | { type: "phase"; phase: AgentPhase }
  | { type: "spawn"; subagents: Subagent[]; toolCalls: ToolCall[]; plan: MockSubagentDefinition[] }
  | { type: "memory"; update: MemoryUpdate }
  | { type: "report"; content: string };

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function buildMockPlan(targetUrl: string): MockSubagentDefinition[] {
  return [
    {
      id: "frontend-speed",
      roleKey: "auditConsole.mock.subagents.frontend.role",
      toolName: "dom_probe",
      args: {
        targetUrl,
        probe: "dom-depth",
        viewport: "1440x960",
      },
      logKeys: [
        "auditConsole.mock.logs.frontend.queue",
        "auditConsole.mock.logs.frontend.dom",
        "auditConsole.mock.logs.frontend.hydration",
        "auditConsole.mock.logs.frontend.summary",
      ],
      intervalMs: 420,
    },
    {
      id: "api-latency",
      roleKey: "auditConsole.mock.subagents.backend.role",
      toolName: "api_latency",
      args: {
        targetUrl,
        probe: "gateway-latency",
        samples: 3,
      },
      logKeys: [
        "auditConsole.mock.logs.backend.queue",
        "auditConsole.mock.logs.backend.gateway",
        "auditConsole.mock.logs.backend.waterfall",
        "auditConsole.mock.logs.backend.summary",
      ],
      intervalMs: 520,
    },
    {
      id: "a11y-scanner",
      roleKey: "auditConsole.mock.subagents.a11y.role",
      toolName: "alt_inspector",
      args: {
        targetUrl,
        focus: "missing-alt-text",
      },
      logKeys: [
        "auditConsole.mock.logs.a11y.queue",
        "auditConsole.mock.logs.a11y.scan",
        "auditConsole.mock.logs.a11y.summary",
      ],
      intervalMs: 480,
    },
    {
      id: "memory-synth",
      roleKey: "auditConsole.mock.subagents.architecture.role",
      toolName: "memory_synth",
      args: {
        targetUrl,
        focus: "runtime-gates",
        memoryScope: "long-term",
      },
      logKeys: [
        "auditConsole.mock.logs.architecture.queue",
        "auditConsole.mock.logs.architecture.paths",
        "auditConsole.mock.logs.architecture.memory",
        "auditConsole.mock.logs.architecture.summary",
      ],
      intervalMs: 610,
    },
  ];
}

function createSubagents(plan: MockSubagentDefinition[], t: TFunction): Subagent[] {
  return plan.map((item) => ({
    id: item.id,
    role: t(item.roleKey),
    status: "pending",
    executionTimeMs: 0,
  }));
}

function createToolCalls(plan: MockSubagentDefinition[]): ToolCall[] {
  return plan.map((item) => ({
    id: `${item.id}-tool`,
    agentId: item.id,
    name: item.toolName,
    args: item.args,
    status: "running",
    logs: [],
  }));
}

function buildMemoryUpdate(t: TFunction): MemoryUpdate {
  return {
    key: t("auditConsole.mock.memory.key"),
    fact: t("auditConsole.mock.memory.fact"),
    type: "architecture",
  };
}

function getPrimaryRuntimeGate(report: AuditIntelligenceResult): BrowserCollectorTimelineStep | undefined {
  return report.evidence.browser.timeline?.find((step) => step.status === "blocked")
    ?? report.evidence.browser.timeline?.find((step) => step.status === "partial" || step.status === "not_run");
}

function buildLiveMemoryUpdate(report: AuditIntelligenceResult, t: TFunction): MemoryUpdate {
  const primaryRuntimeGate = getPrimaryRuntimeGate(report);

  if (primaryRuntimeGate) {
    return {
      key: "runtime-gate",
      fact: primaryRuntimeGate.detail
        ? t("auditConsole.live.memory.runtimeGateWithDetail", {
            step: primaryRuntimeGate.label,
            status: t(`report.runtime.status.${primaryRuntimeGate.status}`),
            detail: primaryRuntimeGate.detail,
          })
        : t("auditConsole.live.memory.runtimeGate", {
            step: primaryRuntimeGate.label,
            status: t(`report.runtime.status.${primaryRuntimeGate.status}`),
          }),
      type: "architecture",
    };
  }

  return buildMemoryUpdate(t);
}

export function buildLiveMemoryUpdates(report: AuditIntelligenceResult, t: TFunction): MemoryUpdate[] {
  const providerLabel = report.model ? `${report.provider} / ${report.model}` : report.provider;
  const browserModeLabel = t(`report.runtime.modes.${report.evidence.browser.mode}`);
  const updates: MemoryUpdate[] = [];

  const primaryRuntimeGateUpdate = buildLiveMemoryUpdate(report, t);

  if (primaryRuntimeGateUpdate.fact !== buildMemoryUpdate(t).fact || primaryRuntimeGateUpdate.key !== buildMemoryUpdate(t).key) {
    updates.push(primaryRuntimeGateUpdate);
  }

  updates.push({
    key: "audit-pipeline",
    fact: t("auditConsole.live.memory.pipeline", {
      provider: providerLabel,
      mode: browserModeLabel,
    }),
    type: "tech_stack",
  });

  return updates.length > 0 ? updates : [buildMemoryUpdate(t)];
}

function buildLiveToolLogMap(report: AuditIntelligenceResult, t: TFunction): Record<string, string[]> {
  const deterministic = report.evidence.deterministic;
  const browser = report.evidence.browser;
  const document = deterministic.document;
  const latestFlow = browser.flows[browser.flows.length - 1];
  const primaryRuntimeGate = getPrimaryRuntimeGate(report);
  const notAvailableLabel = t("auditConsole.live.logs.shared.notAvailable");

  return {
    "frontend-speed-tool": [
      typeof deterministic.responseTimeMs === "number"
        ? t("auditConsole.live.logs.frontend.responseTime", {
            value: deterministic.responseTimeMs,
          })
        : t("auditConsole.live.logs.frontend.responseTimeMissing"),
      t("auditConsole.live.logs.frontend.documentSignals", {
        scripts: document?.counts.scripts ?? 0,
        stylesheets: document?.counts.stylesheets ?? 0,
        images: document?.counts.images ?? 0,
      }),
      primaryRuntimeGate
        ? primaryRuntimeGate.detail
          ? t("auditConsole.live.logs.frontend.runtimeGateWithDetail", {
              step: primaryRuntimeGate.label,
              status: t(`report.runtime.status.${primaryRuntimeGate.status}`),
              detail: primaryRuntimeGate.detail,
            })
          : t("auditConsole.live.logs.frontend.runtimeGate", {
              step: primaryRuntimeGate.label,
              status: t(`report.runtime.status.${primaryRuntimeGate.status}`),
            })
        : t("auditConsole.live.logs.frontend.runtimeGateMissing"),
    ],
    "api-latency-tool": [
      t("auditConsole.live.logs.backend.statusCode", {
        value: deterministic.statusCode ?? notAvailableLabel,
        contentType: deterministic.contentType ?? notAvailableLabel,
      }),
      t("auditConsole.live.logs.backend.cacheControl", {
        value: deterministic.headers?.cacheControl ?? notAvailableLabel,
      }),
      t("auditConsole.live.logs.backend.serverHeader", {
        server: deterministic.headers?.server ?? notAvailableLabel,
        poweredBy: deterministic.headers?.poweredBy ?? notAvailableLabel,
      }),
    ],
    "a11y-scanner-tool": [
      t("auditConsole.live.logs.a11y.imageCount", {
        images: document?.counts.images ?? 0,
        missingAlt: document?.counts.imagesMissingAlt ?? 0,
      }),
      (document?.counts.imagesMissingAlt ?? 0) > 0
        ? t("auditConsole.live.logs.a11y.missingAltFound")
        : t("auditConsole.live.logs.a11y.allAltPresent"),
      t("auditConsole.live.logs.a11y.domInspectorUpdated")
    ],
    "memory-synth-tool": [
      t("auditConsole.live.logs.architecture.browserStatus", {
        status: t(`report.runtime.status.${browser.status}`),
        mode: t(`report.runtime.modes.${browser.mode}`),
      }),
      latestFlow
        ? t("auditConsole.live.logs.architecture.flow", {
            label: latestFlow.label,
            status: t(`report.runtime.status.${latestFlow.status}`),
          })
        : t("auditConsole.live.logs.architecture.flowMissing"),
      report.summary?.trim()
        ? t("auditConsole.live.logs.architecture.summary")
        : t("auditConsole.live.logs.architecture.summaryMissing"),
    ],
  };
}

function mergeToolCallsWithLiveLogs(toolCalls: ToolCall[], report: AuditIntelligenceResult, t: TFunction): ToolCall[] {
  const liveToolLogMap = buildLiveToolLogMap(report, t);

  return toolCalls.map((toolCall) => {
    const nextLogs = liveToolLogMap[toolCall.id];

    if (!nextLogs || nextLogs.length === 0) {
      return toolCall;
    }

    const existingLogs = new Set(toolCall.logs);
    const mergedLogs = [...toolCall.logs, ...nextLogs.filter((log) => !existingLogs.has(log))];

    return {
      ...toolCall,
      status: "success",
      logs: mergedLogs,
    };
  });
}

export function buildLiveReportContent(report: AuditIntelligenceResult, t: TFunction): string {
  // Return pure JSON so the console can parse and render the beautiful UI
  return report.summary?.trim() || "{}";
}

export interface CustomSubagentDef {
  id: string;
  role: string;
  toolName: string;
  args: Record<string, any>;
  logKeys: string[];
  intervalMs: number;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; 
  }
  return Math.abs(hash);
}

function buildReportContent(targetUrl: string, t: TFunction, hitlInstructions?: string): string {
  const isZh = t("auditConsole.mock.report.title").includes("報告") || t("auditConsole.mock.report.lead").includes("目標網址");
  
  const hash = hashCode(targetUrl);
  
  const allDeterministicFindings = [
    {
      issue: isZh ? "伺服器 HSTS 傳輸金鑰防禦缺失" : "Server HSTS Telemetry Key Deferral",
      impact: isZh ? "系統缺少 Strict-Transport-Security (HSTS) 防禦配置，可能使敏感傳輸面臨連線劫持風險。" : "Absence of Strict-Transport-Security constraints exposes connection handshakes to intermediate routing interception.",
      severity: "High"
    },
    {
      issue: isZh ? "SEO 解析：缺少結構化資料與 Open Graph 標籤" : "SEO Analysis: Missing JSON-LD & Open Graph Metadata",
      impact: isZh ? "頁面缺乏 JSON-LD 結構化資料庫與 OG 標籤，搜尋引擎無法精確擷取特徵片段，降低社群分享轉化率及 SERP 點擊率。" : "Missing JSON-LD structured data and Open Graph tags impair search engine feature extraction, reducing social sharing conversions and SERP visibility.",
      severity: "High"
    },
    {
      issue: isZh ? "SEO 深度優化：標題標籤與 Canonical 規範連結未定" : "SEO Discovery: Missing Canonical Links & Semantic Title Hierarchy",
      impact: isZh ? "因缺乏 Canonical 標籤與不連貫的 H1-H3 標籤結構，導致爬蟲檢索時可能會發生內容重複懲罰(Duplicate Content)，且未優化的 Metadata 將影響整體排名韌性。" : "Absence of canonical tags and broken H1-H3 semantic hierarchies exposes the site to duplicate content penalties and degraded ranking resilience during crawler indexing.",
      severity: "Medium"
    },
    {
      issue: isZh ? "資源壓縮快取效能待加強" : "Resource Brotli Cache Optimization Gaps",
      impact: isZh ? "文字腳本與樣式檔案未啟用 Brotli 高壓縮規則，增加了連線擁塞時的 TTFB 載入時長。" : "Payload scripts lack Gzip/Brotli compression tags, degrading optimal rendering during intense bandwidth congestion.",
      severity: "Medium"
    },
    {
      issue: isZh ? "過度使用阻塞渲染的腳本" : "Render-Blocking Scripts Detected",
      impact: isZh ? "主頁面載入時有多個同步腳本阻擋了 HTML 的解析，導致首圖渲染時間過長。" : "Multiple synchronous scripts block the critical rendering path, increasing LCP.",
      severity: "High"
    },
    {
      issue: isZh ? "CORS 跨來源資源共用設定過度寬鬆" : "Overly Permissive CORS Policies",
      impact: isZh ? "API 端點的 CORS 標頭允許了任意來源 (Access-Control-Allow-Origin: *)，可能導致資料外洩風險。" : "API endpoints allow arbitrary origins (*), exposing potential data leakage to unauthorized third parties.",
      severity: "High"
    }
  ];

  const allBrowserFlowGaps = [
    {
      issue: isZh ? "動態部分重繪與生命週期延遲" : "Dynamic Lifecycle Reflow Hydration Gaps",
      impact: isZh ? "客戶端主 Bundle 檔未啟用非同步延遲載入，核心互動按鍵在首次繪製完成前無法回應點擊。" : "Client-side hydrate bundles block single-threaded processors, preventing key buttons from early click registration.",
      severity: "Medium"
    },
    {
      issue: isZh ? "首屏畫面版框位移 (CLS)" : "Cumulative Layout Shift (CLS) on Render",
      impact: isZh ? "橫幅圖片未預設寬高佔位符，導致載入完成後會將下方文字推擠，影響使用者點擊體驗。" : "Hero images lack explicit dimensions, causing layout thrashing after payload delivery.",
      severity: "Medium"
    },
    {
      issue: isZh ? "無障礙焦點陷阱 (Focus Trap)" : "Accessibility Keyboard Focus Trap",
      impact: isZh ? "導覽列開啟後，鍵盤操作無法跳出選單區域，影響依賴鍵盤導覽的使用者。" : "Keyboard navigation becomes locked within the expanded navigation drawer.",
      severity: "High"
    }
  ];

  // Pick pseudo-random issues based on URL hash
  const detIndex1 = hash % allDeterministicFindings.length;
  const detIndex2 = (hash + 1) % allDeterministicFindings.length;
  const bfIndex = hash % allBrowserFlowGaps.length;

  // Ensure unique picks if array is large enough
  const selectedDet = detIndex1 !== detIndex2 ? [allDeterministicFindings[detIndex1], allDeterministicFindings[detIndex2]] : [allDeterministicFindings[detIndex1]];
  
  const baseJson = {
    executiveSummary: hitlInstructions 
      ? (isZh 
          ? `[人工介入方針已整合] 針對目標網址 ${targetUrl} 的稽核任務。在引入人類修復指南（「${hitlInstructions}」）後，視覺化流程已更新示意跑道，並接續等待後端證據校驗。`
          : `[Human Guidance Integrated] Updated the visual audit workflow for ${targetUrl} with handoff instruction: "${hitlInstructions}". The UI lanes now reflect the mitigation path while backend evidence remains authoritative.`)
      : (isZh
          ? `[稽核流程視覺化完成] 控制台已針對目標對象 ${targetUrl} 呈現多跑道分析流程。偵測到部分與架構相容性、標頭安全防禦、以及前端效能相關的問題。`
          : `[Audit Workflow Visualization Complete] The console completed a multi-lane audit visualization for target: ${targetUrl}. Discovered potential optimization gaps across transmission layers, document templates, and performance bounds.`),
    deterministicFindings: selectedDet,
    browserFlowGaps: [allBrowserFlowGaps[bfIndex]],
    architectureRisks: [
      {
        issue: isZh ? "不被信任的動態與沙箱繞過保護" : "Sandbox Untrusted Script Boundary Isolation Gaps",
        impact: hitlInstructions 
          ? (isZh 
              ? `已註冊人工專屬編譯指令：「${hitlInstructions}」。免疫防護規則已動態回寫入沙箱，原高風險現已安全排除。`
              : `Registered HITL custom override action: "${hitlInstructions}". Safe-compile parameters committed to Sandboxed Container context.`)
          : (isZh 
              ? "稽核引擎偵測到未經防禦隔離的程式碼段，在未配置 custom whitelists 時可能觸發環境安全例外。" 
              : "Standard policies enforce rigid container limits. Live crawlers attempting page reads may hit policy rule exceptions."),
        severity: hitlInstructions ? "Low" : "High"
      }
    ],
    nextActions: [
      {
        action: hitlInstructions 
          ? (isZh ? `依據方針重新部署編譯任務：「${hitlInstructions}」` : `Redeploy following policy task: "${hitlInstructions}"`)
          : (isZh ? "配置邊緣安全標頭 (CSP、HSTS、CORS)" : "Configure edge defense headers (CSP, HSTS)"),
        impact: isZh ? "保障傳輸協議安全性，阻絕跨站腳本與中間人篡改" : "Validates TLS bindings and blocks cross-site script pollution"
      },
      {
        action: isZh ? "保存防禦規則快照與飛輪紀錄" : "Save Guardrail Rule Snapshot",
        impact: isZh ? "保留後續修復與驗證可引用的規則脈絡" : "Preserves rule context that future remediation and verification can reference"
      }
    ]
  };

  return JSON.stringify(baseJson, null, 2);
}

async function* createAgentWorkflow(
  targetUrl: string, 
  t: TFunction,
  enabledAgentIds: string[],
  customAgentDefs: CustomSubagentDef[],
  hitlInstructions?: string
): AsyncGenerator<AgentWorkflowEvent> {
  const basePlan = buildMockPlan(targetUrl);
  const plan = basePlan
    .filter((item) => enabledAgentIds.includes(item.id))
    .concat(
      customAgentDefs.map((c) => ({
        id: c.id,
        roleKey: c.role,
        toolName: c.toolName,
        args: c.args,
        logKeys: c.logKeys,
        intervalMs: c.intervalMs,
      }))
    );

  yield { type: "phase", phase: "analyzing_context" };
  await delay(650);

  yield { type: "phase", phase: "spawning_subagents" };
  await delay(1000);

  yield {
    type: "spawn",
    subagents: createSubagents(plan, t),
    toolCalls: createToolCalls(plan),
    plan,
  };
  await delay(180);

  yield { type: "phase", phase: "parallel_execution" };
  await delay(120);

  yield { type: "phase", phase: "synthesizing_memory" };
  await delay(260);

  yield { 
    type: "memory", 
    update: hitlInstructions 
      ? {
          key: "Human Intervene Ruleset",
          fact: t("auditConsole.hitl.memoryApplied", {
            defaultValue: `Manual override resolved. Human policy compiled: "${hitlInstructions}". Safe sandbox locked.`
          }),
          type: "tech_stack"
        }
      : buildMemoryUpdate(t) 
  };
  await delay(760);

  yield { type: "phase", phase: "streaming_report" };
  await delay(160);

  yield { type: "report", content: buildReportContent(targetUrl, t, hitlInstructions) };
  await delay(120);

  yield { type: "phase", phase: "complete" };
}

export function useAuditAgent(): UseAgentResult {
  const { t, i18n } = useTranslation();
  const [phase, setPhase] = useState<AgentPhase>("idle");
  const [targetUrl, setTargetUrl] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [subagents, setSubagents] = useState<Subagent[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [memoryUpdates, setMemoryUpdates] = useState<MemoryUpdate[]>([]);
  const [activeMemoryUpdate, setActiveMemoryUpdate] = useState<MemoryUpdate | null>(null);
  const [streamedReport, setStreamedReport] = useState<string>("");
  const [latestAuditResult, setLatestAuditResult] = useState<AuditIntelligenceResult | null>(null);
  const [reportSource, setReportSource] = useState<AgentReportSource | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Dynamic extensions for HITL, Swarm Router, and Flywheel Engine
  const [enabledAgentIds, setEnabledAgentIds] = useState<string[]>([
    "frontend-speed",
    "api-latency",
    "a11y-scanner",
    "memory-synth"
  ]);
  const [customAgentDefs, setCustomAgentDefs] = useState<CustomSubagentDef[]>([]);
  const [hitlInstructions, setHitlInstructions] = useState<string>("");
  const [immunizedRules, setImmunizedRules] = useState<string[]>([]);

  const addCustomAgent = (role: string, toolName: string) => {
    const id = `custom-agent-${Date.now()}`;
    const newAgent: CustomSubagentDef = {
      id,
      role,
      toolName,
      args: { target: "custom" },
      logKeys: [
        `Initializing custom microservice agent: ${role}.`,
        `Analyzing site infrastructure with modular dynamic tool: ${toolName}.`,
        `Synthesizing telemetry data stream. Checks passed.`,
        `Task completed. Integration metrics compiled successfully.`
      ],
      intervalMs: 500,
    };
    setCustomAgentDefs((prev) => [...prev, newAgent]);
  };

  const intervalIdsRef = useRef<number[]>([]);
  const memoryBadgeTimeoutRef = useRef<number | null>(null);
  const runTokenRef = useRef<number>(0);

  const clearRuntimeHandles = () => {
    intervalIdsRef.current.forEach((intervalId) => {
      window.clearInterval(intervalId);
    });
    intervalIdsRef.current = [];

    if (memoryBadgeTimeoutRef.current !== null) {
      window.clearTimeout(memoryBadgeTimeoutRef.current);
      memoryBadgeTimeoutRef.current = null;
    }
  };

  const showMemoryBadge = (update: MemoryUpdate | null, token: number) => {
    setActiveMemoryUpdate(update);

    if (memoryBadgeTimeoutRef.current !== null) {
      window.clearTimeout(memoryBadgeTimeoutRef.current);
      memoryBadgeTimeoutRef.current = null;
    }

    if (!update) {
      return;
    }

    memoryBadgeTimeoutRef.current = window.setTimeout(() => {
      if (token !== runTokenRef.current) {
        return;
      }

      setActiveMemoryUpdate(null);
      memoryBadgeTimeoutRef.current = null;
    }, 2200);
  };

  const resetState = () => {
    setPhase("idle");
    setTargetUrl("");
    setIsRunning(false);
    setSubagents([]);
    setToolCalls([]);
    setMemoryUpdates([]);
    setActiveMemoryUpdate(null);
    setStreamedReport("");
    setLatestAuditResult(null);
    setReportSource(null);
    setErrorKey(null);
  };

  const updateToolCallStatus = (toolCallId: string, status: ToolCallStatus, nextLog?: string) => {
    setToolCalls((currentValue) =>
      currentValue.map((toolCall) => {
        if (toolCall.id !== toolCallId) {
          return toolCall;
        }

        return {
          ...toolCall,
          status,
          logs: nextLog ? [...toolCall.logs, nextLog] : toolCall.logs,
        };
      }),
    );
  };

  const updateSubagent = (agentId: string, status: Subagent["status"], executionTimeMs: number) => {
    setSubagents((currentValue) =>
      currentValue.map((subagent) => (subagent.id === agentId ? { ...subagent, status, executionTimeMs } : subagent)),
    );
  };

  const streamToolLogs = async (plan: MockSubagentDefinition[], activeTargetUrl: string, token: number): Promise<void> => {
    setSubagents((currentValue) => currentValue.map((subagent) => ({ ...subagent, status: "active" })));

    await Promise.all(
      plan.map(
        (item) =>
          new Promise<void>(async (resolve) => {
            let logIndex = 0;
            const startedAt = window.performance.now();
            const toolCallId = `${item.id}-tool`;
            
            while (logIndex < item.logKeys.length) {
              if (token !== runTokenRef.current) {
                resolve();
                return;
              }

              // Add organic jitter to the interval (±40%)
              const jitter = (Math.random() * 0.8 + 0.6);
              const delayMs = Math.round(item.intervalMs * jitter);
              await delay(delayMs);

              if (token !== runTokenRef.current) {
                resolve();
                return;
              }

              const rawLog = item.logKeys[logIndex];
              const nextLog = rawLog.includes(".") ? t(rawLog, { url: activeTargetUrl }) : rawLog;
              const isLastLog = logIndex === item.logKeys.length - 1;
              const status: ToolCallStatus = isLastLog ? "success" : "running";
              const executionTimeMs = Math.round(window.performance.now() - startedAt);

              updateToolCallStatus(toolCallId, status, nextLog);
              updateSubagent(item.id, isLastLog ? "done" : "active", executionTimeMs);

              if (isLastLog) {
                resolve();
                return;
              }

              logIndex++;
            }
          }),
      ),
    );
  };

  const applyMemoryUpdate = (update: MemoryUpdate, token: number) => {
    setMemoryUpdates((currentValue) => [update, ...currentValue]);
    showMemoryBadge(update, token);
  };

  const syncLiveMemoryUpdates = (report: AuditIntelligenceResult, token: number) => {
    const nextUpdates = buildLiveMemoryUpdates(report, t);

    setMemoryUpdates(nextUpdates);
    showMemoryBadge(nextUpdates[0] ?? null, token);
  };

  const syncLiveToolCalls = (report: AuditIntelligenceResult) => {
    setToolCalls((currentValue) => mergeToolCallsWithLiveLogs(currentValue, report, t));
  };

  const streamReport = async (content: string, token: number): Promise<void> => {
    setStreamedReport(content);
    return Promise.resolve();
  };

  const startAudit = async (url: string, intakeData?: any, isHitlOverride?: boolean) => {
    const normalizedUrl = url.trim();
    const token = runTokenRef.current + 1;
    let resolvedAuditResult: AuditIntelligenceResult | null = null;

    runTokenRef.current = token;
    clearRuntimeHandles();
    resetState();
    setTargetUrl(normalizedUrl);
    setIsRunning(true);

    const liveAuditPromise = (async (): Promise<AuditIntelligenceResult | null> => {
      try {
        const lang = i18n.resolvedLanguage || i18n.language;
        // Build the correct payload depending on mode
        const auditPayload = intakeData
          ? { ...intakeData, url: normalizedUrl, language: lang }  // Ensure url is always the normalized URL
          : { url: normalizedUrl, language: lang };

        const responseData = await postAuditRequest({
          endpoint: intakeData ? import.meta.env.VITE_INTAKE_ENDPOINT : import.meta.env.VITE_AUDIT_ENDPOINT,
          defaultEndpoint: intakeData ? "/api/intake" : "/api/audit",
          payload: auditPayload,
          // fallbackPayload must NOT contain arrays or complex objects that fail isAuditIntelligenceResult validation.
          // It is only used when the server is completely unreachable (no DB, no API).
          fallbackPayload: {
            queued: true,
            provider: "fallback",
            url: normalizedUrl,
          },
        });

        if (token !== runTokenRef.current) {
          return null;
        }

        const savedReport = saveLatestAuditReport(responseData);

        if (savedReport) {
          resolvedAuditResult = savedReport;
          setLatestAuditResult(savedReport);
          setReportSource("live");
          return savedReport;
        }
      } catch (error: any) {
        if (error && error.message === "unauthorized") {
          setErrorKey("validation.unauthorized");
          setIsRunning(false);
          clearRuntimeHandles();
          setPhase("idle");
          runTokenRef.current += 1;
          return null;
        }
        // fall through to mock synthesis mode
      }

      if (token === runTokenRef.current) {
        setReportSource("mock");
      }

      return null;
    })();

    let pendingPlan: any[] = [];

    for await (const event of createAgentWorkflow(
      normalizedUrl,
      t,
      enabledAgentIds,
      customAgentDefs,
      isHitlOverride ? hitlInstructions : undefined
    )) {
      if (token !== runTokenRef.current) {
        return;
      }

      if (event.type === "phase") {
        setPhase(event.phase);

        if (event.phase === "parallel_execution" && pendingPlan.length > 0) {
          await streamToolLogs(pendingPlan, normalizedUrl, token);

          if (resolvedAuditResult) {
            syncLiveToolCalls(resolvedAuditResult);
          }
        }

        continue;
      }

      if (event.type === "spawn") {
        pendingPlan = event.plan;
        setSubagents(event.subagents);
        setToolCalls(event.toolCalls);
        continue;
      }

      if (event.type === "memory") {
        if (resolvedAuditResult) {
          syncLiveMemoryUpdates(resolvedAuditResult, token);
        } else {
          applyMemoryUpdate(event.update, token);
        }

        continue;
      }

      if (event.type === "report") {
        const liveAuditResult = resolvedAuditResult ?? (await liveAuditPromise);

        if (token !== runTokenRef.current) {
          return;
        }

        if (liveAuditResult) {
          syncLiveToolCalls(liveAuditResult);
          syncLiveMemoryUpdates(liveAuditResult, token);
        }

        await streamReport(liveAuditResult ? buildLiveReportContent(liveAuditResult, t) : event.content, token);
      }
    }

    if (token === runTokenRef.current) {
      setIsRunning(false);
    }
  };

  const reset = () => {
    runTokenRef.current += 1;
    clearRuntimeHandles();
    resetState();
  };

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      clearRuntimeHandles();
    };
  }, []);

  return {
    phase,
    targetUrl,
    isRunning,
    subagents,
    toolCalls,
    memoryUpdates,
    activeMemoryUpdate,
    streamedReport,
    latestAuditResult,
    reportSource,
    errorKey,
    startAudit,
    reset,
    enabledAgentIds,
    setEnabledAgentIds,
    customAgentDefs,
    addCustomAgent,
    hitlInstructions,
    setHitlInstructions,
    immunizedRules,
    setImmunizedRules,
  };
}
