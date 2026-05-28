import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, BrainCircuit, Cpu, Database, RefreshCcw, Sparkles, Terminal, Workflow, History, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BrowserCollectorTimelineStep } from "../Server/Services/auditPipelineTypes";
import PageContainer from "../components/layout/PageContainer";
import GlassContainer from "../components/ui/GlassContainer";
import GlowingButton from "../components/ui/GlowingButton";
import MemorySyncBadge from "../components/ui/MemorySyncBadge";
import SubagentCard from "../components/ui/SubagentCard";
import { useAuditAgent, buildLiveMemoryUpdates, buildLiveReportContent } from "../hooks/useAuditAgent";
import type { AgentReportMetric } from "../types/agent.types";
import type { NavigateTo } from "../types/home";

interface AuditConsoleProps {
  onNavigate: NavigateTo;
}

function getPrimaryRuntimeGate(steps: BrowserCollectorTimelineStep[] | undefined): BrowserCollectorTimelineStep | undefined {
  return steps?.find((step) => step.status === "blocked")
    ?? steps?.find((step) => step.status === "partial" || step.status === "not_run");
}

export default function AuditConsole({ onNavigate }: AuditConsoleProps) {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState<string>("https://demo.auditlens.io/");
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [selectedHistoryAudit, setSelectedHistoryAudit] = useState<any | null>(null);

  const {
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
    errorKey: agentErrorKey,
    startAudit,
    reset,
  } = useAuditAgent();

  const fetchHistory = async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/audits", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setHistoryItems(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  useEffect(() => {
    if (phase === "complete") {
      fetchHistory();
    }
  }, [phase]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      onNavigate("login");
    }
  }, [onNavigate]);

  useEffect(() => {
    const intakeUrl = localStorage.getItem("intake_submitted_url");
    if (intakeUrl) {
      setUrlInput(intakeUrl);
      localStorage.removeItem("intake_submitted_url");
    }
  }, []);

  const previewRoles = subagents.length > 0
    ? subagents.map((subagent) => subagent.role)
    : [
        t("auditConsole.mock.subagents.frontend.role"),
        t("auditConsole.mock.subagents.backend.role"),
        t("auditConsole.mock.subagents.architecture.role"),
      ];

  const metrics: AgentReportMetric[] = [
    {
      id: "subagents",
      label: t("auditConsole.metrics.subagents"),
      value: `${subagents.filter((subagent) => subagent.status !== "pending").length}/${Math.max(subagents.length, 3)}`,
      tone: subagents.some((subagent) => subagent.status === "active") ? "success" : "default",
    },
    {
      id: "tools",
      label: t("auditConsole.metrics.tools"),
      value: `${toolCalls.filter((toolCall) => toolCall.status === "success").length}/${Math.max(toolCalls.length, 3)}`,
      tone: toolCalls.some((toolCall) => toolCall.status === "success") ? "success" : "default",
    },
    {
      id: "memory",
      label: t("auditConsole.metrics.memoryWrites"),
      value: String(memoryUpdates.length),
      tone: memoryUpdates.length > 0 ? "success" : "default",
    },
    {
      id: "report",
      label: t("auditConsole.metrics.reportStatus"),
      value:
        phase === "complete"
          ? t("auditConsole.metrics.reportReadyValue")
          : phase === "streaming_report"
            ? t("auditConsole.metrics.reportStreamingValue")
            : t("auditConsole.metrics.reportPendingValue"),
      tone: phase === "complete" ? "success" : phase === "streaming_report" ? "warning" : "default",
    },
  ];

  const showParallelGrid = phase === "parallel_execution" || phase === "synthesizing_memory";
  const showFinalReport = phase === "streaming_report" || phase === "complete";
  const missionTarget = targetUrl || urlInput.trim();
  const reportSourceLabel = reportSource === "live"
    ? t("auditConsole.live.badge")
    : reportSource === "mock"
      ? t("auditConsole.mock.badge")
      : t("auditConsole.pending.badge");
  const reportSourceClassName = reportSource === "live"
    ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
    : reportSource === "mock"
      ? "border-white/10 bg-white/[0.05] text-white/70"
      : "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan";
  const primaryRuntimeGate = latestAuditResult ? getPrimaryRuntimeGate(latestAuditResult.evidence.browser.timeline) : undefined;
  const liveEvidenceItems = latestAuditResult
    ? [
        {
          id: "provider",
          label: t("auditConsole.live.snapshot.provider"),
          value: latestAuditResult.model ? `${latestAuditResult.provider} / ${latestAuditResult.model}` : latestAuditResult.provider,
        },
        {
          id: "browser",
          label: t("auditConsole.live.snapshot.browser"),
          value: t("auditConsole.live.snapshot.browserValue", {
            status: t(`report.runtime.status.${latestAuditResult.evidence.browser.status}`),
            mode: t(`report.runtime.modes.${latestAuditResult.evidence.browser.mode}`),
          }),
        },
        {
          id: "gate",
          label: t("auditConsole.live.snapshot.gate"),
          value: primaryRuntimeGate
            ? primaryRuntimeGate.detail
              ? t("auditConsole.live.snapshot.gateValueWithDetail", {
                  step: primaryRuntimeGate.label,
                  status: t(`report.runtime.status.${primaryRuntimeGate.status}`),
                  detail: primaryRuntimeGate.detail,
                })
              : t("auditConsole.live.snapshot.gateValue", {
                  step: primaryRuntimeGate.label,
                  status: t(`report.runtime.status.${primaryRuntimeGate.status}`),
                })
            : t("auditConsole.live.snapshot.gateMissing"),
        },
        {
          id: "warnings",
          label: t("auditConsole.live.snapshot.warnings"),
          value: t("auditConsole.live.snapshot.warningValue", {
            count: latestAuditResult.evidence.deterministic.warnings.length + latestAuditResult.evidence.browser.warnings.length,
          }),
        },
      ]
    : [];

  const capabilityCards = [
    {
      id: "parallel",
      icon: Workflow,
      title: t("auditConsole.capabilities.parallel.title"),
      description: t("auditConsole.capabilities.parallel.description"),
    },
    {
      id: "memory",
      icon: Database,
      title: t("auditConsole.capabilities.memory.title"),
      description: t("auditConsole.capabilities.memory.description"),
    },
    {
      id: "report",
      icon: BrainCircuit,
      title: t("auditConsole.capabilities.report.title"),
      description: t("auditConsole.capabilities.report.description"),
    },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUrl = urlInput.trim();

    if (!normalizedUrl) {
      setErrorKey("validation.requiredUrl");
      return;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        setErrorKey("validation.invalidUrl");
        return;
      }
    } catch {
      setErrorKey("validation.invalidUrl");
      return;
    }

    setErrorKey(null);
    setSelectedHistoryAudit(null);
    await startAudit(normalizedUrl);
  };

  const renderPhasePanel = () => {
    if (selectedHistoryAudit) {
      const histResult = selectedHistoryAudit.result;
      const hasFullEvidence = histResult && histResult.evidence && histResult.evidence.browser && histResult.evidence.deterministic;
      const histReportContent = hasFullEvidence 
        ? buildLiveReportContent(histResult, t) 
        : (histResult?.summary || histResult?.reason || "Analysis report data is in process or empty.");
      
      const histMemory = hasFullEvidence ? buildLiveMemoryUpdates(histResult, t) : [];
      const histEvidenceItems = hasFullEvidence
        ? [
            {
              id: "provider",
              label: t("auditConsole.live.snapshot.provider"),
              value: histResult.model ? `${histResult.provider} / ${histResult.model}` : histResult.provider,
            },
            {
              id: "browser",
              label: t("auditConsole.live.snapshot.browser"),
              value: t("auditConsole.live.snapshot.browserValue", {
                status: t(`report.runtime.status.${histResult.evidence.browser.status}`),
                mode: t(`report.runtime.modes.${histResult.evidence.browser.mode}`),
              }),
            },
            typeof histResult.evidence.deterministic.responseTimeMs === 'number'
              ? {
                  id: "latency",
                  label: "Response Latency",
                  value: `${histResult.evidence.deterministic.responseTimeMs} ms`,
                }
              : null,
          ].filter(Boolean)
        : [];

      return (
        <motion.div
          key="history-report"
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"
        >
          <div className="rounded-[28px] border border-white/10 bg-slate-950/58 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-400/10 text-purple-100">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Historical Audit Report</p>
                  <p className="text-xs text-brand-muted">
                    Showing results saved on {new Date(selectedHistoryAudit.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHistoryAudit(null)}
                className="text-xs font-semibold px-4 min-h-[44px] rounded-full border border-white/10 bg-white/5 hover:bg-white/12 text-white transition active:scale-[0.98]"
              >
                Close History
              </button>
            </div>
            <pre className="min-h-[20rem] whitespace-pre-wrap rounded-[24px] border border-white/10 bg-white/[0.03] p-4 font-mono text-[13px] leading-7 text-white/86">{histReportContent}</pre>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.live.snapshot.title")}</p>
              <div className="mt-4 space-y-3">
                {histEvidenceItems.length > 0 ? (
                  histEvidenceItems.map((item: any) => (
                    <div key={item.id} className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{item.label}</p>
                      <p className="mt-2 text-sm leading-7 text-white/84">{item.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-dashed border-white/10 px-4 py-3 text-sm text-white/55">No historical evidence details stored for this run.</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.sections.memoryTitle")}</p>
              <div className="mt-4 space-y-3">
                {histMemory.length > 0 ? (
                  histMemory.map((update: any) => (
                    <div key={`${update.key}-${update.fact}`} className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{update.fact}</p>
                      <p className="mt-1 text-xs text-white/55">{t("auditConsole.memoryBadge.type", { value: t(`auditConsole.memoryType.${update.type}`) })}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-dashed border-white/10 px-4 py-3 text-sm text-white/55">{t("auditConsole.sections.memoryEmpty")}</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    if (showFinalReport) {
      return (
        <motion.div
          key="report"
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]"
        >
          <div className="rounded-[28px] border border-white/10 bg-slate-950/58 p-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-100">
                <Terminal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{t("auditConsole.sections.reportTitle")}</p>
                <p className="text-sm text-brand-muted">
                  {reportSource === "live"
                    ? t("auditConsole.sections.reportDescriptionLive")
                    : reportSource === "mock"
                      ? t("auditConsole.sections.reportDescription")
                      : t("auditConsole.sections.reportDescriptionPending")}
                </p>
              </div>
              <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", reportSourceClassName].join(" ")}>
                {reportSourceLabel}
              </span>
            </div>
            <pre className="mt-5 min-h-[20rem] whitespace-pre-wrap rounded-[24px] border border-white/10 bg-white/[0.03] p-4 font-mono text-[13px] leading-7 text-white/86">{streamedReport || t("auditConsole.sections.reportWaiting")}</pre>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.live.snapshot.title")}</p>
              <div className="mt-4 space-y-3">
                {liveEvidenceItems.length > 0 ? (
                  liveEvidenceItems.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{item.label}</p>
                      <p className="mt-2 text-sm leading-7 text-white/84">{item.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-dashed border-white/10 px-4 py-3 text-sm text-white/55">{t("auditConsole.live.snapshot.empty")}</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.sections.memoryTitle")}</p>
              <div className="mt-4 space-y-3">
                {memoryUpdates.length > 0 ? (
                  memoryUpdates.map((update) => (
                    <div key={`${update.key}-${update.fact}`} className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
                      <p className="text-sm font-semibold text-white">{update.fact}</p>
                      <p className="mt-1 text-xs text-white/55">{t("auditConsole.memoryBadge.type", { value: t(`auditConsole.memoryType.${update.type}`) })}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-dashed border-white/10 px-4 py-3 text-sm text-white/55">{t("auditConsole.sections.memoryEmpty")}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <GlowingButton
                className="w-full justify-center"
                loadingLabel={t("auditConsole.submitLoading")}
                onClick={() => {
                  onNavigate("report");
                }}
              >
                <ArrowRight className="h-4 w-4" />
                {t("auditConsole.actions.openSampleReport")}
              </GlowingButton>
              <GlowingButton
                className="w-full justify-center"
                loadingLabel={t("auditConsole.submitLoading")}
                variant="ghost"
                onClick={() => {
                  reset();
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                {t("auditConsole.actions.reset")}
              </GlowingButton>
            </div>
          </div>
        </motion.div>
      );
    }

    if (showParallelGrid) {
      return (
        <motion.div
          key="parallel"
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <p className="text-sm font-semibold text-white">{t("auditConsole.sections.parallelTitle")}</p>
            <p className="text-sm text-brand-muted">{t("auditConsole.sections.parallelDescription")}</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {subagents.map((subagent) => (
              <SubagentCard key={subagent.id} subagent={subagent} toolCalls={toolCalls.filter((toolCall) => toolCall.agentId === subagent.id)} />
            ))}
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key="spawning"
        layout
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{t("auditConsole.sections.spawningTitle")}</p>
          <p className="text-sm text-brand-muted">{t(`auditConsole.phaseDescriptions.${phase}`)}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {previewRoles.map((role, index) => (
            <motion.div
              key={`${role}-${index}`}
              layout
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.28 }}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/35 text-white/85">
                <Bot className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-white">{role}</p>
              <p className="mt-2 text-sm text-brand-muted">{t("auditConsole.sections.spawningCardDescription")}</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
                <motion.div
                  className="h-full rounded-full bg-brand-gradient"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <main className="relative z-10 pb-24 pt-32 sm:pt-36">
      <MemorySyncBadge update={activeMemoryUpdate} />
      <PageContainer>
        <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr] xl:items-start">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-violet-100/92">
                <Sparkles className="h-3.5 w-3.5" />
                {t("auditConsole.badge")}
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">{t("auditConsole.title")}</h1>
                <p className="max-w-2xl text-base leading-8 text-brand-muted sm:text-lg">{t("auditConsole.description")}</p>
              </div>
            </div>

            <GlassContainer accent="cyan" className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/82">{t("auditConsole.capabilitiesEyebrow")}</p>
                <p className="text-lg font-semibold text-white">{t("auditConsole.capabilitiesTitle")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {capabilityCards.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.id} className="rounded-[24px] border border-white/10 bg-slate-950/38 p-4">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/88">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-sm leading-7 text-brand-muted">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </GlassContainer>

            <GlassContainer accent="blue" className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">{t("auditConsole.sections.memoryTitle")}</p>
                <p className="text-lg font-semibold text-white">{t("auditConsole.memoryPanelTitle")}</p>
              </div>
              <div className="space-y-3">
                {memoryUpdates.length > 0 ? (
                  memoryUpdates.map((update) => (
                    <div key={`${update.key}-${update.fact}`} className="rounded-[22px] border border-white/10 bg-slate-950/38 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{update.fact}</p>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                          {t(`auditConsole.memoryType.${update.type}`)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-4 text-sm leading-7 text-white/55">{t("auditConsole.sections.memoryEmpty")}</div>
                )}
              </div>
            </GlassContainer>

            <GlassContainer accent="purple" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100/80">Audit History</p>
                  <p className="text-lg font-semibold text-white">Your Past Analysis Runs</p>
                </div>
                <button 
                  type="button"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="rounded-full bg-white/5 hover:bg-white/10 p-2 text-white/70 hover:text-white transition disabled:opacity-50"
                  title="Refresh history"
                >
                  <RefreshCcw className={`h-4 w-4 ${isLoadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-6 text-center text-sm text-white/50">Loading runs...</div>
              ) : historyItems.length > 0 ? (
                <div className="space-y-2.5 max-h-[22rem] overflow-y-auto pr-1">
                  {historyItems.map((item) => {
                    const isSelected = selectedHistoryAudit?.id === item.id;
                    const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHistoryAudit(null);
                          } else {
                            setSelectedHistoryAudit(item);
                          }
                        }}
                        className={[
                          "w-full text-left rounded-[18px] border p-3 min-h-[64px] text-sm transition-all flex flex-col gap-1.5 active:scale-[0.98]",
                          isSelected
                            ? "border-violet-400/30 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,236,0.15)] ring-1 ring-violet-500/30"
                            : "border-white/5 bg-slate-950/40 hover:bg-slate-950/60 text-white/80 hover:text-white"
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="font-sans font-medium truncate max-w-[12rem] text-white">
                            {item.url}
                          </span>
                          <span className="text-[10px] text-white/40 whitespace-nowrap">
                            {dateStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs w-full">
                          <span className="text-white/45 truncate">
                            {item.result?.model || "Standard engine"}
                          </span>
                          <span className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                            item.status === 'completed' 
                              ? "bg-emerald-500/10 text-emerald-300/90 border border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-300/90 border border-amber-500/20"
                          ].join(" ")}>
                            {item.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[18px] border border-dashed border-white/8 px-4 py-5 text-center text-sm leading-6 text-white/50">
                  No automated audit history found. Submit your first analysis URL above to start tracking performance runs.
                </div>
              )}
            </GlassContainer>
          </div>

          <GlassContainer accent="violet" className="min-h-[720px] space-y-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">{t("auditConsole.missionEyebrow")}</p>
                <h2 className="text-2xl font-semibold text-white">{t("auditConsole.missionTitle")}</h2>
                <p className="max-w-2xl text-sm leading-7 text-brand-muted">{t(`auditConsole.phaseDescriptions.${phase}`)}</p>
              </div>
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/72 sm:self-auto">
                <Workflow className="h-4 w-4 text-cyan-200" />
                <span>{t("auditConsole.phaseLabel", { value: t(`auditConsole.phases.${phase}`) })}</span>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/86" htmlFor="audit-console-url">
                  {t("auditConsole.inputLabel")}
                </label>
                <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-2 backdrop-blur-xl transition focus-within:border-brand-cyan focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 focus-within:ring-brand-cyan/50">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] px-3 py-2.5">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/84">
                        <Terminal className="h-4.5 w-4.5" />
                      </div>
                      <input
                        id="audit-console-url"
                        className="min-h-[44px] w-full border-0 bg-transparent text-sm text-white outline-none"
                        value={urlInput}
                        placeholder={t("auditConsole.inputPlaceholder")}
                        onChange={(event) => {
                          setUrlInput(event.target.value);
                          if (errorKey) {
                            setErrorKey(null);
                          }
                        }}
                      />
                    </div>
                    <div className="flex gap-2">
                      {isRunning ? (
                        <GlowingButton className="justify-center text-rose-300" variant="ghost" onClick={reset}>
                          <X className="h-4 w-4" />
                          t('auditConsole.actions.cancel')
                        </GlowingButton>
                      ) : (
                        <>
                          <GlowingButton className="justify-center" isLoading={isRunning} loadingLabel={t("auditConsole.submitLoading")} type="submit">
                            <ArrowRight className="h-4 w-4" />
                            {t("auditConsole.submit")}
                          </GlowingButton>
                          <GlowingButton className="justify-center" loadingLabel={t("auditConsole.submitLoading")} variant="ghost" onClick={reset}>
                            <RefreshCcw className="h-4 w-4" />
                            {t("auditConsole.actions.reset")}
                          </GlowingButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-brand-muted">{t("auditConsole.helper", { url: missionTarget })}</p>
                {(errorKey || agentErrorKey) ? <p className="text-sm text-rose-200">{t(errorKey || agentErrorKey)}</p> : null}
              </div>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <motion.div key={metric.id} layout className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{metric.label}</p>
                  <p
                    className={[
                      "mt-3 text-lg font-semibold",
                      metric.tone === "success" ? "text-emerald-100" : metric.tone === "warning" ? "text-amber-100" : "text-white",
                    ].join(" ")}
                  >
                    {metric.value}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/32 p-5">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/84">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t("auditConsole.sections.missionStreamTitle")}</p>
                  <p className="text-sm text-brand-muted">{t("auditConsole.sections.missionStreamDescription", { url: missionTarget })}</p>
                </div>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {renderPhasePanel()}
              </AnimatePresence>
            </div>
          </GlassContainer>
        </div>
      </PageContainer>
    </main>
  );
}
