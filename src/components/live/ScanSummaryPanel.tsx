import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Activity, Boxes, Gauge, ListChecks, Network, ServerCog, TriangleAlert } from "lucide-react";
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
  const { t } = useTranslation();

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
