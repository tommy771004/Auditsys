import { ArrowRight, Gauge, RefreshCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { motion } from "framer-motion";
import GlowingButton from "../ui/GlowingButton";
import type { LiveScanSummary } from "../../types/liveAudit.types";
import { buildAuditOutcomeViewModel, type AuditOutcomeSeverity } from "./auditOutcomePresenter";

interface AuditOutcomeHeroProps {
  summary: LiveScanSummary;
  onOpenReport: () => void;
  onRescan: () => void;
}

const HERO_TONE: Record<AuditOutcomeSeverity, string> = {
  success: "border-emerald-400/25 bg-emerald-500/[0.08] text-emerald-100 shadow-[0_0_44px_rgba(16,185,129,0.14)]",
  warning: "border-amber-400/25 bg-amber-500/[0.08] text-amber-100 shadow-[0_0_44px_rgba(245,158,11,0.14)]",
  danger: "border-rose-400/25 bg-rose-500/[0.08] text-rose-100 shadow-[0_0_44px_rgba(244,63,94,0.16)]",
};

const SCORE_TONE: Record<AuditOutcomeSeverity, string> = {
  success: "text-emerald-200",
  warning: "text-amber-200",
  danger: "text-rose-200",
};

export default function AuditOutcomeHero({ summary, onOpenReport, onRescan }: AuditOutcomeHeroProps) {
  const model = buildAuditOutcomeViewModel(summary);
  const Icon = model.severity === "success" ? ShieldCheck : model.severity === "warning" ? TriangleAlert : Gauge;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={["relative overflow-hidden rounded-[32px] border p-5 backdrop-blur-xl sm:p-7", HERO_TONE[model.severity]].join(" ")}
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
              <Icon className="h-3.5 w-3.5" />
              {model.title}
            </span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              {model.dataSourceLabel}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <p className={["text-6xl font-semibold leading-none tracking-[-0.08em] sm:text-7xl", SCORE_TONE[model.severity]].join(" ")}>
                {model.scoreLabel}
              </p>
              <p className="max-w-3xl text-base leading-7 text-white/82 sm:text-lg">{model.headline}</p>
            </div>
            <p className="max-w-4xl rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 text-sm leading-7 text-white/72">
              <span className="font-semibold text-white">建議下一步：</span>
              {model.recommendation}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {model.chips.map((chip) => (
              <span key={chip} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-medium text-white/70">
                {chip}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:w-52 lg:flex-col">
          <GlowingButton className="w-full justify-center" loadingLabel="" onClick={onOpenReport}>
            <ArrowRight className="h-4 w-4" />
            開啟完整報告
          </GlowingButton>
          <GlowingButton className="w-full justify-center" variant="ghost" loadingLabel="" onClick={onRescan}>
            <RefreshCcw className="h-4 w-4" />
            重新掃描
          </GlowingButton>
        </div>
      </div>
    </motion.section>
  );
}
