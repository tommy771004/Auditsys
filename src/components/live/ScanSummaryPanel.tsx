import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Activity, Boxes, Gauge, ListChecks, Network, ServerCog, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LiveScanSummary } from "../../types/liveAudit.types";

interface ScanSummaryPanelProps {
  summary: LiveScanSummary;
}

function scoreTone(score: number): { text: string; stroke: string, glow: string } {
  if (score >= 90) {
    return { text: "text-emerald-300", stroke: "stroke-emerald-400", glow: "drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" };
  }
  if (score >= 50) {
    return { text: "text-amber-300", stroke: "stroke-amber-400", glow: "drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" };
  }
  return { text: "text-rose-300", stroke: "stroke-rose-400", glow: "drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" };
}

/** Dependency-free SVG progress ring for a single 0-100 score. */
function ScoreRing({ score, label }: { score: number; label: string }) {
  const tone = scoreTone(score);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="group/ring flex flex-col items-center gap-2 transition-transform hover:scale-105">
      <div className="relative inline-flex h-[76px] w-[76px] items-center justify-center">
        <svg className="h-[76px] w-[76px] -rotate-90 drop-shadow-lg" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={radius} className="fill-none stroke-white/5" strokeWidth="6" />
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
        <span className={`absolute text-lg font-bold tracking-tight ${tone.text} ${tone.glow}`}>{score}</span>
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-black/60 transition-colors group-hover/ring:text-black/90">{label}</p>
    </div>
  );
}

