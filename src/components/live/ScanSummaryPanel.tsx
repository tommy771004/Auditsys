import { type ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Boxes, Gauge, ListChecks, Network, ServerCog, TriangleAlert, Bot, Zap, ShieldCheck, Search, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LiveScanSummary } from "../../types/liveAudit.types";

interface ScanSummaryPanelProps {
  summary: LiveScanSummary;
}

function scoreTone(score: number): { text: string; stroke: string } {
  if (score >= 90) {
    return { text: "text-emerald-300", stroke: "stroke-emerald-400" };
  }
  if (score >= 50) {
    return { text: "text-amber-300", stroke: "stroke-amber-400" };
  }
  return { text: "text-rose-300", stroke: "stroke-rose-400" };
}

/** Dependency-free SVG progress ring for a single 0-100 score. */
function ScoreRing({ score, label }: { score: number; label: string }) {
  const tone = scoreTone(score);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex h-[76px] w-[76px] items-center justify-center">
        <svg className="h-[76px] w-[76px] -rotate-90" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={radius} className="fill-none stroke-white/10" strokeWidth="6" />
          <motion.circle
            cx="38"
            cy="38"
            r={radius}
            className={`fill-none ${tone.stroke}`}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <span className={`absolute text-lg font-semibold ${tone.text}`}>{score}</span>
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">{label}</p>
    </div>
  );
}

