import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Radio, RefreshCcw, ScanSearch, Sparkles, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import ConsoleTabs from "../components/ui/ConsoleTabs";
import GlassContainer from "../components/ui/GlassContainer";
import GlowingButton from "../components/ui/GlowingButton";
import CoreWebVitalsCard from "../components/live/CoreWebVitalsCard";
import DOMIssueHighlighter from "../components/live/DOMIssueHighlighter";
import ExecutionTerminal from "../components/live/ExecutionTerminal";
import ScanSummaryPanel from "../components/live/ScanSummaryPanel";
import AnalyticsChartsPanel from "../components/ui/AnalyticsChartsPanel";
import StatusBadge from "../components/ui/StatusBadge";
import { Reveal } from "../components/ui/Reveal";
import { useRealTimeAudit } from "../hooks/useRealTimeAudit";
import type { ExecutionStatus } from "../types/liveAudit.types";
import type { NavigateTo } from "../types/home";

interface RealAuditDashboardProps {
  onNavigate: NavigateTo;
}

const DEFAULT_TARGET = "https://taiwanrail.vercel.app";

const STATUS_TONE: Record<ExecutionStatus, string> = {
  idle: "border-white/10 bg-white/[0.05] text-white/70",
  connecting: "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan",
  scanning: "border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan",
  analyzing: "border-violet-400/25 bg-violet-400/10 text-violet-100",
  complete: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
  error: "border-rose-400/25 bg-rose-400/10 text-rose-100",
};

const STATUS_PROGRESS: Record<ExecutionStatus, number> = {
  idle: 0,
  connecting: 15,
  scanning: 45,
  analyzing: 75,
  complete: 100,
  error: 100,
};

/**
 * Task D — The Main Orchestrator.
 * Drives the strict real-network flow:
 *   Connect SSE → Stream Logs → Fetch PageSpeed → Fetch DOM Issues → Close SSE → Final Report.
 * All transitions are powered by `useRealTimeAudit`; `AnimatePresence` smooths the
 * handoff between live states.
 */