/** Horizontal proportional bar used for the asset breakdown chart. */
function AssetBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  const widthPct = max > 0 ? Math.max(value > 0 ? 6 : 0, Math.round((value / max) * 100)) : 0;

  return (
    <div className="space-y-1 group/bar">
      <div className="flex items-center justify-between text-xs">
        <span className="text-black/70 transition-colors group-hover/bar:text-black/90">{label}</span>
        <span className="font-semibold text-black tracking-tight">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/5 shadow-inner">
        <motion.div
          className={`h-full rounded-full ${tone} shadow-[0_0_8px_currentColor]`}
          initial={{ width: 0 }}
          animate={{ width: `${widthPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default function ScanSummaryPanel({ summary }: ScanSummaryPanelProps) {
  const { t } = useTranslation();

  const scoreItems = [
    { id: "overall", value: summary.scores.overall, label: t("liveAudit.summary.scores.overall") },
    { id: "performance", value: summary.scores.performance, label: t("liveAudit.summary.scores.performance") },
    { id: "seo", value: summary.scores.seo, label: t("liveAudit.summary.scores.seo") },
    { id: "architecture", value: summary.scores.architecture, label: t("liveAudit.summary.scores.architecture") },
  ];

  const assetMax = Math.max(summary.assets.scripts, summary.assets.stylesheets, summary.assets.images, 1);
  const assetItems = [
    { id: "scripts", label: t("liveAudit.summary.assets.scripts"), value: summary.assets.scripts, tone: "bg-cyan-400 text-cyan-400" },
    { id: "stylesheets", label: t("liveAudit.summary.assets.stylesheets"), value: summary.assets.stylesheets, tone: "bg-violet-400 text-violet-400" },
    { id: "images", label: t("liveAudit.summary.assets.images"), value: summary.assets.images, tone: "bg-blue-400 text-blue-400" },
    { id: "missingAlt", label: t("liveAudit.summary.assets.missingAlt"), value: summary.assets.imagesMissingAlt, tone: "bg-rose-400 text-rose-400" },
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
      <div className="flex flex-col gap-3 border-b border-black pb-5 sm:flex-row sm:items-center sm:justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-violet-300/20 bg-violet-400/10 text-violet-100 shadow-inner shadow-violet-500/20">
            <Gauge className="h-5 w-5 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-black tracking-tight">{t("liveAudit.summary.title")}</p>
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
      <div className="grid grid-cols-2 gap-4 py-8 sm:grid-cols-4 relative z-10">
        {scoreItems.map((item) => (
          <ScoreRing key={item.id} score={item.value} label={item.label} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 relative z-10">
        {/* Asset breakdown */}
        <div className="space-y-4 rounded-sm border border-black bg-white p-5 shadow-inner shadow-black/20 transition-colors hover:bg-white hover:border-black/15">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <Boxes className="h-4 w-4 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            {t("liveAudit.summary.assets.title")}
          </div>
          <div className="space-y-4 pt-1">
            {assetItems.map((item) => (
              <AssetBar key={item.id} label={item.label} value={item.value} max={assetMax} tone={item.tone} />
            ))}
          </div>
        </div>

        {/* SEO signal checklist */}
        <div className="space-y-4 rounded-sm border border-black bg-white p-5 shadow-inner shadow-black/20 transition-colors hover:bg-white hover:border-black/15">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <ListChecks className="h-4 w-4 text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
            {t("liveAudit.summary.seo.title")}
          </div>
          <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-1">
            {seoSignals.map((signal) => (
              <motion.li
                key={signal.id}
                whileHover={{ scale: 1.02 }}
                className={[
                  "flex items-center gap-2.5 rounded-sm border px-3 py-2 text-xs transition-colors cursor-default shadow-sm",
                  signal.ok
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15"
                    : "border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/15",
                ].join(" ")}
              >
                <span className={`text-sm ${signal.ok ? "text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.6)]" : "text-rose-400 drop-shadow-[0_0_4px_rgba(244,63,94,0.6)]"}`}>{signal.ok ? "✓" : "✕"}</span>
                <span className="font-medium tracking-wide">{signal.label}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* Route timing chart */}
      {summary.routes.length > 0 ? (
        <div className="mt-6 space-y-4 rounded-sm border border-black bg-white p-5 shadow-inner shadow-black/20 transition-colors hover:bg-white hover:border-black/15 relative z-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-black">
            <Network className="h-4 w-4 text-blue-300 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
            {t("liveAudit.summary.routes.title", { count: summary.routes.length })}
          </div>
          <div className="space-y-3 pt-1">
            {summary.routes.map((route, index) => {
              const widthPct = route.responseTimeMs ? Math.max(6, Math.round((route.responseTimeMs / routeMax) * 100)) : 0;
              return (
                <div key={`${route.url}-${index}`} className="space-y-1 group/route">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-black/60 transition-colors group-hover/route:text-black/90">{route.url}</span>
                    <span className={route.ok ? "font-semibold text-emerald-300" : "font-semibold text-rose-300"}>
                      {route.status ?? "ERR"} · {route.responseTimeMs ?? "—"} ms
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/5 shadow-inner">
                    <motion.div
                      className={`h-full rounded-full shadow-[0_0_8px_currentColor] ${route.ok ? "bg-emerald-400/80 text-emerald-400" : "bg-rose-400/80 text-rose-400"}`}
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
        <div className="mt-6 space-y-2 rounded-sm border border-amber-400/20 bg-amber-400/[0.06] p-5 shadow-inner shadow-amber-500/10 relative z-10">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200 drop-shadow-[0_0_5px_rgba(251,191,36,0.3)]">
            <TriangleAlert className="h-4 w-4" />
            {t("liveAudit.summary.warnings.title", { count: summary.warnings.length })}
          </div>
          <ul className="space-y-1.5 pt-1">
            {summary.warnings.map((warning, index) => (
              <li key={index} className="flex gap-2 text-xs leading-6 text-amber-50/80">
                <span className="text-amber-400/80 mt-0.5">•</span>
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
      className="group relative overflow-hidden rounded-sm border border-black bg-black/10 p-5 backdrop-blur-xl sm:p-6 transition-colors duration-200 ease-out hover:bg-black/5"
    >
      
      {children}
    </motion.div>
  );
}

function MetaChip({ icon, value }: { icon: ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-black/70 shadow-sm transition-colors hover:text-black hover:bg-white hover:border-black">
      {icon}
      {value}
    </span>
  );
}