/** Horizontal proportional bar used for the asset breakdown chart. */
function AssetBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const widthPct = max > 0 ? Math.max(value > 0 ? 6 : 0, Math.round((value / max) * 100)) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/70">{label}</span>
        <span className="font-semibold text-white">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className={`h-full rounded-full ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function ScanSummaryPanel({ summary }: ScanSummaryPanelProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");
  const [activeAgent, setActiveAgent] = useState<"crux" | "security" | "seo" | "network">("crux");

  const scoreItems = [
    { id: "overall", value: summary.scores.overall, label: t("liveAudit.summary.scores.overall") },
    { id: "performance", value: summary.scores.performance, label: t("liveAudit.summary.scores.performance") },
    { id: "seo", value: summary.scores.seo, label: t("liveAudit.summary.scores.seo") },
    { id: "architecture", value: summary.scores.architecture, label: t("liveAudit.summary.scores.architecture") },
  ];

  const assetMax = Math.max(summary.assets.scripts, summary.assets.stylesheets, summary.assets.images, 1);
  const assetItems = [
    { id: "scripts", label: t("liveAudit.summary.assets.scripts"), value: summary.assets.scripts, tone: "bg-cyan-400/80" },
    { id: "stylesheets", label: t("liveAudit.summary.assets.stylesheets"), value: summary.assets.stylesheets, tone: "bg-violet-400/80" },
    { id: "images", label: t("liveAudit.summary.assets.images"), value: summary.assets.images, tone: "bg-blue-400/80" },
    { id: "missingAlt", label: t("liveAudit.summary.assets.missingAlt"), value: summary.assets.imagesMissingAlt, tone: "bg-rose-400/80" },
  ];

  const seoSignals = [
    { id: "title", label: t("liveAudit.summary.seo.titleTag"), ok: summary.seo.hasTitle },
    { id: "meta", label: t("liveAudit.summary.seo.metaDescription"), ok: summary.seo.hasMetaDescription },
    { id: "canonical", label: t("liveAudit.summary.seo.canonical"), ok: summary.seo.hasCanonical },
    { id: "viewport", label: t("liveAudit.summary.seo.viewport"), ok: summary.seo.hasViewport },
    { id: "h1", label: t("liveAudit.summary.seo.h1", { count: summary.seo.h1Count }), ok: summary.seo.h1Count === 1 },
    { id: "structured", label: t("liveAudit.summary.seo.structuredData", { count: summary.seo.structuredDataBlocks }), ok: summary.seo.structuredDataBlocks > 0 },
    { id: "og", label: t("liveAudit.summary.seo.openGraph", { count: summary.seo.openGraphTags }), ok: summary.seo.openGraphTags > 0 },
  ];

  const routeMax = Math.max(...summary.routes.map((route) => route.responseTimeMs ?? 0), 1);

  return (
    <GlassSection>
      {/* Header + metadata */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-100">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t("liveAudit.summary.title")}</p>
            <p className="text-xs text-brand-muted">{t("liveAudit.summary.subtitle")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <MetaChip icon={<Activity className="h-3 w-3" />} value={t("liveAudit.summary.meta.status", { value: summary.statusCode ?? "—" })} />
          <MetaChip icon={<Activity className="h-3 w-3" />} value={t("liveAudit.summary.meta.responseTime", { value: summary.responseTimeMs ?? "—" })} />
          {summary.server ? <MetaChip icon={<ServerCog className="h-3 w-3" />} value={summary.server} /> : null}
        </div>
      </div>

      {/* Score rings */}
      <div className="grid grid-cols-2 gap-4 py-6 sm:grid-cols-4">
        {scoreItems.map((item) => (
          <ScoreRing key={item.id} score={item.value} label={item.label} />
        ))}
      </div>

      {/* Parallel Multi-Agent Co-working Insights */}
      {summary.agentResults ? (
        <div className="my-6 space-y-4 rounded-[24px] border border-white/10 bg-white/[0.02] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                <Bot className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {isZh ? "AI 協同專家代理集群診斷" : "AI Co-working Agent Cluster Insights"}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {isZh ? "4 個領域特化 Agent 即時並行分析、交互論證、給出修復方程式" : "4 specialized Domain Agents executed in parallel scatter-gather"}
                </p>
              </div>
            </div>
            
            {/* Agent Selector Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-950/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setActiveAgent("crux")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeAgent === "crux"
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Zap className="h-3 w-3" />
                <span>{isZh ? "核心效能" : "Crux Perf"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAgent("security")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeAgent === "security"
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldCheck className="h-3 w-3" />
                <span>{isZh ? "資安防禦" : "DevSecOps"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAgent("seo")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeAgent === "seo"
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Search className="h-3 w-3" />
                <span>{isZh ? "DOM 與搜尋" : "SEO & DOM"}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveAgent("network")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeAgent === "network"
                    ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Compass className="h-3 w-3" />
                <span>{isZh ? "網路偵探" : "Network"}</span>
              </button>
            </div>
          </div>

          {/* Active Agent Findings list */}
          <div className="space-y-4">
            {(() => {
              const findings = 
                activeAgent === "crux" ? summary.agentResults.cruxPerformance :
                activeAgent === "security" ? summary.agentResults.devSecOps :
                activeAgent === "seo" ? summary.agentResults.seoAndDom :
                summary.agentResults.networkDetective;

              if (!findings || findings.length === 0) {
                return (
                  <p className="text-xs text-slate-500 italic py-6 text-center">
                    {isZh ? "此 Agent 尚未回傳特定弱點報告項目" : "This agent has completed run with clean status"}
                  </p>
                );
              }

              return findings.map((item, idx) => {
                const isCrit = item.severity === "critical";
                const isWarn = item.severity === "warning";
                const severityBadge = isCrit
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-300"
                  : isWarn
                  ? "border-amber-400/20 bg-amber-500/10 text-amber-300"
                  : "border-cyan-400/20 bg-cyan-500/10 text-cyan-300";

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-2xl border border-white/5 bg-slate-900/30 p-4 space-y-3.5"
                  >
                    <div className="flex items-start gap-2.5 justify-between">
                      <h5 className="text-xs sm:text-sm font-semibold text-white flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] uppercase tracking-wider font-bold border rounded-md px-1.5 py-0.5 ${severityBadge}`}>
                          {item.severity}
                        </span>
                        <span>{item.finding}</span>
                      </h5>
                    </div>

                    <div className="grid gap-3.5 sm:grid-cols-3 text-[11.5px] leading-6">
                      <div className="space-y-1 rounded-xl bg-white/[0.01] border border-white/5 p-3">
                        <p className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">
                          {isZh ? "🔍 本質成因 / Root Cause" : "🔍 Root Cause"}
                        </p>
                        <p className="text-slate-400 whitespace-pre-wrap">{item.rootCause}</p>
                      </div>

                      <div className="space-y-1 rounded-xl bg-white/[0.01] border border-white/5 p-3">
                        <p className="font-bold text-slate-300 uppercase tracking-widest text-[9px]">
                          {isZh ? "💼 商業衝擊 / Impact" : "💼 Business Impact"}
                        </p>
                        <p className="text-slate-400 whitespace-pre-wrap">{item.businessImpact}</p>
                      </div>

                      <div className="space-y-1 rounded-xl bg-indigo-500/[0.01] border border-indigo-500/20 p-3">
                        <p className="font-bold text-indigo-300 uppercase tracking-widest text-[9px]">
                          {isZh ? "🛠️ 引導修復 / Guided Fix" : "🛠️ Guided Fix"}
                        </p>
                        <p className="text-slate-300 font-medium whitespace-pre-wrap">{item.actionableFix}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Asset breakdown */}
        <div className="space-y-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Boxes className="h-4 w-4 text-cyan-200" />
            {t("liveAudit.summary.assets.title")}
          </div>
          <div className="space-y-3">
            {assetItems.map((item) => (
              <AssetBar key={item.id} label={item.label} value={item.value} max={assetMax} tone={item.tone} />
            ))}
          </div>
        </div>

        {/* SEO signal checklist */}
        <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ListChecks className="h-4 w-4 text-emerald-200" />
            {t("liveAudit.summary.seo.title")}
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {seoSignals.map((signal) => (
              <li
                key={signal.id}
                className={[
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                  signal.ok
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-100",
                ].join(" ")}
              >
                <span className="text-sm">{signal.ok ? "✓" : "✕"}</span>
                <span>{signal.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Route timing chart */}
      {summary.routes.length > 0 ? (
        <div className="mt-6 space-y-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Network className="h-4 w-4 text-blue-200" />
            {t("liveAudit.summary.routes.title", { count: summary.routes.length })}
          </div>
          <div className="space-y-2.5">
            {summary.routes.map((route, index) => {
              const widthPct = route.responseTimeMs ? Math.max(6, Math.round((route.responseTimeMs / routeMax) * 100)) : 0;
              return (
                <div key={`${route.url}-${index}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-white/70">{route.url}</span>
                    <span className={route.ok ? "font-semibold text-emerald-200" : "font-semibold text-rose-200"}>
                      {route.status ?? "ERR"} · {route.responseTimeMs ?? "—"} ms
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className={`h-full rounded-full ${route.ok ? "bg-blue-400/80" : "bg-rose-400/80"}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${widthPct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.05 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Warnings */}
      {summary.warnings.length > 0 ? (
        <div className="mt-6 space-y-2 rounded-[20px] border border-amber-400/20 bg-amber-400/[0.06] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
            <TriangleAlert className="h-4 w-4" />
            {t("liveAudit.summary.warnings.title", { count: summary.warnings.length })}
          </div>
          <ul className="space-y-1.5">
            {summary.warnings.map((warning, index) => (
              <li key={index} className="flex gap-2 text-xs leading-6 text-amber-50/90">
                <span className="text-amber-300">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </GlassSection>
  );
}

function GlassSection({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6"
    >
      {children}
    </motion.div>
  );
}

function MetaChip({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 font-medium text-white/75">
      {icon}
      {value}
    </span>
  );
}