export default function RealAuditDashboard({ onNavigate }: RealAuditDashboardProps) {
  const { t } = useTranslation();
  const [urlInput, setUrlInput] = useState<string>(DEFAULT_TARGET);
  const [validationKey, setValidationKey] = useState<string | null>(null);

  const { state, logs, domIssues, summary, errorMessage, startScan, stopScan } = useRealTimeAudit();

  const isRunning = state.status === "connecting" || state.status === "scanning" || state.status === "analyzing";
  // PageSpeed is fetched once the live scan reaches the Lighthouse (analyzing) stage.
  const lighthouseActive = state.status === "analyzing" || state.status === "complete";
  const showReport = state.status === "complete";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUrl = urlInput.trim();

    if (!normalizedUrl) {
      setValidationKey("validation.requiredUrl");
      return;
    }
    try {
      const parsed = new URL(normalizedUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        setValidationKey("validation.invalidUrl");
        return;
      }
    } catch {
      setValidationKey("validation.invalidUrl");
      return;
    }

    setValidationKey(null);
    startScan(normalizedUrl);
  };

  return (
    <main className="relative z-10 pb-24 pt-32 sm:pt-36">
      <PageContainer>
        <ConsoleTabs currentRoute="live" onNavigate={onNavigate} />
        <div className="flex flex-col gap-10">
          {/* Header */}
          <Reveal className="mx-auto flex max-w-3xl flex-col items-center space-y-4 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100/92">
              <Radio className="h-3.5 w-3.5" />
              {t("liveAudit.badge")}
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">{t("liveAudit.title")}</h1>
              <p className="text-base leading-8 text-brand-muted sm:text-lg">{t("liveAudit.description")}</p>
            </div>
          </Reveal>

          {/* Mission control input */}
          <GlassContainer accent="cyan" className="space-y-6">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">{t("liveAudit.missionEyebrow")}</p>
                <h2 className="text-2xl font-semibold text-white">{t("liveAudit.missionTitle")}</h2>
              </div>
              <div className="flex flex-col items-start gap-3 sm:items-end">
                <div className={["inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm", STATUS_TONE[state.status]].join(" ")}>
                  <ScanSearch className="h-4 w-4" />
                  <span>{t("liveAudit.phaseLabel", { value: t(`liveAudit.status.${state.status}`) })}</span>
                </div>
                
                {state.status !== "idle" && (
                  <div className="h-1.5 w-full sm:w-48 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${
                        state.status === "error"
                          ? "bg-rose-400"
                          : state.status === "complete"
                            ? "bg-emerald-400"
                            : state.status === "analyzing"
                              ? "bg-violet-400"
                              : "bg-brand-cyan"
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${STATUS_PROGRESS[state.status]}%` }}
                      transition={{ duration: 0.8, ease: "easeInOut" }}
                    />
                  </div>
                )}
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="text-sm font-medium text-white/86" htmlFor="live-audit-url">
                {t("liveAudit.inputLabel")}
              </label>
              <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-2 backdrop-blur-xl transition focus-within:border-brand-cyan focus-within:ring-2 focus-within:ring-brand-cyan/50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] px-3 py-2.5">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white/84">
                      <Radio className="h-4 w-4" />
                    </div>
                    <input
                      id="live-audit-url"
                      className="min-h-[44px] w-full border-0 bg-transparent text-sm text-white outline-none"
                      value={urlInput}
                      placeholder={t("liveAudit.inputPlaceholder")}
                      disabled={isRunning}
                      onChange={(event) => {
                        setUrlInput(event.target.value);
                        if (validationKey) {
                          setValidationKey(null);
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    {isRunning ? (
                      <GlowingButton className="justify-center text-rose-200" variant="ghost" onClick={stopScan} loadingLabel="">
                        <X className="h-4 w-4" />
                        {t("liveAudit.actions.cancel")}
                      </GlowingButton>
                    ) : (
                      <GlowingButton className="justify-center" type="submit" loadingLabel="">
                        <ArrowRight className="h-4 w-4" />
                        {t("liveAudit.actions.start")}
                      </GlowingButton>
                    )}
                  </div>
                </div>
              </div>
              {validationKey ? <p className="text-sm text-rose-200">{t(validationKey)}</p> : null}
            </form>
          </GlassContainer>

          {/* Live execution grid */}
          <AnimatePresence mode="wait" initial={false}>
            {state.status === "error" ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22 }}
              >
                <GlassContainer accent="violet" className="flex flex-col items-center gap-4 py-12 text-center">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl border border-rose-400/25 bg-rose-500/10 text-rose-200">
                    <TriangleAlert className="h-7 w-7" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">{t("liveAudit.errorState.title")}</p>
                    <p className="mx-auto max-w-md text-sm leading-7 text-brand-muted">{t("liveAudit.errorState.description")}</p>
                    {errorMessage ? (
                      <code className="inline-block rounded-lg bg-slate-950/60 px-3 py-1 text-xs text-rose-200">{errorMessage}</code>
                    ) : null}
                  </div>
                  <GlowingButton variant="ghost" loadingLabel="" onClick={() => startScan(urlInput.trim())}>
                    <RefreshCcw className="h-4 w-4" />
                    {t("liveAudit.actions.retry")}
                  </GlowingButton>
                </GlassContainer>
              </motion.div>
            ) : state.status === "idle" ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22 }}
              >
                <GlassContainer accent="blue" className="flex flex-col items-center gap-3 py-14 text-center">
                  <Sparkles className="h-8 w-8 text-cyan-200" />
                  <p className="text-lg font-semibold text-white">{t("liveAudit.idleState.title")}</p>
                  <p className="mx-auto max-w-md text-sm leading-7 text-brand-muted">{t("liveAudit.idleState.description")}</p>
                </GlassContainer>
              </motion.div>
            ) : (
              <motion.div
                key="live"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                {showReport && summary ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-3">
                      <StatusBadge
                        status="success"
                        leftIcon={ScanSearch}
                        leftLabel={t("liveAudit.badge")}
                        rightLabel={t(`liveAudit.status.${state.status}`)}
                      />
                      <StatusBadge
                        status={domIssues.length ? "error" : "success"}
                        leftIcon={domIssues.length ? TriangleAlert : ScanSearch}
                        leftLabel={t("liveAudit.dom.title")}
                        rightLabel={String(domIssues.length)}
                      />
                    </div>
                    <AnalyticsChartsPanel />
                    <ScanSummaryPanel summary={summary} />
                  </div>
                ) : null}

                <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <div className="space-y-6">
                  <ExecutionTerminal logs={logs} status={state.status} />

                  <AnimatePresence>
                    {showReport ? (
                      <motion.div
                        key="dom"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.24 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center gap-3">
                          <ScanSearch className="h-5 w-5 text-violet-200" />
                          <div>
                            <p className="text-sm font-semibold text-white">{t("liveAudit.dom.title")}</p>
                            <p className="text-xs text-brand-muted">{t("liveAudit.dom.subtitle")}</p>
                          </div>
                        </div>
                        <DOMIssueHighlighter issues={domIssues} />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="space-y-6">
                  <CoreWebVitalsCard targetUrl={state.targetUrl} active={lighthouseActive} />

                  {showReport ? (
                    <GlassContainer accent="violet" className="space-y-3">
                      <p className="text-sm font-semibold text-white">{t("liveAudit.report.title")}</p>
                      <p className="text-sm leading-7 text-brand-muted">{t("liveAudit.report.description")}</p>

                      <GlowingButton className="w-full justify-center" variant="ghost" loadingLabel="" onClick={() => startScan(state.targetUrl)}>
                        <RefreshCcw className="h-4 w-4" />
                        {t("liveAudit.actions.rescan")}
                      </GlowingButton>
                    </GlassContainer>
                  ) : null}
                </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageContainer>
    </main>
  );
}
