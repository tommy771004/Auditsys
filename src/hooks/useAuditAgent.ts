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

function buildReportContent(targetUrl: string, t: TFunction): string {
  return [
    t("auditConsole.mock.report.title"),
    "",
    t("auditConsole.mock.report.lead", { url: targetUrl }),
    "",
    `• ${t("auditConsole.mock.report.point1")}`,
    `• ${t("auditConsole.mock.report.point2")}`,
    `• ${t("auditConsole.mock.report.point3")}`,
    "",
    t("auditConsole.mock.report.closing"),
  ].join("\n");
}

async function* createAgentWorkflow(targetUrl: string, t: TFunction): AsyncGenerator<AgentWorkflowEvent> {
  const plan = buildMockPlan(targetUrl);

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

  yield { type: "memory", update: buildMemoryUpdate(t) };
  await delay(760);

  yield { type: "phase", phase: "streaming_report" };
  await delay(160);

  yield { type: "report", content: buildReportContent(targetUrl, t) };
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
          new Promise<void>((resolve) => {
            let logIndex = 0;
            const startedAt = window.performance.now();
            const toolCallId = `${item.id}-tool`;
            const intervalId = window.setInterval(() => {
              if (token !== runTokenRef.current) {
                window.clearInterval(intervalId);
                resolve();
                return;
              }

              const nextLog = t(item.logKeys[logIndex], { url: activeTargetUrl });
              const isLastLog = logIndex === item.logKeys.length - 1;
              const status: ToolCallStatus = isLastLog ? "success" : "running";
              const executionTimeMs = Math.round(window.performance.now() - startedAt);

              updateToolCallStatus(toolCallId, status, nextLog);
              updateSubagent(item.id, isLastLog ? "done" : "active", executionTimeMs);

              if (isLastLog) {
                window.clearInterval(intervalId);
                intervalIdsRef.current = intervalIdsRef.current.filter((registeredId) => registeredId !== intervalId);
                resolve();
                return;
              }

              logIndex += 1;
            }, item.intervalMs);

            intervalIdsRef.current.push(intervalId);
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

  const startAudit = async (url: string, intakeData?: any) => {
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

    let pendingPlan: MockSubagentDefinition[] = [];

    for await (const event of createAgentWorkflow(normalizedUrl, t)) {
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
  };
}
