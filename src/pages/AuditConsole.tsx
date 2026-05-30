import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, BrainCircuit, Cpu, Database, RefreshCcw, Sparkles, Terminal, Workflow, History, X, ShieldAlert, Shield, ShieldCheck, Target, Zap, LayoutDashboard, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BrowserCollectorTimelineStep } from "../Server/Services/auditPipelineTypes";
import PageContainer from "../components/layout/PageContainer";
import ConsoleTabs from "../components/ui/ConsoleTabs";
import GlassContainer from "../components/ui/GlassContainer";
import { ReportRenderer } from "../components/ui/ReportRenderer";
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
  const [showLiveRetrospective, setShowLiveRetrospective] = useState<boolean>(false);
  const [showAgentLogs, setShowAgentLogs] = useState<boolean>(false);
  const modalCloseRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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

  // History modal: Escape-to-close + focus move-in / return-on-close.
  useEffect(() => {
    if (!selectedHistoryAudit) {
      return;
    }
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    modalCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedHistoryAudit(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [selectedHistoryAudit]);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return; // Wait until authenticated before consuming intake data

    const intakeUrl = localStorage.getItem("intake_submitted_url");
    const intakeDataRaw = localStorage.getItem("intake_submitted_data");
    
    if (intakeUrl) {
      setUrlInput(intakeUrl);
      localStorage.removeItem("intake_submitted_url");
      
      let intakeData = undefined;
      if (intakeDataRaw) {
        try {
          intakeData = JSON.parse(intakeDataRaw);
        } catch (e) {
          console.error("Failed to parse intake data", e);
        }
        localStorage.removeItem("intake_submitted_data");
      }
      
      setTimeout(() => startAudit(intakeUrl, intakeData), 100);
    }
  }, [startAudit]);

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
  const harness = latestAuditResult?.harness;
  
  const getHarnessStatusClassName = (status: string) => {
    switch (status) {
      case "passed": return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
      case "failed": return "border-rose-400/25 bg-rose-400/10 text-rose-100";
      default: return "border-amber-400/25 bg-amber-400/10 text-amber-100";
    }
  };

  const getHarnessCheckClassName = (status: string) => {
    switch (status) {
      case "passed": return "border-emerald-400/25 bg-emerald-400/10 text-emerald-400";
      case "failed": return "border-rose-400/25 bg-rose-400/10 text-rose-400";
      default: return "border-amber-400/25 bg-amber-400/10 text-amber-400";
    }
  };

  const HarnessStatusIcon = harness?.status === "passed" ? ShieldCheck : harness?.status === "failed" ? ShieldAlert : Shield;
  const harnessStats = harness
    ? [
        {
          id: "attempts",
          label: t("auditConsole.harness.stats.attempts"),
          value: `${harness.attempts.length}/${harness.governance.maxAttempts}`,
        },
        {
          id: "retries",
          label: t("auditConsole.harness.stats.retries"),
          value: `${harness.governance.retriesUsed}/${harness.governance.retryCap}`,
        },
        {
          id: "tools",
          label: t("auditConsole.harness.stats.tools"),
          value: String(harness.toolRegistry.filter((tool) => tool.enabled).length),
        },
        {
          id: "steps",
          label: t("auditConsole.harness.stats.steps"),
          value: `${harness.governance.stepsUsed}/${harness.governance.maxSteps}`,
        },
      ]
    : [];
  const harnessChecks = harness?.qualityGate.checks.slice(0, 5) ?? [];
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
    // History is now shown via the dedicated Modal below — do not render inline here.

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
            <div aria-live="polite" aria-atomic="false">
            {(() => {
              if (!streamedReport) {
                return (
                  <div className="mt-6 flex flex-col items-center justify-center min-h-[20rem] rounded-[32px] border border-white/5 bg-slate-950/40 p-8 shadow-inner">
                    <div className="w-full max-w-md space-y-12">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.2em]">
                        <span className="flex flex-col items-center gap-3 text-brand-cyan"><div className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />Crawling</span>
                        <span className="flex flex-col items-center gap-3 text-white/40"><div className="h-2 w-2 rounded-full bg-white/20" />Synthesizing</span>
                        <span className="flex flex-col items-center gap-3 text-white/40"><div className="h-2 w-2 rounded-full bg-white/20" />Rendering</span>
                      </div>
                      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="absolute left-0 top-0 h-full w-1/3 rounded-full bg-brand-cyan shadow-[0_0_10px_rgba(34,211,238,0.6)] animate-pulse" />
                      </div>
                      <p className="text-center text-sm font-medium text-white/60 animate-pulse">{t("auditConsole.sections.reportWaiting")}</p>
                    </div>
                  </div>
                );
              }
              return <ReportRenderer reportText={streamedReport} />;
            })()}
            </div>
          </div>

          <div className="space-y-4">
            {harness ? (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-white/85">
                      <HarnessStatusIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t("auditConsole.harness.eyebrow")}</p>
                      <p className="text-sm font-semibold text-white">{t("auditConsole.harness.title")}</p>
                    </div>
                  </div>
                  <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", getHarnessStatusClassName(harness.status)].join(" ")}>
                    {t(`auditConsole.harness.status.${harness.status}`)}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {harnessStats.map((item) => (
                    <div key={item.id} className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{t("auditConsole.harness.checksTitle")}</p>
                  {harnessChecks.map((check) => (
                    <div key={check.id} className="rounded-[18px] border border-white/10 bg-slate-950/35 px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{check.label}</p>
                        <span className={["shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", getHarnessCheckClassName(check.status)].join(" ")}>
                          {t(`auditConsole.harness.checkStatus.${check.status}`)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-5 text-white/58">{check.details}</p>
                    </div>
                  ))}
                </div>

                {harness.handoffRequired ? (
                  <p className="mt-4 rounded-[18px] border border-amber-400/15 bg-amber-400/10 px-3 py-3 text-xs leading-5 text-amber-100/88">
                    {t("auditConsole.harness.handoff", { reason: harness.handoffReason ?? "manual_review" })}
                  </p>
                ) : null}

                {harness.retrospective ? (
                  <div className="mt-4">
                    <GlowingButton
                      className="w-full justify-center !bg-slate-900/50 hover:!bg-slate-900/80 !border-white/10"
                      variant="ghost"
                      loadingLabel={t("auditConsole.harness.viewRetrospective")}
                      onClick={() => setShowLiveRetrospective(true)}
                    >
                      <Terminal className="h-4 w-4 text-emerald-400" />
                      <span className="text-white/80">{t("auditConsole.harness.viewRetrospective")}</span>
                    </GlowingButton>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t("auditConsole.live.snapshot.title")}</p>
              <div className="mt-4 space-y-3">
                {liveEvidenceItems.length > 0 ? (
                  liveEvidenceItems.map((item) => (
                    <div key={item.id} className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{item.label}</p>
                      <p className="mt-2 text-sm leading-7 text-white/84">{item.value}</p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-dashed border-white/10 px-4 py-3 text-sm text-white/55">{t("auditConsole.live.snapshot.empty")}</p>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t("auditConsole.sections.memoryTitle")}</p>
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
        <ConsoleTabs currentRoute="console" onNavigate={onNavigate} />
        <div className="flex flex-col gap-10">
          
          {/* Layer 1: Header */}
          <div className="space-y-4 text-center mx-auto max-w-3xl flex flex-col items-center">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-violet-100/92">
              <Sparkles className="h-3.5 w-3.5" />
              {t("auditConsole.badge")}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{t("auditConsole.title")}</h1>
              <p className="text-base leading-8 text-brand-muted sm:text-lg">{t("auditConsole.description")}</p>
            </div>
          </div>

          {/* Layer 2: Mission Control Input & Metrics */}
          <GlassContainer accent="violet" className="space-y-8">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t("auditConsole.missionEyebrow")}</p>
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
                        <GlowingButton className="justify-center text-rose-300" variant="ghost" loadingLabel="" onClick={reset}>
                          <X className="h-4 w-4" />
                          {t("auditConsole.actions.cancel")}
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{metric.label}</p>
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
          </GlassContainer>

          {/* Layer 3: Mission Stream (The Active Execution) */}
          <GlassContainer accent="cyan" className="min-h-[500px]">
             <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/84">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t("auditConsole.sections.missionStreamTitle")}</p>
                    <p className="text-sm text-brand-muted">{t("auditConsole.sections.missionStreamDescription", { url: missionTarget })}</p>
                  </div>
                </div>
                
                <GlowingButton
                  variant="ghost"
                  loadingLabel=""
                  onClick={() => setShowAgentLogs(true)}
                  className="!px-4 !py-2 min-h-0 text-xs text-white/80"
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  <span>Agent Logs</span>
                </GlowingButton>
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {renderPhasePanel()}
              </AnimatePresence>
          </GlassContainer>

          {/* Layer 4: Memory & Capabilities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            
            <GlassContainer accent="cyan" className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/82">{t("auditConsole.capabilitiesEyebrow")}</p>
                <p className="text-lg font-semibold text-white">{t("auditConsole.capabilitiesTitle")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-1">
                {capabilityCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="rounded-[24px] border border-white/10 bg-slate-950/38 p-4 flex items-start gap-4">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/88">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-brand-muted">{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassContainer>
          </div>

          {/* Layer 5: Audit History */}
          <GlassContainer accent="violet" className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-100/80">{t("history.title")}</p>
                  <p className="text-lg font-semibold text-white">{t("history.subtitle")}</p>
                </div>
                <button 
                  type="button"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white/5 hover:bg-white/10 p-2 text-white/70 hover:text-white transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none"
                  aria-label={t("history.refreshHistory")}
                  title={t("history.refreshHistory")}
                >
                  <RefreshCcw className={`h-5 w-5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-6 text-center text-sm text-white/60">{t("history.loading")}</div>
              ) : historyItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 max-h-[22rem] overflow-y-auto pr-1">
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
                          "text-left rounded-[18px] border p-4 min-h-[80px] text-sm transition-all flex flex-col gap-2 active:scale-[0.98]",
                          isSelected
                            ? "border-violet-400/30 bg-violet-500/10 text-white shadow-[0_0_15px_rgba(139,92,236,0.15)] ring-1 ring-violet-500/30"
                            : "border-white/5 bg-slate-950/40 hover:bg-slate-950/60 text-white/80 hover:text-white"
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="font-sans font-medium truncate max-w-[12rem] text-white">
                            {item.url}
                          </span>
                          <span className="text-[10px] text-white/60 whitespace-nowrap">
                            {dateStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs w-full">
                          <span className="text-white/60 truncate">
                            {item.result?.model || t("history.standardEngine")}
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
                <div className="rounded-[18px] border border-dashed border-white/8 px-4 py-5 text-center text-sm leading-6 text-white/60">
                  {t("history.empty")}
                </div>
              )}
          </GlassContainer>

        </div>

        {/* History Modal */}
        <AnimatePresence>
          {selectedHistoryAudit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={() => setSelectedHistoryAudit(null)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-modal-title"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
                  <div>
                    <h3 id="history-modal-title" className="text-lg font-semibold text-white">{t("history.reportTitle")}</h3>
                    <p className="text-sm text-brand-muted">{selectedHistoryAudit.url}</p>
                  </div>
                  <button
                    ref={modalCloseRef}
                    type="button"
                    onClick={() => setSelectedHistoryAudit(null)}
                    aria-label={t("history.close")}
                    className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <span className={[
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      selectedHistoryAudit.status === 'completed'
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                        : selectedHistoryAudit.status === 'failed'
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                    ].join(" ")}>
                      {selectedHistoryAudit.status?.toUpperCase()}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                      {t("history.provider")} {selectedHistoryAudit.result?.provider || "unknown"}
                    </span>
                    {selectedHistoryAudit.result?.model && (
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                        {t("history.model")} {selectedHistoryAudit.result.model}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
                      {new Date(selectedHistoryAudit.createdAt).toLocaleString()}
                    </span>
                    {typeof selectedHistoryAudit.result?.evidence?.deterministic?.responseTimeMs === 'number' && (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                        {t("history.response")} {selectedHistoryAudit.result.evidence.deterministic.responseTimeMs} ms
                      </span>
                    )}
                  </div>

                  {/* LLM Report Summary */}
                  <ReportRenderer 
                    reportText={
                      selectedHistoryAudit.result?.summary ||
                      selectedHistoryAudit.result?.reason ||
                      (selectedHistoryAudit.status === 'failed' ? `${t("admin.reports.auditFailed")}${selectedHistoryAudit.result?.error || t("history.unknownError")}` : null)
                    } 
                  />

                  {/* Deterministic Evidence */}
                  {selectedHistoryAudit.result?.evidence?.deterministic && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-3">{t("history.deterministicEvidence")}</p>
                      <div className="space-y-2 text-sm text-white/75">
                        {selectedHistoryAudit.result.evidence.deterministic.statusCode && (
                          <div><span className="text-white/45">{t("history.httpStatus")}</span> {selectedHistoryAudit.result.evidence.deterministic.statusCode}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.deterministic.finalUrl && (
                          <div className="truncate"><span className="text-white/45">{t("history.resolvedUrl")}</span> {selectedHistoryAudit.result.evidence.deterministic.finalUrl}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.deterministic.document?.title && (
                          <div><span className="text-white/45">{t("history.pageTitle")}</span> {selectedHistoryAudit.result.evidence.deterministic.document.title}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.deterministic.warnings?.length > 0 && (
                          <div>
                            <span className="text-white/45">{t("history.warnings")} ({selectedHistoryAudit.result.evidence.deterministic.warnings.length}):</span>
                            <ul className="mt-1 ml-4 list-disc text-amber-300/80 text-xs">
                              {selectedHistoryAudit.result.evidence.deterministic.warnings.map((w: string, i: number) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Browser Evidence */}
                  {selectedHistoryAudit.result?.evidence?.browser && (
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45 mb-3">{t("history.browserEvidence")}</p>
                      <div className="space-y-2 text-sm text-white/75">
                        <div><span className="text-white/45">{t("history.status")}</span> {selectedHistoryAudit.result.evidence.browser.status} ({selectedHistoryAudit.result.evidence.browser.mode})</div>
                        {selectedHistoryAudit.result.evidence.browser.reason && (
                          <div><span className="text-white/45">{t("history.reason")}</span> {selectedHistoryAudit.result.evidence.browser.reason}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.browser.warnings?.length > 0 && (
                          <div>
                            <span className="text-white/45">{t("history.warnings")}</span>
                            <ul className="mt-1 ml-4 list-disc text-amber-300/80 text-xs">
                              {selectedHistoryAudit.result.evidence.browser.warnings.map((w: string, i: number) => (
                                <li key={i}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Live Retrospective Modal */}
        <AnimatePresence>
          {showLiveRetrospective && latestAuditResult?.harness?.retrospective && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={() => setShowLiveRetrospective(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="retrospective-modal-title"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-[24px] border border-emerald-500/20 bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-900/10 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 id="retrospective-modal-title" className="text-lg font-semibold text-emerald-100">{t("auditConsole.harness.retrospectiveTitle")}</h3>
                      <p className="text-sm text-emerald-400/60">{missionTarget}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLiveRetrospective(false)}
                    aria-label={t("auditConsole.harness.hideRetrospective")}
                    className="rounded-full p-2 text-emerald-400/60 hover:bg-emerald-500/20 hover:text-emerald-300 transition focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:outline-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950/50">
                  <div className="prose prose-sm prose-invert max-w-none text-emerald-50/80 font-mono text-[13px] leading-relaxed [&_h2]:text-emerald-300 [&_h3]:text-emerald-400 [&_strong]:text-emerald-200">
                    <ReportRenderer reportText={latestAuditResult.harness.retrospective} />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Agent Logs Terminal Modal */}
        <AnimatePresence>
          {showAgentLogs && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={() => setShowAgentLogs(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-[24px] border border-white/10 bg-slate-950/60 shadow-2xl overflow-hidden backdrop-blur-2xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Agent Terminal Logs</h3>
                      <p className="text-sm text-brand-muted">{missionTarget}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAgentLogs(false)}
                    className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white transition focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[13px] bg-slate-950/40">
                  {toolCalls.length === 0 && memoryUpdates.length === 0 ? (
                    <div className="text-white/40 flex h-full items-center justify-center">
                      <span className="animate-pulse">Waiting for agent activity...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* We'll render toolCalls and memoryUpdates. In a real app we'd sort them by time. */}
                      {toolCalls.map((call, idx) => (
                        <div key={`tool-${idx}`} className="border-l-2 border-brand-cyan/30 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-brand-purple font-medium">[{call.agentId}]</span>
                            <span className="text-white/90">Executing <span className="font-semibold text-brand-cyan">{call.name}</span></span>
                            <span className={[
                              "ml-auto text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              call.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' 
                                : call.status === 'failed' ? 'border-rose-500/20 bg-rose-500/10 text-rose-400' 
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-400 animate-pulse'
                            ].join(" ")}>
                              {call.status}
                            </span>
                          </div>
                          <div className="text-white/50 text-xs bg-slate-950/60 p-3 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(call.args, null, 2)}
                          </div>
                          {call.logs && call.logs.length > 0 && (
                            <div className="mt-2 text-white/50 text-xs bg-slate-950/60 p-3 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap">
                              <span className="text-emerald-400/80 mb-1 block">Output logs:</span>
                              {call.logs.join("\n")}
                            </div>
                          )}
                        </div>
                      ))}
                      {memoryUpdates.map((mem, idx) => (
                        <div key={`mem-${idx}`} className="border-l-2 border-brand-purple/30 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-brand-purple font-semibold">[Memory]</span>
                            <span className="text-white/90 font-medium">Updated: <span className="text-brand-purple/90">{mem.key}</span></span>
                          </div>
                          <div className="text-white/60 text-xs bg-slate-950/60 p-3 rounded-lg border border-white/5 whitespace-pre-wrap">
                            {mem.fact}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </PageContainer>
    </main>
  );
}
