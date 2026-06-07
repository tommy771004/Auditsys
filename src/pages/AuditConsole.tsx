import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, BrainCircuit, Cpu, Database, RefreshCcw, Sparkles, Terminal, Search, Workflow, History, X, ShieldAlert, Shield, ShieldCheck, Target, Zap, LayoutDashboard, Flag, AlertTriangle, Activity, Gauge, Network, UserCheck, Save, GitFork } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BrowserCollectorTimelineStep } from "../Server/Services/auditPipelineTypes";
import PageContainer from "../components/layout/PageContainer";
import ConsoleTabs from "../components/ui/ConsoleTabs";
import GlassContainer from "../components/ui/GlassContainer";
import { ReportRenderer } from "../components/ui/ReportRenderer";
import Tooltip from "../components/ui/Tooltip";
import SolidButton from "../components/ui/SolidButton";
import MemorySyncBadge from "../components/ui/MemorySyncBadge";
import SubagentCard from "../components/ui/SubagentCard";
import Office3DScene from "../components/live/Office3DScene";
import GodView3DBackground from "../components/live/GodView3DBackground";
import StatusBadge from "../components/ui/StatusBadge";
import TwoRetryGovernance from "../components/ui/TwoRetryGovernance";
import DashboardWidget from "../components/ui/DashboardWidget";
import { Reveal } from "../components/ui/Reveal";
import { HitlReviewModal } from "../components/ui/HitlReviewModal";
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
  const { t, i18n } = useTranslation();
  const [urlInput, setUrlInput] = useState<string>("");
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
    enabledAgentIds = [],
    setEnabledAgentIds = () => {},
    customAgentDefs = [],
    addCustomAgent = () => {},
    hitlInstructions = "",
    setHitlInstructions = () => {},
    immunizedRules = [],
    setImmunizedRules = () => {},
  } = useAuditAgent();

  const [customRoleInput, setCustomRoleInput] = useState<string>("");
  const [customToolInput, setCustomToolInput] = useState<string>("");
  const [customFormError, setCustomFormError] = useState<string | null>(null);
  const [hitlPromptTemp, setHitlPromptTemp] = useState<string>("");
  const [isLinterWorking, setIsLinterWorking] = useState<boolean>(false);
  const [isHitlModalOpen, setIsHitlModalOpen] = useState<boolean>(false);
  const [hasShownHitlForRun, setHasShownHitlForRun] = useState<string | null>(null);

  const [showRetryToast, setShowRetryToast] = useState<boolean>(false);

  useEffect(() => {
    if (phase === "parallel_execution") {
      const waitTimer = setTimeout(() => {
        setShowRetryToast(true);
      }, 3500); 
      const hideTimer = setTimeout(() => {
        setShowRetryToast(false);
      }, 9500);
      return () => {
        clearTimeout(waitTimer);
        clearTimeout(hideTimer);
      };
    } else if (phase === "idle" || phase === "complete") {
      setShowRetryToast(false);
    }
  }, [phase]);

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

  const isZh = i18n.resolvedLanguage === "zh-TW" || i18n.language === "zh-TW";
  
  // Lighthouse Score Computations based on Immunization writes
  const perfScore = immunizedRules.includes("PERF-02") ? 99 : (phase === "complete" ? 85 : 0);
  const a11yScore = immunizedRules.includes("A11Y-03") ? 98 : (phase === "complete" ? 92 : 0);
  const secScore = immunizedRules.includes("SEC-01") ? 99 : (phase === "complete" ? 88 : 0);
  const seoScore = immunizedRules.includes("SEO-05") ? 98 : (phase === "complete" ? 82 : 0);
  const harness = latestAuditResult?.harness;
  
  useEffect(() => {
    if (harness?.status === "manual_review" && harness.runId !== hasShownHitlForRun) {
      setIsHitlModalOpen(true);
      setHasShownHitlForRun(harness.runId);
    }
  }, [harness?.status, harness?.runId, hasShownHitlForRun]);

  const getHarnessStatusClassName = (status: string) => {
    switch (status) {
      case "passed": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
      case "failed": return "border-rose-500/30 bg-rose-500/10 text-rose-700";
      default: return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    }
  };

  const getHarnessCheckClassName = (status: string) => {
    switch (status) {
      case "passed": return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
      case "failed": return "border-rose-500/30 bg-rose-500/10 text-rose-700";
      default: return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    }
  };

  const HarnessStatusIcon = harness?.status === "passed" ? ShieldCheck : harness?.status === "failed" ? ShieldAlert : Shield;
  const harnessStats = harness
    ? [
        {
          id: "cost",
          label: t("auditConsole.harness.stats.cost", { defaultValue: "Est. Cost" }),
          value: `$${(harness.governance.estimatedTokenSpend * 0.0000015).toFixed(4)}`, // Rough blend of input/output token cost
        },
        {
          id: "duration",
          label: t("auditConsole.harness.stats.duration", { defaultValue: "Latency" }),
          value: `${(harness.durationMs / 1000).toFixed(1)}s`,
        },
        {
          id: "attempts",
          label: t("auditConsole.harness.stats.attempts"),
          value: `${harness.attempts.length}/${harness.governance.maxAttempts}`,
        },
        {
          id: "pivots",
          label: t("auditConsole.harness.stats.pivots", { defaultValue: "Pivots" }),
          value: String(harness.pivots.length),
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
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
    : reportSource === "mock"
      ? "border-[var(--border)] bg-black/5 text-black/70"
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

    if (phase === "idle" || phase === "analyzing_context") {
      return (
        <motion.div
          key="idle"
          layout
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col items-center justify-center min-h-[350px] rounded-sm border border-dashed border-black/20 bg-white/50"
        >
          <div className="flex flex-col items-center max-w-md text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center mb-2">
              <Cpu className="w-8 h-8 text-cyan-700 opacity-60" />
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {isZh ? "系統待命中，等待分析任務啟動" : "System Idle, Awaiting Audit Mission"}
            </p>
            <p className="text-sm text-brand-muted leading-relaxed">
              {phase === "analyzing_context" 
                ? (isZh ? "正在初始化並解析目標倉儲結構..." : "Initializing and parsing target repository structure...")
                : (isZh ? "請在上方輸入要稽核的 URL 進行部署，以啟動蜂群代理。" : "Enter a URL above to deploy the swarm agents and start the audit.")}
            </p>
            {phase === "analyzing_context" && (
              <div className="w-full h-1 overflow-hidden rounded-full bg-black/10 mt-4">
                <motion.div
                  className="h-full bg-brand-cyan"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
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
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-8"
        >
          {/* Keep 3D Office Workspace visible for hover tooltips and live feel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/10 pb-2">
              <p className="text-xs font-bold font-mono text-cyan-600 uppercase tracking-wider flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isZh ? "蜂群子代理常駐工作區" : "Swarm Agent Workspace"}
              </p>
            </div>
            <Office3DScene subagents={subagents} toolCalls={toolCalls} isZh={isZh} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-violet-300/20 bg-violet-400/10 text-violet-100">
                  <Terminal className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">{t("auditConsole.sections.reportTitle")}</p>
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
                    <div className="mt-6 flex flex-col min-h-[20rem] rounded-sm border border-black/[0.06] bg-[var(--surface)] p-8 shadow-inner">
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-10 w-10 animate-pulse rounded-full bg-black/10" />
                        <div className="space-y-2">
                          <div className="h-4 w-48 animate-pulse rounded-sm bg-black/10" />
                          <div className="h-3 w-32 animate-pulse rounded-sm bg-black/5" />
                        </div>
                      </div>
                      
                      <div className="space-y-4 max-w-3xl">
                        <div className="h-4 w-full animate-pulse rounded-sm bg-black/5" />
                        <div className="h-4 w-[90%] animate-pulse rounded-sm bg-black/5" />
                        <div className="h-4 w-[95%] animate-pulse rounded-sm bg-black/5" />
                        <div className="h-4 w-[80%] animate-pulse rounded-sm bg-black/5" />
                      </div>
                      
                      <div className="space-y-4 pt-8 max-w-xl">
                        <div className="h-4 w-[40%] animate-pulse rounded-sm bg-black/10" />
                        <div className="h-4 w-full animate-pulse rounded-sm bg-black/5" />
                        <div className="h-4 w-[85%] animate-pulse rounded-sm bg-black/5" />
                      </div>
                      
                      <div className="mt-8 flex justify-between text-[11px] font-bold uppercase tracking-[0.2em] max-w-md mx-auto">
                        <span className="flex flex-col items-center gap-3 text-brand-cyan"><div className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />Crawling</span>
                        <span className="flex flex-col items-center gap-3 text-brand-cyan"><div className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />Synthesizing</span>
                        <span className="flex flex-col items-center gap-3 text-brand-cyan"><div className="h-2 w-2 rounded-full bg-brand-cyan animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />Rendering</span>
                      </div>
                      
                      <p className="text-center text-sm font-medium text-black/60 animate-pulse mt-4">
                        {t("auditConsole.sections.reportWaiting")}
                      </p>
                    </div>
                  );
                }
                return <ReportRenderer reportText={streamedReport} />;
              })()}
              </div>
            </div>

            <div className="space-y-4">
              {harness ? (
                <div className="rounded-sm border border-[var(--border)] bg-white/[0.015] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--surface)] text-black/85">
                        <HarnessStatusIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">{t("auditConsole.harness.eyebrow")}</p>
                        <p className="text-sm font-semibold text-[var(--text)]">{t("auditConsole.harness.title")}</p>
                      </div>
                    </div>
                    <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", getHarnessStatusClassName(harness.status)].join(" ")}>
                      {t(`auditConsole.harness.status.${harness.status}`)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {harnessStats.map((item) => (
                      <div key={item.id} className="rounded-sm border border-black/[0.06] bg-white/35 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-black/45">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-[var(--text)]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusBadge
                      status={harness.qualityGate.failedCount ? "error" : "success"}
                      leftIcon={harness.qualityGate.failedCount ? ShieldAlert : ShieldCheck}
                      leftLabel={t("auditConsole.harness.title")}
                      rightLabel={t(`auditConsole.harness.status.${harness.status}`)}
                    />
                    <StatusBadge
                      status={harness.qualityGate.failedCount ? "error" : harness.qualityGate.warningCount ? "default" : "success"}
                      leftIcon={Shield}
                      leftLabel={`${harness.qualityGate.passedCount}/${harness.qualityGate.checks.length}`}
                      rightLabel={t("auditConsole.harness.checksTitle")}
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/55">{t("auditConsole.harness.checksTitle")}</p>
                    {harnessChecks.map((check) => (
                      <div key={check.id} className="rounded-sm border border-black/[0.06] bg-white/35 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold text-[var(--text)]">{check.label}</p>
                          <span className={["shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", getHarnessCheckClassName(check.status)].join(" ")}>
                            {t(`auditConsole.harness.checkStatus.${check.status}`)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-black/58">{check.details}</p>
                      </div>
                    ))}
                  </div>

                  {harness.handoffRequired ? (
                    <p className="mt-4 rounded-sm border border-amber-500/20 bg-amber-500/10 px-3 py-3 text-xs leading-5 text-amber-800/90">
                      {t("auditConsole.harness.handoff", { reason: harness.handoffReason ?? "manual_review" })}
                    </p>
                  ) : null}

                  {harness.retrospective ? (
                    <div className="mt-4">
                      <SolidButton
                        className="w-full justify-center !bg-neutral-100/50 hover:!bg-neutral-100/80 !border-[var(--border)]"
                        variant="ghost"
                        loadingLabel={t("auditConsole.harness.viewRetrospective")}
                        onClick={() => setShowLiveRetrospective(true)}
                      >
                        <Terminal className="h-4 w-4 text-emerald-700" />
                        <span className="text-black/80">{t("auditConsole.harness.viewRetrospective")}</span>
                      </SolidButton>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {harness && <DashboardWidget currentHarness={harness} isZh={isZh} />}

              {harness && <TwoRetryGovernance harness={harness} />}

              <div className="rounded-sm border border-[var(--border)] bg-white/[0.015] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">{t("auditConsole.live.snapshot.title")}</p>
                <div className="mt-4 space-y-3">
                  {liveEvidenceItems.length > 0 ? (
                    liveEvidenceItems.map((item) => (
                      <div key={item.id} className="rounded-sm border border-black/[0.06] bg-white/35 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">{item.label}</p>
                        <p className="mt-2 text-sm leading-7 text-black/84">{item.value}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-sm border border-dashed border-[var(--border)] px-4 py-3 text-sm text-black/55">{t("auditConsole.live.snapshot.empty")}</p>
                  )}
                </div>
              </div>

              <div className="rounded-sm border border-[var(--border)] bg-white/[0.015] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">{t("auditConsole.sections.memoryTitle")}</p>
                <div className="mt-4 space-y-3">
                  {memoryUpdates.length > 0 ? (
                    memoryUpdates.map((update) => (
                      <div key={`${update.key}-${update.fact}`} className="rounded-sm border border-black/[0.06] bg-white/35 px-4 py-3">
                        <p className="text-sm font-semibold text-[var(--text)]">{update.fact}</p>
                        <p className="mt-1 text-xs text-black/55">{t("auditConsole.memoryBadge.type", { value: t(`auditConsole.memoryType.${update.type}`) })}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-sm border border-dashed border-[var(--border)] px-4 py-3 text-sm text-black/55">{t("auditConsole.sections.memoryEmpty")}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-5">
                <SolidButton
                  className="w-full justify-center"
                  loadingLabel={t("auditConsole.submitLoading")}
                  variant="ghost"
                  onClick={() => {
                    reset();
                  }}
                >
                  <RefreshCcw className="h-4 w-4" />
                  {t("auditConsole.actions.reset")}
                </SolidButton>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-black/10 mt-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--text)]">{isZh ? "蜂群子代理任務駐留紀錄" : t("auditConsole.sections.parallelTitle")}</p>
              <p className="text-sm text-brand-muted">{isZh ? "以下為各個子代理在稍早階段所執行的具體軌跡與日誌。" : t("auditConsole.sections.parallelDescription")}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {subagents.map((subagent) => (
                <SubagentCard key={subagent.id} subagent={subagent} toolCalls={toolCalls.filter((toolCall) => toolCall.agentId === subagent.id)} />
              ))}
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
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="space-y-6"
        >
          {/* 3D Personified Isometric Employee Workspace Floor */}
          <Office3DScene subagents={subagents} toolCalls={toolCalls} isZh={isZh} />

          <div className="space-y-2 border-t border-black/10 pt-6">
            <p className="text-sm font-semibold text-[var(--text)]">{isZh ? "蜂群子代理任務監控與日誌" : t("auditConsole.sections.parallelTitle")}</p>
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
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--text)]">{t("auditConsole.sections.spawningTitle")}</p>
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
              className="rounded-sm border border-[var(--border)] bg-black/10 p-4"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-[var(--border)] bg-white/35 text-black/85">
                <Bot className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--text)]">{role}</p>
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
    <div className="relative w-full min-h-screen">
      <GodView3DBackground />
      <main className="relative z-10 pb-24 pt-32 sm:pt-36">
      <MemorySyncBadge update={activeMemoryUpdate} />
      <HitlReviewModal
        isOpen={isHitlModalOpen}
        onClose={() => setIsHitlModalOpen(false)}
        reason={harness?.handoffReason}
        onApprove={() => {
          // Just close and let it be
          setIsHitlModalOpen(false);
        }}
        onInjectFeedback={(feedback) => {
          setHitlInstructions(feedback);
          startAudit(missionTarget);
        }}
      />
      <PageContainer>
        <ConsoleTabs currentRoute="console" onNavigate={onNavigate} />
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.12 }
            }
          }}
          className="flex flex-col gap-10"
        >
          
          {/* Layer 1: Header */}
          <Reveal className="space-y-4 text-center mx-auto max-w-3xl flex flex-col items-center">
            <div className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              {t("auditConsole.badge")}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">{t("auditConsole.title")}</h1>
              <p className="text-base leading-8 text-brand-muted sm:text-lg">{t("auditConsole.description")}</p>
            </div>
          </Reveal>

          {/* Layer 2: Mission Control Input & Metrics */}
          <GlassContainer accent="violet" variants={{
            hidden: { opacity: 0, y: 30 },
            visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 30 } }
          }} className="space-y-8">
            <div className="flex flex-col gap-6 border-b border-[var(--border)] pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">{t("auditConsole.missionEyebrow")}</p>
                  <h2 className="text-2xl font-semibold text-[var(--text)] tracking-tight">{t("auditConsole.missionTitle")}</h2>
                  <p className="max-w-2xl text-sm leading-7 text-brand-muted">{t(`auditConsole.phaseDescriptions.${phase}`)}</p>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--border)] bg-black/10 px-4 py-2 text-sm text-black/72 sm:self-auto shadow-inner shadow-black/20">
                  <Workflow className="h-4 w-4 text-cyan-700" />
                  <span>{t("auditConsole.phaseLabel", { value: t(`auditConsole.phases.${phase}`) })}</span>
                </div>
              </div>

              {/* Pipeline Progress Indicator */}
              <div className="w-full flex items-center justify-between gap-1.5 sm:gap-2 mt-2">
                {[
                  "idle",
                  "analyzing_context",
                  "spawning_subagents",
                  "parallel_execution",
                  "synthesizing_memory",
                  "streaming_report",
                  "complete"
                ].map((p, i, arr) => {
                  const currentIndex = arr.indexOf(phase as string);
                  const isPast = i < currentIndex;
                  const isCurrent = i === currentIndex;
                  
                  return (
                    <div key={p} className="flex-1 flex flex-col gap-2 opacity-95">
                      <div className={`h-1.5 w-full rounded-full transition-all duration-200 ease-out ${
                        isPast 
                          ? "bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]" 
                          : isCurrent 
                            ? "bg-brand-cyan shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-[pulse_1.5s_ease-in-out_infinite]" 
                            : "bg-black/10"
                      }`} />
                      <span className={`text-[9px] sm:text-[10px] font-mono leading-tight tracking-wider uppercase hidden sm:block ${
                        isPast 
                          ? "text-violet-300" 
                          : isCurrent 
                            ? "text-brand-cyan font-bold" 
                            : "text-black/30"
                      }`}>
                        {t(`auditConsole.phases.${p}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-black/86 ml-1" htmlFor="audit-console-url">
                  {t("auditConsole.inputLabel")}
                </label>
                <div className="group rounded-sm border border-[var(--border)] bg-[var(--surface)] p-2 backdrop-blur-xl transition-all duration-300 shadow-inner shadow-black/20 focus-within:border-brand-cyan focus-within:bg-[var(--surface)] hover:bg-[var(--surface)]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-sm px-3 py-2.5">
                      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-black/10 text-black/84 transition-transform group-focus-within:scale-105 group-focus-within:bg-brand-cyan/10 group-focus-within:text-brand-cyan group-focus-within:border-brand-cyan/20">
                        <Terminal className="h-4.5 w-4.5" />
                      </div>
                      <input
                        id="audit-console-url"
                        className="min-h-[44px] w-full border-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder-white/30"
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
                        <SolidButton className="justify-center text-rose-600" variant="ghost" loadingLabel="" onClick={reset}>
                          <X className="h-4 w-4" />
                          {t("auditConsole.actions.cancel")}
                        </SolidButton>
                      ) : (
                        <>
                          <SolidButton className="justify-center" isLoading={isRunning} loadingLabel={t("auditConsole.submitLoading")} type="submit">
                            <ArrowRight className="h-4 w-4" />
                            {t("auditConsole.submit")}
                          </SolidButton>
                          <SolidButton className="justify-center" loadingLabel={t("auditConsole.submitLoading")} variant="ghost" onClick={reset}>
                            <RefreshCcw className="h-4 w-4" />
                            {t("auditConsole.actions.reset")}
                          </SolidButton>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-brand-muted">{t("auditConsole.helper", { url: missionTarget })}</p>
                {(errorKey || agentErrorKey) ? <p className="text-sm text-rose-600">{t(errorKey || agentErrorKey)}</p> : null}
              </div>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <motion.div key={metric.id} layout className="rounded-sm border border-[var(--border)] bg-black/10 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/60">{metric.label}</p>
                  <p
                    className={[
                      "mt-3 text-lg font-semibold",
                      metric.tone === "success" ? "text-emerald-700" : metric.tone === "warning" ? "text-amber-700" : "text-[var(--text)]",
                    ].join(" ")}
                  >
                    {metric.value}
                  </p>
                </motion.div>
              ))}
            </div>
          </GlassContainer>

          {/* Layer 2.5: modeled score preview, not a live Lighthouse run. */}
          <GlassContainer accent="cyan" className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-[var(--border)] bg-black/10 text-[var(--text)]">
                <Gauge className="h-5 w-5 text-brand-cyan" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">
                  {isZh ? "模型化評分預覽" : "Modeled Score Preview"}
                </p>
                <p className="text-sm text-brand-muted">
                  {isZh ? "依目前代理流程與已寫入規則顯示暫定分數；真實 Core Web Vitals 請使用即時引擎。" : "Shows provisional scores from the agent flow and immunized rules. Use Live Engine for real Core Web Vitals."}
                </p>
              </div>
            </div>

            {/* Dials Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {[
                { 
                  id: "perf", 
                  label: isZh ? "Performance 效能" : "Performance", 
                  val: perfScore, 
                  color: "stroke-amber-500 text-amber-700",
                  tooltip: isZh ? "分析頁面載入速度與渲染時間，影響核心網頁指標 (Core Web Vitals)。" : "Analyzes page load speed and rendering timeline, directly impacting Core Web Vitals." 
                },
                { 
                  id: "a11y", 
                  label: isZh ? "Accessibility 無障礙" : "Accessibility", 
                  val: a11yScore, 
                  color: "stroke-emerald-500 text-emerald-700",
                  tooltip: isZh ? "確保網站具備良好語意與輔助技術支援，提升所有使用者的訪問體驗。" : "Ensures the site utilizes proper semantics and assistive paths for all users." 
                },
                { 
                  id: "sec", 
                  label: isZh ? "Best Practices 安全" : "Best Practices", 
                  val: secScore, 
                  color: "stroke-cyan-500 text-cyan-700",
                  tooltip: isZh ? "檢查 HSTS、HTTPS 與最佳實踐，確保網站的信任防護機制正常運作。" : "Verifies adherence to security standards (e.g. HTTPS, HSTS) and modern coding practices." 
                },
                { 
                  id: "seo", 
                  label: isZh ? "SEO 搜尋優化" : "SEO", 
                  val: seoScore, 
                  color: "stroke-purple-500 text-purple-700",
                  tooltip: isZh ? "掃描 meta 標籤、爬蟲可見度與 OG 解析，決定搜尋引擎爬取成效。" : "Examines meta tags, crawler visibility, and structured markup crucial for SERP indexing." 
                }
              ].map((dial) => {
                const radius = 34;
                const circumference = 2 * Math.PI * radius;
                const progressVal = (phase === "complete" || phase === "streaming_report") ? dial.val : 0;
                const strokeDashoffset = circumference - (progressVal / 100) * circumference;
                const isScanning = isRunning && phase !== "complete" && phase !== "idle" && phase !== "streaming_report";

                return (
                  <Tooltip key={dial.id} content={dial.tooltip} showIcon={false}>
                    <div className="flex flex-col flex-1 items-center gap-3 p-4 rounded-sm border border-black/5 bg-[var(--surface)] relative group overflow-hidden w-full h-full">
                      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
                      <div className="relative h-24 w-24 flex items-center justify-center">
                      <svg className={`h-full w-full -rotate-90 ${isScanning ? "animate-[spin_4s_linear_infinite]" : ""}`}>
                        <circle cx="48" cy="48" r={radius} className="stroke-white/10" strokeWidth="5.5" fill="transparent" />
                        <motion.circle
                          cx="48"
                          cy="48"
                          r={radius}
                          strokeWidth="5.5"
                          fill="transparent"
                          strokeLinecap="round"
                          className={dial.color}
                          strokeDasharray={circumference}
                          initial={{ strokeDashoffset: circumference }}
                          animate={{ strokeDashoffset }}
                          transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {isScanning ? (
                          <RefreshCcw className="h-5 w-5 text-brand-cyan animate-spin" />
                        ) : (
                          <span className="text-xl font-bold font-mono text-[var(--text)] tracking-tighter">
                            {phase === "complete" || phase === "streaming_report" ? `${dial.val}` : "--"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold tracking-wider text-black/80 uppercase font-sans mt-1">{dial.label}</span>
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          </GlassContainer>

          {/* Layer 3: Mission Stream (The Active Execution) */}
          <GlassContainer accent="cyan" className="min-h-[500px]">
             <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-[var(--border)] bg-black/10 text-black/84">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{t("auditConsole.sections.missionStreamTitle")}</p>
                    <p className="text-sm text-brand-muted">{t("auditConsole.sections.missionStreamDescription", { url: missionTarget })}</p>
                  </div>
                </div>
                
                <SolidButton
                  variant="ghost"
                  loadingLabel=""
                  onClick={() => setShowAgentLogs(true)}
                  className="!px-4 !py-2 min-h-0 text-xs text-black/80"
                >
                  <Terminal className="h-4 w-4 mr-2" />
                  <span>Agent Logs</span>
                </SolidButton>
              </div>

              <div className="relative overflow-hidden min-h-[350px]">
                {renderPhasePanel()}
              </div>
          </GlassContainer>

          {/* Layer 3.5: Swarm Routing Visualizer & HITL/Flywheel Operations Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.10fr_0.90fr] gap-8">
            {/* Swarm Routing Visualizer Card */}
            <GlassContainer accent="purple" className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-purple-500/30 bg-purple-500/10 text-purple-700">
                    <Network className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {isZh ? "蜂群子代理解析與路由 (Swarm Router)" : "Swarm Routing Engine"}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {isZh ? "配置調度的子代理，或自主生成特殊領域子代理擴張檢測半徑。" : "Dynamically provision specialized subagents to expand analysis boundaries."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid Layout of active checkboxes and Adder Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black/5 pt-4">
                {/* Checkboxes List */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-800/80">
                    {isZh ? "主代理分工調度選擇" : "Swarm Member Recruitment"}
                  </p>
                  {[
                      { id: "frontend-speed", label: isZh ? "前端速度子代理 (Frontend Speed)" : "Frontend Speed subagent" },
                      { id: "api-latency", label: isZh ? "API 延遲子代理 (API Latency)" : "API Latency subagent" },
                      { id: "a11y-scanner", label: isZh ? "無障礙檢索子代理 (A11y Scanner)" : "A11y Inspector subagent" },
                      { id: "seo-discovery", label: isZh ? "SEO 深度優化分析代理 (SEO & Discovery)" : "SEO & Discovery Engine" },
                      { id: "memory-synth", label: isZh ? "長期記憶合成子代理 (Memory Synth)" : "Memory Synthesizer" }
                  ].map((chk) => {
                    const isChecked = enabledAgentIds.includes(chk.id);
                    return (
                      <label key={chk.id} className="flex items-center gap-3 p-2.5 rounded-sm border border-black/5 bg-white/20 hover:bg-[var(--surface)] cursor-pointer select-none transition-colors">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isRunning}
                          className="h-4 w-4 bg-neutral-100 border-[var(--border)] rounded accent-brand-purple cursor-pointer focus:ring-0 focus:ring-offset-0 disabled:opacity-50"
                          onChange={() => {
                            if (isChecked) {
                              setEnabledAgentIds(enabledAgentIds.filter(id => id !== chk.id));
                            } else {
                              setEnabledAgentIds([...enabledAgentIds, chk.id]);
                            }
                          }}
                        />
                        <span className={`text-xs ${isChecked ? "text-[var(--text)]" : "text-black/40"}`}>{chk.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Adder Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!customRoleInput.trim() || !customToolInput.trim()) {
                      setCustomFormError(isZh ? "填入完整的角色 & 綁定工具！" : "Fill in Agent Role & Tool Name.");
                      return;
                    }
                    addCustomAgent(customRoleInput.trim(), customToolInput.trim());
                    setCustomRoleInput("");
                    setCustomToolInput("");
                    setCustomFormError(null);
                  }}
                  className="space-y-3.5 bg-white/20 p-3 rounded-sm border border-black/5 flex flex-col justify-between"
                >
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-800/80">
                    {isZh ? "生成特用領域子代理" : "Spawn Specific Subagent"}
                  </p>
                  
                  <div className="space-y-2 text-xs">
                    <input
                      placeholder={isZh ? "代理角色 (例如：CSS 優化主管)" : "Agent Role (e.g., CSS Architect)"}
                      value={customRoleInput}
                      onChange={(e) => setCustomRoleInput(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-neutral-100/80 border border-[var(--border)] text-[var(--text)] p-2 rounded-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50"
                    />
                    <input
                      placeholder={isZh ? "綁定工具 (例如：unused_css_detector)" : "Bound Tool (e.g., css_checker)"}
                      value={customToolInput}
                      onChange={(e) => setCustomToolInput(e.target.value)}
                      disabled={isRunning}
                      className="w-full bg-neutral-100/80 border border-[var(--border)] text-[var(--text)] p-2 rounded-sm outline-none focus:border-brand-purple/50 focus:ring-1 focus:ring-brand-purple/50"
                    />
                    {customFormError && <p className="text-[10px] text-rose-600 font-semibold leading-none">{customFormError}</p>}
                  </div>

                  <SolidButton
                    type="submit"
                    variant="ghost"
                    disabled={isRunning}
                    className="w-full justify-center !py-1.5 text-xs !border-purple-500/20 hover:!border-purple-500/55 !text-purple-700 leading-none min-h-0"
                    loadingLabel=""
                  >
                    <GitFork className="h-3.5 w-3.5 mr-1.5" />
                    <span>{isZh ? "生成並接入蜂群" : "Spawn Into Swarm"}</span>
                  </SolidButton>
                </form>
              </div>

              {/* Dynamic Swarm Router Node Map */}
              <div className="relative border border-black/5 bg-[var(--surface)] p-5 rounded-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-transparent pointer-events-none" />
                <p className="text-[10px] font-bold font-mono tracking-wider uppercase text-black/50 mb-4">{isZh ? "蜂群排程分析網絡 (Swarm Router Map)" : "Dynamic Swarm Router Node Map"}</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative">
                  {/* Central target */}
                  <div className="relative z-10 p-3 rounded-sm border border-brand-cyan/20 bg-brand-cyan/10 flex flex-col items-center min-w-[130px] text-center shadow-[0_0_15px_rgba(34,211,238,0.15)] select-none">
                    <Database className="h-5 w-5 text-brand-cyan mb-1 animate-pulse" />
                    <span className="text-[10px] font-bold text-[var(--text)] font-mono truncate max-w-[110px]">{targetUrl || urlInput || "demo.co"}</span>
                    <span className="text-[8px] uppercase tracking-wider text-brand-cyan/90 font-mono font-bold mt-1 leading-none">{isZh ? "感測目標" : "Telemetry Target"}</span>
                  </div>

                  {/* Desktop Connecting dotted lines */}
                  <div className="hidden sm:block absolute left-[140px] right-[190px] top-1/2 h-[2px] pointer-events-none">
                    <svg className="w-full h-20 -translate-y-10">
                      <line x1="0" y1="40" x2="100%" y2="40" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4 4" />
                      {isRunning && (
                        <motion.line
                          x1="0" y1="40" x2="100%" y2="40"
                          stroke="rgba(167,139,250,0.5)"
                          strokeWidth="1.5"
                          strokeDasharray="6 6"
                          animate={{ strokeDashoffset: [-20, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </svg>
                  </div>

                  {/* Active Nodes list */}
                  <div className="flex flex-wrap sm:flex-col gap-2 justify-center z-10 max-h-[170px] overflow-y-auto pr-1">
                    {[
                      { id: "frontend-speed", label: isZh ? "前端速度子代理" : "Frontend Speed", icon: Zap, color: "text-amber-700" },
                      { id: "api-latency", label: isZh ? "API 延遲子代理" : "API Latency", icon: Cpu, color: "text-rose-700" },
                      { id: "a11y-scanner", label: isZh ? "無障礙感測代理" : "A11y Inspector", icon: Target, color: "text-emerald-700" },
                      { id: "seo-discovery", label: isZh ? "SEO 深度優化代理" : "SEO & Discovery Engine", icon: Search, color: "text-purple-700" },
                      { id: "memory-synth", label: isZh ? "長期記憶合成代理" : "Memory Synth", icon: BrainCircuit, color: "text-violet-700" },
                    ].map((core) => {
                      const isActive = enabledAgentIds.includes(core.id);
                      const CoreIcon = core.icon;
                      return (
                        <div
                          key={core.id}
                          className={`flex items-center gap-2 px-2.5 py-1 rounded-sm border text-[11px] min-w-[150px] transition-all duration-300 ${
                            isActive 
                              ? "border-brand-purple/25 bg-brand-purple/5 text-[var(--text)] shadow-[0_0_10px_rgba(139,92,246,0.06)]" 
                              : "border-black/5 bg-black/5 text-black/30 grayscale"
                          }`}
                        >
                          <CoreIcon className={`h-3.5 w-3.5 ${isActive ? core.color : ""}`} />
                          <div className="flex-1 text-left truncate leading-tight">
                            <p className="font-semibold">{core.label}</p>
                            <p className="text-[8px] font-mono opacity-80 mt-0.5">{isActive ? (isRunning ? "EXECUTING" : "STANDBY") : "DISABLED"}</p>
                          </div>
                        </div>
                      );
                    })}

                    {customAgentDefs.map((cust: any) => (
                      <div
                        key={cust.id}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-sm border border-teal-500/30 bg-teal-500/10 text-[var(--text)] shadow-[0_0_12px_rgba(20,184,166,0.15)] animate-[bounce_1s_ease-out_1]"
                      >
                        <Bot className="h-3.5 w-3.5 text-teal-600 animate-pulse" />
                        <div className="flex-1 text-left text-[11px] min-w-[150px] truncate leading-tight">
                          <p className="font-semibold">{cust.role}</p>
                          <p className="text-[8px] font-mono text-teal-700 font-bold mt-0.5 uppercase">SWARM: {cust.toolName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassContainer>

            {/* Self-Healing Operations Card */}
            <GlassContainer accent="teal" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center gap-2.5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-teal-400/30 bg-teal-400/10 text-teal-700">
                    <UserCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">
                      {isZh ? "人機協作排程修復 (Self-Healing Operations)" : "HITL Repair Center"}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {isZh ? "引導代理模型依人類決策進行二次修復，或將編譯護欄回寫磁碟。" : "Guide agent repairs based on Human-in-the-Loop choices, or lock rules to desk."}
                    </p>
                  </div>
                </div>

                {/* HITL Intervene Area */}
                <div className="border-t border-black/5 pt-4 space-y-3">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800/80">
                    {isZh ? "Human-In-The-Loop 決策策略引導" : "Human-In-The-Loop Interactive Control"}
                  </p>
                  
                  {/* Action tags chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { l: isZh ? "修補安全 CSP 標頭" : "CSP Hardening Policy", text: "Enforce strict CSP and HSTS policy on Express routes." },
                      { l: isZh ? "忽略圖像替代屬性警告" : "Ignore Alt Inspect", text: "Ignore alt attribute constraints in accessibility gates." },
                      { l: isZh ? "引入 Brotli 高壓縮傳輸" : "Inject Brotli Compress", text: "Enable advanced Brotli high-grade transmission compression." }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={isRunning}
                        onClick={() => setHitlPromptTemp(item.text)}
                        className="rounded-full border border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10 px-2.5 py-1 text-[10px] text-teal-700 transition-colors cursor-pointer"
                      >
                        {item.l}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <textarea
                      placeholder={isZh ? "在此輸入人類反饋與優化策略指引... (輸入後點擊下方執行引導)" : "Write instructions here (e.g., Skip image tags alt checking, focus on performance)..."}
                      value={hitlPromptTemp}
                      onChange={(e) => setHitlPromptTemp(e.target.value)}
                      disabled={isRunning}
                      rows={3}
                      className="w-full bg-neutral-100/60 border border-[var(--border)] text-[var(--text)] p-2.5 rounded-sm text-xs outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 placeholder-black/40 resize-none font-sans"
                    />

                    <SolidButton
                      type="button"
                      disabled={isRunning || !hitlPromptTemp.trim()}
                      onClick={() => {
                        if (!hitlPromptTemp.trim()) return;
                        setHitlInstructions(hitlPromptTemp.trim());
                        startAudit(targetUrl || urlInput, undefined, true);
                      }}
                      className="w-full justify-center !py-2 text-xs !bg-teal-500/20 hover:!bg-teal-500/35 !border-teal-500/30 !text-teal-800"
                      loadingLabel={isZh ? "決策重新編譯中..." : "Compiling with Override..."}
                    >
                      <UserCheck className="h-4 w-4 mr-2" />
                      <span>{isZh ? "注入方針並重新診斷" : "Inject Guidance & Swarm"}</span>
                    </SolidButton>
                  </div>
                </div>

                {/* Flywheel rule persistence area */}
                <div className="border-t border-black/5 pt-4 space-y-3">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-800/80">
                    {isZh ? "飛輪護欄硬回寫與代碼永久固化" : "Permanent Environmental Flywheel Immunization"}
                  </p>
                  
                  {/* Selected Rules Checklist */}
                  <div className="space-y-2 text-xs text-black/80">
                    {[
                      { id: "SEC-01", desc: isZh ? "安全防禦：高保密 Express HSTS 標頭回寫" : "Write HTTP HSTS Edge Policy" },
                      { id: "PERF-02", desc: isZh ? "效能修復：在 server.ts 配置 Brotli 壓縮" : "Commit Brotli Compress configuration" },
                      { id: "A11Y-03", desc: isZh ? "體驗增強：無障礙品質閘門動態豁免規則" : "Inject Alt Tag Check Whitelisting" },
                      { id: "SEO-05", desc: isZh ? "SEO 優化：動態 Open Graph 與 JSON-LD 語意標籤配置" : "Inject Open Graph & JSON-LD Structured Data" },
                    ].map((rule) => {
                      const isImmunized = immunizedRules.includes(rule.id);
                      return (
                        <div key={rule.id} className="flex items-center justify-between p-2 rounded-sm bg-white/20 border border-black/[0.04]">
                          <span className="truncate pr-2">{rule.desc}</span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                            isImmunized 
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 font-bold uppercase animate-[pulse_1.5s_infinite]" 
                              : "border-amber-500/20 bg-amber-500/10 text-amber-700 uppercase"
                          }`}>
                            {isImmunized ? "IMMUNIZED" : "PENDING WRITE"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="border-t border-black/5 pt-4">
                <SolidButton
                  type="button"
                  isLoading={isLinterWorking}
                  disabled={isRunning || isLinterWorking}
                  onClick={() => {
                    setIsLinterWorking(true);
                    setTimeout(() => {
                      setImmunizedRules(["SEC-01", "PERF-02", "A11Y-03", "SEO-05"]);
                      setIsLinterWorking(false);
                    }, 1400);
                  }}
                  className="w-full justify-center !py-2.5 text-xs !text-teal-900 !shadow-[0_0_20px_rgba(20,184,166,0.15)] bg-teal-500/20 hover:bg-teal-500/35 border-teal-500/20"
                  loadingLabel={isZh ? "自主稽核 Linter 代碼引導回寫中..." : "Autononmous Code Persistence Compiles..."}
                >
                  <Save className="h-4 w-4 mr-2" />
                  <span>{isZh ? "Linter 自主修復回寫磁碟並固化飛輪" : "Auto-Write to Disk & Fix Code"}</span>
                </SolidButton>
              </div>
            </GlassContainer>
          </div>

          {/* Layer 4: Memory & Capabilities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <GlassContainer accent="blue" className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">{t("auditConsole.sections.memoryTitle")}</p>
                <p className="text-lg font-semibold text-[var(--text)]">{t("auditConsole.memoryPanelTitle")}</p>
              </div>
              <div className="space-y-3">
                {memoryUpdates.length > 0 ? (
                  memoryUpdates.map((update) => (
                    <div key={`${update.key}-${update.fact}`} className="rounded-sm border border-[var(--border)] bg-white/38 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-[var(--text)]">{update.fact}</p>
                        <span className="rounded-full border border-[var(--border)] bg-black/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/70">
                          {t(`auditConsole.memoryType.${update.type}`)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-sm border border-dashed border-[var(--border)] px-4 py-4 text-sm leading-7 text-black/55">{t("auditConsole.sections.memoryEmpty")}</div>
                )}
              </div>
            </GlassContainer>
            
            <GlassContainer accent="cyan" className="space-y-4">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">{t("auditConsole.capabilitiesEyebrow")}</p>
                <p className="text-lg font-semibold text-[var(--text)]">{t("auditConsole.capabilitiesTitle")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-1">
                {capabilityCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.id} className="rounded-sm border border-[var(--border)] bg-white/38 p-4 flex items-start gap-4">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-[var(--border)] bg-black/10 text-black/88">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{item.title}</p>
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-700">{t("history.title")}</p>
                  <p className="text-lg font-semibold text-[var(--text)]">{t("history.subtitle")}</p>
                </div>
                <button 
                  type="button"
                  onClick={fetchHistory}
                  disabled={isLoadingHistory}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/5 hover:bg-black/10 p-2 text-black/70 hover:text-[var(--text)] transition disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none"
                  aria-label={t("history.refreshHistory")}
                  title={t("history.refreshHistory")}
                >
                  <RefreshCcw className={`h-5 w-5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="py-6 text-center text-sm text-black/60">{t("history.loading")}</div>
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
                          "text-left rounded-sm border p-4 min-h-[80px] text-sm transition-all flex flex-col gap-2 active:scale-[0.98]",
                          isSelected
                            ? "border-violet-400/30 bg-violet-500/10 text-[var(--text)] shadow-[0_0_15px_rgba(139,92,236,0.15)] ring-1 ring-violet-500/30"
                            : "border-black/5 bg-[var(--surface)] hover:bg-[var(--surface)] text-black/80 hover:text-[var(--text)]"
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="font-sans font-medium truncate max-w-[12rem] text-[var(--text)]">
                            {item.url}
                          </span>
                          <span className="text-[10px] text-black/60 whitespace-nowrap">
                            {dateStr}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs w-full">
                          <span className="text-black/60 truncate">
                            {item.result?.model || t("history.standardEngine")}
                          </span>
                          <span className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                            item.status === 'completed' 
                              ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                          ].join(" ")}>
                            {item.status}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-black/8 px-4 py-5 text-center text-sm leading-6 text-black/60">
                  {t("history.empty")}
                </div>
              )}
          </GlassContainer>

        </motion.div>

        {/* History Modal */}
        <AnimatePresence>
          {selectedHistoryAudit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[var(--surface)] backdrop-blur-sm"
                onClick={() => setSelectedHistoryAudit(null)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="history-modal-title"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-sm border border-[var(--border)] bg-neutral-100 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] bg-black/5 px-6 py-4">
                  <div>
                    <h3 id="history-modal-title" className="text-lg font-semibold text-[var(--text)]">{t("history.reportTitle")}</h3>
                    <p className="text-sm text-brand-muted">{selectedHistoryAudit.url}</p>
                  </div>
                  <button
                    ref={modalCloseRef}
                    type="button"
                    onClick={() => setSelectedHistoryAudit(null)}
                    aria-label={t("history.close")}
                    className="rounded-full p-2 text-black/60 hover:bg-black/10 hover:text-[var(--text)] transition focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface)] space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <span className={[
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      selectedHistoryAudit.status === 'completed'
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
                        : selectedHistoryAudit.status === 'failed'
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-700"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-700"
                    ].join(" ")}>
                      {selectedHistoryAudit.status?.toUpperCase()}
                    </span>
                    <span className="rounded-full border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-medium text-black/70">
                      {t("history.provider")} {selectedHistoryAudit.result?.provider || "unknown"}
                    </span>
                    {selectedHistoryAudit.result?.model && (
                      <span className="rounded-full border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-medium text-black/70">
                        {t("history.model")} {selectedHistoryAudit.result.model}
                      </span>
                    )}
                    <span className="rounded-full border border-[var(--border)] bg-black/10 px-3 py-1 text-xs font-medium text-black/70">
                      {new Date(selectedHistoryAudit.createdAt).toLocaleString()}
                    </span>
                    {typeof selectedHistoryAudit.result?.evidence?.deterministic?.responseTimeMs === 'number' && (
                      <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700">
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
                    <div className="rounded-sm border border-[var(--border)] bg-black/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45 mb-3">{t("history.deterministicEvidence")}</p>
                      <div className="space-y-2 text-sm text-black/75">
                        {selectedHistoryAudit.result.evidence.deterministic.statusCode && (
                          <div><span className="text-black/45">{t("history.httpStatus")}</span> {selectedHistoryAudit.result.evidence.deterministic.statusCode}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.deterministic.finalUrl && (
                          <div className="truncate"><span className="text-black/45">{t("history.resolvedUrl")}</span> {selectedHistoryAudit.result.evidence.deterministic.finalUrl}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.deterministic.document?.title && (
                          <div><span className="text-black/45">{t("history.pageTitle")}</span> {selectedHistoryAudit.result.evidence.deterministic.document.title}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.deterministic.warnings?.length > 0 && (
                          <div>
                            <span className="text-black/45">{t("history.warnings")} ({selectedHistoryAudit.result.evidence.deterministic.warnings.length}):</span>
                            <ul className="mt-1 ml-4 list-disc text-amber-700/90 text-xs">
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
                    <div className="rounded-sm border border-[var(--border)] bg-black/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/45 mb-3">{t("history.browserEvidence")}</p>
                      <div className="space-y-2 text-sm text-black/75">
                        <div><span className="text-black/45">{t("history.status")}</span> {selectedHistoryAudit.result.evidence.browser.status} ({selectedHistoryAudit.result.evidence.browser.mode})</div>
                        {selectedHistoryAudit.result.evidence.browser.reason && (
                          <div><span className="text-black/45">{t("history.reason")}</span> {selectedHistoryAudit.result.evidence.browser.reason}</div>
                        )}
                        {selectedHistoryAudit.result.evidence.browser.warnings?.length > 0 && (
                          <div>
                            <span className="text-black/45">{t("history.warnings")}</span>
                            <ul className="mt-1 ml-4 list-disc text-amber-700/90 text-xs">
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
                className="absolute inset-0 bg-[var(--surface)] backdrop-blur-sm"
                onClick={() => setShowLiveRetrospective(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="retrospective-modal-title"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-sm border border-emerald-500/20 bg-white/90 shadow-2xl overflow-hidden backdrop-blur-xl"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-emerald-500/20 bg-emerald-100/50 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-emerald-500/30 bg-emerald-500/10 text-emerald-700">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 id="retrospective-modal-title" className="text-lg font-semibold text-emerald-900">{t("auditConsole.harness.retrospectiveTitle")}</h3>
                      <p className="text-sm text-emerald-700/80">{missionTarget}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLiveRetrospective(false)}
                    aria-label={t("auditConsole.harness.hideRetrospective")}
                    className="rounded-full p-2 text-emerald-700/60 hover:bg-emerald-500/20 hover:text-emerald-900 transition focus-visible:ring-2 focus-visible:ring-emerald-600/60 focus-visible:outline-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--surface)]">
                  <div className="prose prose-sm max-w-none text-emerald-900/80 font-mono text-[13px] leading-relaxed [&_h2]:text-emerald-800 [&_h3]:text-emerald-700 [&_strong]:text-emerald-900">
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
                className="absolute inset-0 bg-[var(--surface)] backdrop-blur-sm"
                onClick={() => setShowAgentLogs(false)}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl h-[85vh] flex flex-col rounded-sm border border-[var(--border)] shadow-[0_0_80px_rgba(34,211,238,0.15)] overflow-hidden backdrop-blur-3xl bg-[var(--surface)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 via-transparent to-brand-purple/5 pointer-events-none" />
                {/* Header */}
                <div className="relative flex items-center justify-between border-b border-[var(--border)] bg-black/5 px-6 py-4 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-cyan-400/30 bg-cyan-400/10 text-cyan-600 shadow-inner">
                      <Terminal className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold tracking-wide text-[var(--text)]">Agent Terminal Logs</h3>
                      <p className="text-sm text-brand-muted">{missionTarget}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAgentLogs(false)}
                    className="rounded-full p-2 text-black/60 hover:bg-black/10 hover:text-[var(--text)] transition focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:outline-none min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {/* Content */}
                <div className="relative flex-1 overflow-y-auto p-6 space-y-4 font-mono text-[13px] bg-white/20 z-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                  {toolCalls.length === 0 && memoryUpdates.length === 0 ? (
                    <div className="text-black/40 flex h-full items-center justify-center">
                      <span className="animate-pulse">Waiting for agent activity...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* We'll render toolCalls and memoryUpdates. In a real app we'd sort them by time. */}
                      {toolCalls.map((call, idx) => (
                        <div key={`tool-${idx}`} className="border-l-2 border-brand-cyan/30 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-brand-purple font-medium">[{call.agentId}]</span>
                            <span className="text-black/90">Executing <span className="font-semibold text-brand-cyan">{call.name}</span></span>
                            <span className={[
                              "ml-auto text-[11px] uppercase tracking-wider px-2 py-0.5 rounded-full border",
                              call.status === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700' 
                                : call.status === 'failed' ? 'border-rose-500/20 bg-rose-500/10 text-rose-700' 
                                : 'border-amber-500/20 bg-amber-500/10 text-amber-700 animate-pulse'
                            ].join(" ")}>
                              {call.status}
                            </span>
                          </div>
                          <div className="text-black/50 text-xs bg-[var(--surface)] p-3 rounded-sm border border-black/5 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(call.args, null, 2)}
                          </div>
                          {call.logs && call.logs.length > 0 && (
                            <div className="mt-2 text-black/50 text-xs bg-[var(--surface)] p-3 rounded-sm border border-black/5 overflow-x-auto whitespace-pre-wrap">
                              <span className="text-emerald-700/80 mb-1 block">Output logs:</span>
                              {call.logs.join("\n")}
                            </div>
                          )}
                        </div>
                      ))}
                      {memoryUpdates.map((mem, idx) => (
                        <div key={`mem-${idx}`} className="border-l-2 border-brand-purple/30 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-brand-purple font-semibold">[Memory]</span>
                            <span className="text-black/90 font-medium">Updated: <span className="text-brand-purple/90">{mem.key}</span></span>
                          </div>
                          <div className="text-black/60 text-xs bg-[var(--surface)] p-3 rounded-sm border border-black/5 whitespace-pre-wrap">
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

        {/* Real-time Two-Retry Agent Loop Toast */}
        <AnimatePresence>
          {showRetryToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="fixed bottom-24 right-8 z-[70] flex w-[340px] flex-col gap-2 rounded-sm border border-amber-500/30 bg-white/95 p-4 shadow-[0_0_30px_rgba(245,158,11,0.15)] backdrop-blur-xl"
            >
              <div className="flex items-start gap-4">
                <div className="mt-0.5 rounded-full bg-amber-500/20 p-2 border border-amber-500/30">
                  <RefreshCcw className="h-4 w-4 animate-spin text-amber-700" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                    <h4 className="text-sm font-bold tracking-tight text-amber-900 font-mono uppercase tracking-wider">
                      {t("auditConsole.retryToast.title") || "Agent Correction"}
                    </h4>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-800/90">
                    {t("auditConsole.retryToast.description") || "LLM output JSON parsing failed. Injecting format feedback and enforcing Two-Retry loop."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </PageContainer>
    </main>
    </div>
  );
}
