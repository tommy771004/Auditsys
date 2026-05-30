import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bot, BrainCircuit, Cpu, Database, RefreshCcw, Sparkles, Terminal, Workflow, History, X, ShieldAlert, Shield, ShieldCheck, Target, Zap, LayoutDashboard, Flag, CheckCircle2, Scale, Binary } from "lucide-react";
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
import RalphLoopSimulator from "../components/live/RalphLoopSimulator";
import PgeAgentDebateSimulator from "../components/live/PgeAgentDebateSimulator";
import EngineTacticalCockpit from "../components/live/EngineTacticalCockpit";
import { soundManager } from "../utils/audioSynth";
import LongTermMemoryPanel from "../components/live/LongTermMemoryPanel";

interface AuditConsoleProps {
  onNavigate: NavigateTo;
}

function ContextPrunerAnimation() {
  const { t } = useTranslation();
  const [tokenCount, setTokenCount] = useState(16420);
  const [activeLogs, setActiveLogs] = useState<string[]>([]);
  const [attentionLevel, setAttentionLevel] = useState(15);
  const [currentStep, setCurrentStep] = useState(1); // 1: scanning, 2: compressing, 3: completed

  useEffect(() => {
    // 1. Token count countdown
    const duration = 1800;
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const decrement = (16420 - 300) / steps;
    
    let currentToken = 16420;
    const tokenTimer = setInterval(() => {
      currentToken = Math.max(300, currentToken - decrement);
      setTokenCount(Math.round(currentToken));
      if (currentToken <= 300) {
        clearInterval(tokenTimer);
      }
    }, intervalTime);

    // 2. Attention meter increment
    const attIncrement = (100 - 15) / steps;
    let currentAtt = 15;
    const attTimer = setInterval(() => {
      currentAtt = Math.min(100, currentAtt + attIncrement);
      setAttentionLevel(Math.round(currentAtt));
      if (currentAtt >= 100) {
        clearInterval(attTimer);
      }
    }, intervalTime);

    // 3. Log typing simulation
    const logSteps = [
      { delay: 100, text: t("contextPruning.logs.step1") },
      { delay: 350, text: t("contextPruning.logs.step2") },
      { delay: 650, text: t("contextPruning.logs.step3") },
      { delay: 950, text: t("contextPruning.logs.step4") },
      { delay: 1250, text: t("contextPruning.logs.step5") },
      { delay: 1550, text: t("contextPruning.logs.step6") },
    ];

    const logTimers = logSteps.map((step, idx) => {
      return setTimeout(() => {
        setActiveLogs((prev) => [...prev, step.text]);
        if (idx === 1) setCurrentStep(2); // compressing
        if (idx === 5) setCurrentStep(3); // completed
      }, step.delay);
    });

    return () => {
      clearInterval(tokenTimer);
      clearInterval(attTimer);
      logTimers.forEach(clearTimeout);
    };
  }, [t]);

  return (
    <motion.div
      key="context_pruning_panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Pruner Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand-cyan" />
              {t("contextPruning.title")}
            </h4>
          </div>
          <p className="text-sm text-brand-muted">{t("contextPruning.subtitle")}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1.5 text-xs text-pink-300">
          <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
          <span>{t("contextPruning.shieldArmed")}</span>
        </div>
      </div>

      {/* Main Grid: Comparison & Diagnostics */}
      <div className="grid gap-6 md:grid-cols-12">
        
        {/* Left column: Visual comparisons & gauges (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-5 relative overflow-hidden">
            
            {/* LASER SWEEP ANIMATION */}
            {currentStep === 2 && (
              <motion.div 
                className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]"
                animate={{ top: ["5%", "95%", "5%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            )}

            {/* Token countdown cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
                <span className="text-xs text-white/40 font-medium uppercase tracking-wider">{t("contextPruning.originalSize")}</span>
                <p className="mt-1 text-2xl font-mono font-bold text-rose-400/80 line-through">16,420 chars</p>
                <p className="text-[10px] text-white/55 mt-1">Raw subagents' terminal log noise</p>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4 relative overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-brand-cyan/[0.02]"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-xs text-brand-cyan/70 font-medium uppercase tracking-wider">{t("contextPruning.prunedSize")}</span>
                <p className="mt-1 text-2xl font-mono font-bold text-brand-cyan flex items-center gap-2">
                  <span>{tokenCount.toLocaleString()}</span>
                  <span className="text-xs text-white/40">tokens</span>
                </p>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <motion.div 
                    className="h-full bg-brand-cyan" 
                    initial={{ width: "100%" }}
                    animate={{ width: `${(tokenCount / 16420) * 100}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>

            {/* Risk meters */}
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60 font-medium">{t("contextPruning.attentionDilution")}</span>
                  <span className={attentionLevel > 80 ? "text-emerald-300 font-semibold" : "text-amber-300 font-semibold animate-pulse"}>
                    {attentionLevel > 80 ? t("contextPruning.attentionDilutionLow") : t("contextPruning.attentionDilutionHigh")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-900 overflow-hidden flex">
                  {/* focus recovery meter progresses, starting red and finishing full emerald */}
                  <motion.div 
                    className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" 
                    initial={{ width: "15%" }}
                    animate={{ width: `${attentionLevel}%` }}
                    transition={{ ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4.5 flex items-center justify-between">
                <div>
                  <span className="text-xs text-white/40 font-medium">{t("contextPruning.redundancyEvicted")}</span>
                  <p className="text-xl font-mono font-bold text-emerald-400">75% (12.4k chars removed)</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-emerald-300">
                  <Zap className="h-5 w-5 text-emerald-300" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right column: Pruner Real-time Diagnostics (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 font-mono text-xs text-white/80 h-full min-h-[220px] flex flex-col justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Harness Pruner Diagnostics</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-brand-cyan">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-cyan animate-pulse" />
                  STREAMS ACTIVE
                </span>
              </div>
              
              <div className="space-y-2 max-h-[170px] overflow-y-auto custom-scrollbar">
                {activeLogs.map((log, index) => {
                  const isSuccess = log.startsWith("✅");
                  const isWarning = log.startsWith("🛡️");
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={[
                        "leading-5",
                        isSuccess ? "text-emerald-300 font-medium" : isWarning ? "text-amber-300" : "text-white/70"
                      ].join(" ")}
                    >
                      {log}
                    </motion.div>
                  );
                })}
              </div>

              {activeLogs.length < 6 && (
                <div className="flex items-center gap-1.5 text-white/30 animate-pulse mt-2">
                  <span className="inline-block h-3 w-1.5 bg-white/70" />
                  <span>
                    {currentStep === 1 ? t("contextPruning.scanningRedundancy") : t("contextPruning.compressing")}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-2 mt-2 text-[10px] text-white/40 flex items-center justify-between">
              <span>Attention: {attentionLevel}%</span>
              <span>Memory window optimized</span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

function CyberneticRadarScope({ targetUrl }: { targetUrl: string }) {
  const { t } = useTranslation();
  const [radialProgress, setRadialProgress] = useState(0);
  const [visitedCount, setVisitedCount] = useState(8);
  const [domDepth, setDomDepth] = useState(3);
  const [currentAsset, setCurrentAsset] = useState("initiating crawler...");
  const [foundTags, setFoundTags] = useState<string[]>([]);

  useEffect(() => {
    // 1. Play scan pulses during active search
    soundManager.play("scan_pulse");
    const pulseInterval = setInterval(() => {
      soundManager.play("scan_pulse");
    }, 1800);

    // 2. Increment stats
    const progressInterval = setInterval(() => {
      setRadialProgress((p) => {
        if (p >= 100) return 100;
        return p + Math.floor(Math.random() * 8) + 2;
      });
      setVisitedCount((v) => v + Math.floor(Math.random() * 24) + 6);
      setDomDepth((d) => Math.min(18, d + (Math.random() > 0.8 ? 1 : 0)));
    }, 350);

    // 3. Scan DOM node items
    const domAssets = [
      "<div#app_root>", "header.nav-bar", "script[src='/assets/index-bundle.js']",
      "style.theme-css", "img#logo_element", "section#main_hero",
      "div.grid-bento_col", "footer.p-10", "button#cta_trigger",
      "svg.icon-chevron", "React.Suspense", "iframe#preview_mount"
    ];
    let assetIndex = 0;
    const assetsInterval = setInterval(() => {
      if (assetIndex < domAssets.length) {
        const nextAsset = domAssets[assetIndex];
        setCurrentAsset(`indexing: ${nextAsset}`);
        setFoundTags((prev) => [...prev.slice(-4), nextAsset]);
        soundManager.play("type_key");
        assetIndex++;
      } else {
        setCurrentAsset("synchronizing virtual sandbox model...");
      }
    }, 600);

    return () => {
      clearInterval(pulseInterval);
      clearInterval(progressInterval);
      clearInterval(assetsInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-6 gap-8 w-full">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] font-mono font-bold uppercase text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          ACTIVE PROBE CRAWLER RUNNING
        </div>
        <p className="text-sm font-semibold text-white/90">Analyzing DOM structure and API gates of {targetUrl}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 w-full max-w-4xl items-center mt-2">
        <div className="flex justify-center relative">
          <div className="relative w-64 h-64 border border-cyan-500/20 rounded-full flex items-center justify-center bg-slate-950/40 shadow-[0_0_50px_rgba(6,182,212,0.1)] overflow-hidden scale-110">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.03),transparent_70%)]" />
            <div className="absolute w-48 h-48 border border-cyan-500/10 rounded-full border-dashed" />
            <div className="absolute w-32 h-32 border border-cyan-500/15 rounded-full" />
            <div className="absolute w-16 h-16 border border-cyan-500/5 rounded-full border-dashed" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-500/10" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-cyan-500/10" />
            
            <motion.div
              className="absolute top-1/2 left-1/2 h-[120px] w-1 bg-gradient-to-t from-cyan-400 via-cyan-400/40 to-transparent origin-bottom -translate-y-full shadow-[0_0_10px_#22d3ee]"
              style={{ originX: "50%", originY: "100%" }}
              animate={{ rotate: 360 }}
              transition={{ ease: "linear", duration: 3.5, repeat: Infinity }}
            />

            {foundTags.map((tag, i) => {
              const angle = (i * 73) % 360;
              const radius = 40 + (i * 19) % 65;
              const rad = (angle * Math.PI) / 180;
              const x = radius * Math.cos(rad);
              const y = radius * Math.sin(rad);

              return (
                <motion.div
                  key={`${tag}-${i}`}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1, 0.7] }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                  className="absolute p-1 rounded bg-cyan-500/10 border border-cyan-400/20 text-[9px] font-mono text-cyan-300"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)"
                  }}
                >
                  {tag.replace(/<|>/g, '')}
                </motion.div>
              );
            })}

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-cyan-400/70 uppercase font-semibold">
              RANGE: 4.8 METERS
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-5 font-mono text-xs space-y-4">
          <div className="flex justify-between items-center border-b border-cyan-500/10 pb-2 text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
            <span>📡 DOM Parser Telemetry</span>
            <span className="animate-pulse">● CAPTURED_DOM</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <span className="text-[10px] text-white/40 uppercase font-semibold block">Parsed DOM nodes</span>
              <p className="text-xl font-bold font-mono text-white mt-1 animate-pulse">{visitedCount}</p>
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <span className="text-[10px] text-white/40 uppercase font-semibold block">Max Dom Depth</span>
              <p className="text-xl font-bold font-mono text-cyan-300 mt-1">Level {domDepth}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-white/60">
              <span>Scanning progress</span>
              <span className="font-bold text-cyan-300">{Math.min(100, radialProgress)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, radialProgress)}%` }}
                transition={{ ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-3 mt-1 text-[10px] text-cyan-300 space-y-1.5 leading-normal">
            <div className="flex gap-2 text-white/40">
              <span className="text-cyan-400">&gt;</span>
              <span>{currentAsset}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span className="text-white/70">WAF protection profiles bypass: Armed</span>
            </div>
            <div className="flex gap-2 text-white/50">
              <span className="text-cyan-400">&gt;</span>
              <span>Headless sandboxed browser frame online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [approvedFactKeys, setApprovedFactKeys] = useState<Set<string>>(new Set());

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
    approveQualityGate,
    reset,
  } = useAuditAgent();

  useEffect(() => {
    if (memoryUpdates.length > 0) {
      setApprovedFactKeys(new Set(memoryUpdates.map(m => m.key)));
    }
  }, [memoryUpdates]);

  const toggleFactApproval = (key: string) => {
    const next = new Set(approvedFactKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setApprovedFactKeys(next);
  };

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
    {
      id: "ralph",
      icon: Terminal,
      title: t("auditConsole.capabilities.ralph.title"),
      description: t("auditConsole.capabilities.ralph.description"),
    },
    {
      id: "pge",
      icon: Scale,
      title: t("auditConsole.capabilities.pge.title"),
      description: t("auditConsole.capabilities.pge.description"),
    },
  ];

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedUrl = urlInput.trim();

    if (!normalizedUrl) {
      soundManager.play("warning");
      setErrorKey("validation.requiredUrl");
      return;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        soundManager.play("warning");
        setErrorKey("validation.invalidUrl");
        return;
      }
    } catch {
      soundManager.play("warning");
      setErrorKey("validation.invalidUrl");
      return;
    }

    setErrorKey(null);
    setSelectedHistoryAudit(null);
    soundManager.play("engine_start");
    await startAudit(normalizedUrl);
  };

  const renderPhasePanel = () => {
    // History is now shown via the dedicated Modal below — do not render inline here.

    if (phase === "analyzing_context" || phase === "spawning_subagents") {
      return <CyberneticRadarScope targetUrl={missionTarget} />;
    }

    if (phase === "context_pruning") {
      return <ContextPrunerAnimation />;
    }

    if (phase === "quality_gate") {
      return (
        <motion.div
          key="quality_gate"
          layout
          initial={{ opacity: 0, scale: 0.98, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -16 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="rounded-[28px] border border-amber-500/30 bg-slate-950/70 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(245,158,11,0.06)] ring-1 ring-amber-500/10"
        >
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/10 pb-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 animate-pulse">
                    HUMAN-IN-THE-LOOP ACTIVE
                  </span>
                  <span className="text-[10px] font-mono text-white/40">GATEWAY_INTERCEPT_ARMED</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-white">
                  {t("auditConsole.phases.quality_gate")}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                  {t("auditConsole.phaseDescriptions.quality_gate")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <GlowingButton
                onClick={() => {
                  if (approveQualityGate) {
                    approveQualityGate();
                  }
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_25px_rgba(245,158,11,0.6)] font-bold px-6 py-2.5 rounded-full transition-all duration-300 shrink-0"
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                核准修復事實並釋放報告
              </GlowingButton>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Col: Review & Toggle facts */}
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-400">
                🔍 待查核之長期記憶載入 (Synthesized Runtime Facts)
              </p>
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {memoryUpdates.length > 0 ? (
                  memoryUpdates.map((update, idx) => (
                    <motion.div
                      key={`${update.key}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative flex items-start gap-4 rounded-[22px] border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center h-5 mt-0.5">
                        <input
                          type="checkbox"
                          checked={approvedFactKeys.has(update.key)}
                          onChange={() => toggleFactApproval(update.key)}
                          className="h-4 w-4 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-950 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-mono uppercase text-brand-cyan bg-brand-cyan/10 px-1.5 py-0.5 rounded border border-brand-cyan/20">
                            {t(`auditConsole.memoryType.${update.type}`, { defaultValue: update.type })}
                          </span>
                          <span className="text-[9px] font-mono text-white/30">KEY: {update.key}</span>
                        </div>
                        <p className="text-sm font-semibold text-white group-hover:text-amber-200 transition-colors">
                          {update.fact}
                        </p>
                        {update.detail && (
                          <div className="rounded-lg bg-black/40 p-2 mt-1">
                            <p className="text-xs font-mono text-slate-400 whitespace-pre-line leading-relaxed">{update.detail}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/55">
                    {t("auditConsole.sections.memoryEmpty")}
                  </p>
                )}
              </div>
            </div>

            {/* Right Col: Diagnostics HUD & System Confidence */}
            <div className="rounded-[24px] border border-white/5 bg-slate-950/40 p-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-400">📊 品保與信心指數 (Safety Controls)</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-center">
                      <p className="text-2xl font-bold font-mono text-green-400">98%</p>
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mt-1">Harness 信心閾值</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-center">
                      <p className="text-2xl font-bold font-mono text-brand-cyan">100%</p>
                      <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mt-1">注意力聚焦度</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">執行安全性 (Sanitizer status)</span>
                    <span className="font-mono text-green-400">PASSED</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-900">
                    <div className="h-full w-full rounded-full bg-green-500" />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/60">長期記憶對其度 (Context Alignment)</span>
                    <span className="font-mono text-cyan-400">OPTIMAL</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-900">
                    <div className="h-full w-[90%] rounded-full bg-cyan-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3 text-xs leading-relaxed text-amber-200">
                <div className="shrink-0 h-5 w-5 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-300">⚠️</div>
                <p>
                  人類協作說明：您可以點選確認要編入最終流式報告的最關鍵修復發現。經覈准後，閘門將完全解鎖並開始 streaming 報告。
                </p>
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
                          soundManager.play("type_key");
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

          {/* Layer 2.5: Unified Active Sandbox Control Cockpit */}
          <EngineTacticalCockpit />

          {/* Layer 3: Mission Stream (The Active Execution) */}
          <GlassContainer accent="cyan" className="min-h-[500px]">
             <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4 mb-6">
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
          </GlassContainer>

          {/* Layer 3.5: Ralph Loop Active Auto-Fixer Simulator */}
          <RalphLoopSimulator />

          {/* Layer 3.6: PGE Code Debate & Adversarial Simulator */}
          <PgeAgentDebateSimulator />

          {/* Layer 4: Interactive Long-term Memory Engine */}
          <LongTermMemoryPanel
            memoryUpdates={memoryUpdates}
            activeUpdate={activeMemoryUpdate}
            approvedFactKeys={approvedFactKeys}
            toggleFactApproval={toggleFactApproval}
            targetUrl={missionTarget}
          />

          {/* Layer 4.5: Engine Integration Capabilities */}
          <GlassContainer accent="cyan" className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/82">{t("auditConsole.capabilitiesEyebrow")}</p>
              <h3 className="text-xl font-bold text-white tracking-tight">{t("auditConsole.capabilitiesTitle")}</h3>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {capabilityCards.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.id} className="rounded-[24px] border border-white/10 bg-slate-950/38 p-5 flex items-start gap-4 hover:bg-slate-900/40 transition-all duration-200">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/88">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1.5 text-xs leading-6 text-brand-muted">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassContainer>

          {/* Layer 5: Audit History */}
          <GlassContainer accent="purple" className="space-y-4 animate-fade-in">
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
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-3xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{t("history.reportTitle")}</h3>
                    <p className="text-sm text-brand-muted">{selectedHistoryAudit.url}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryAudit(null)}
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

      </PageContainer>
    </main>
  );
}
