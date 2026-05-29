import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gauge, TriangleAlert, Users, FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CruxMetric, CruxRating, CruxResult, PageSpeedResult } from "../../types/liveAudit.types";
import CwvSparkline from "./CwvSparkline";

interface CoreWebVitalsCardProps {
  targetUrl: string;
  /** Becomes true once the live scan reaches the Lighthouse / analyzing stage. */
  active: boolean;
}

// Minimal slice of the real Google PageSpeed Insights v5 response (lab fallback).
interface PageSpeedAudit {
  displayValue?: string;
}

interface PageSpeedApiResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number | null } };
    audits?: Record<string, PageSpeedAudit | undefined>;
  };
}

type ViewPhase = "idle" | "loading" | "field" | "lab" | "error";

const API_BASE: string = import.meta.env.VITE_API_URL ?? "";
const PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PAGESPEED_API_KEY: string | undefined = import.meta.env.VITE_PAGESPEED_API_KEY;

function mapPageSpeedResponse(payload: PageSpeedApiResponse): PageSpeedResult {
  const lighthouse = payload.lighthouseResult;
  const rawScore = lighthouse?.categories?.performance?.score;
  const audits = lighthouse?.audits ?? {};

  return {
    score: typeof rawScore === "number" ? Math.round(rawScore * 100) : 0,
    FCP: audits["first-contentful-paint"]?.displayValue ?? "—",
    LCP: audits["largest-contentful-paint"]?.displayValue ?? "—",
    CLS: audits["cumulative-layout-shift"]?.displayValue ?? "—",
  };
}

function scoreToneClass(score: number): string {
  if (score >= 90) return "text-emerald-300";
  if (score >= 50) return "text-amber-300";
  return "text-rose-300";
}

function ratingTextClass(rating: CruxRating | null): string {
  if (rating === "good") return "text-emerald-300";
  if (rating === "needs-improvement") return "text-amber-300";
  if (rating === "poor") return "text-rose-300";
  return "text-white/60";
}

function ratingStrokeClass(rating: CruxRating | null): string {
  if (rating === "good") return "stroke-emerald-400";
  if (rating === "needs-improvement") return "stroke-amber-400";
  if (rating === "poor") return "stroke-rose-400";
  return "stroke-white/40";
}

function formatMetricValue(id: "lcp" | "inp" | "cls" | "fcp", value: number | null): string {
  if (value === null) return "—";
  if (id === "cls") return value.toFixed(2);
  if (id === "inp") return `${Math.round(value)} ms`;
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${Math.round(value)} ms`;
}

export default function CoreWebVitalsCard({ targetUrl, active }: CoreWebVitalsCardProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<ViewPhase>("idle");
  const [crux, setCrux] = useState<CruxResult | null>(null);
  const [lab, setLab] = useState<PageSpeedResult | null>(null);

  useEffect(() => {
    if (!active || !targetUrl) {
      return;
    }

    const controller = new AbortController();
    setPhase("loading");
    setCrux(null);
    setLab(null);

    const fetchLabData = async () => {
      const requestUrl =
        `${PAGESPEED_ENDPOINT}?url=${encodeURIComponent(targetUrl)}&category=performance&strategy=mobile` +
        (PAGESPEED_API_KEY ? `&key=${encodeURIComponent(PAGESPEED_API_KEY)}` : "");
      const response = await fetch(requestUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`pagespeed_failed:${response.status}`);
      }
      const payload: PageSpeedApiResponse = await response.json();
      if (!controller.signal.aborted) {
        setLab(mapPageSpeedResponse(payload));
        setPhase("lab");
      }
    };

    (async () => {
      // 1. Prefer real-user field data from CrUX (served by the backend).
      try {
        const authToken = localStorage.getItem("auth_token");
        const response = await fetch(`${API_BASE}/api/scan/crux?url=${encodeURIComponent(targetUrl)}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          signal: controller.signal,
        });
        if (response.ok) {
          const result: CruxResult = await response.json();
          if (controller.signal.aborted) return;
          if (result.hasData) {
            setCrux(result);
            setPhase("field");
            return;
          }
        }
      } catch {
        if (controller.signal.aborted) return;
        // fall through to lab data
      }

      // 2. No field data (or CrUX unconfigured) → fall back to a PageSpeed lab run.
      try {
        await fetchLabData();
      } catch {
        if (!controller.signal.aborted) {
          setPhase("error");
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [active, targetUrl]);

  const fieldMetrics: { id: "lcp" | "inp" | "cls"; label: string; metric: CruxMetric; history: (number | null)[] }[] = crux
    ? [
        { id: "lcp", label: t("liveAudit.vitals.lcp"), metric: crux.metrics.lcp, history: crux.history.lcp.p75s },
        { id: "inp", label: t("liveAudit.vitals.inp"), metric: crux.metrics.inp, history: crux.history.inp.p75s },
        { id: "cls", label: t("liveAudit.vitals.cls"), metric: crux.metrics.cls, history: crux.history.cls.p75s },
      ]
    : [];

  const labMetrics: { id: keyof Omit<PageSpeedResult, "score">; label: string }[] = [
    { id: "FCP", label: t("liveAudit.vitals.fcp") },
    { id: "LCP", label: t("liveAudit.vitals.lcp") },
    { id: "CLS", label: t("liveAudit.vitals.cls") },
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100">
            <Gauge className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t("liveAudit.vitals.title")}</p>
            <p className="text-xs text-brand-muted">
              {phase === "field" ? t("liveAudit.vitals.fieldSubtitle") : t("liveAudit.vitals.subtitle")}
            </p>
          </div>
        </div>
        {phase === "field" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
            <Users className="h-3 w-3" />
            {t("liveAudit.vitals.fieldBadge")}
          </span>
        ) : phase === "lab" ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-100">
            <FlaskConical className="h-3 w-3" />
            {t("liveAudit.vitals.labBadge")}
          </span>
        ) : null}
      </div>

      <div className="mt-5">
        {phase === "idle" ? (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/50">
            {t("liveAudit.vitals.pending")}
          </p>
        ) : phase === "error" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            <TriangleAlert className="h-5 w-5 shrink-0" />
            <span>{t("liveAudit.vitals.error")}</span>
          </div>
        ) : phase === "loading" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-white/10" />
              ))}
            </div>
          </div>
        ) : phase === "field" && crux ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {fieldMetrics.map(({ id, label, metric, history }) => (
                <div key={id} className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">{label}</p>
                    <p className={`text-lg font-semibold ${ratingTextClass(metric.rating)}`}>{formatMetricValue(id, metric.p75)}</p>
                  </div>
                  {metric.rating ? (
                    <p className={`mt-0.5 text-[10px] font-medium ${ratingTextClass(metric.rating)}`}>
                      {t(`liveAudit.vitals.rating.${metric.rating}`)}
                    </p>
                  ) : null}
                  {history.filter((value) => value !== null).length >= 2 ? (
                    <div className="mt-2">
                      <CwvSparkline values={history} strokeClass={ratingStrokeClass(metric.rating)} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/45">
              {crux.collectionPeriod
                ? t("liveAudit.vitals.fieldFooterWithPeriod", {
                    scope: t(`liveAudit.vitals.scope.${crux.scope ?? "origin"}`),
                    period: crux.collectionPeriod,
                  })
                : t("liveAudit.vitals.fieldFooter", { scope: t(`liveAudit.vitals.scope.${crux.scope ?? "origin"}`) })}
            </p>
          </div>
        ) : phase === "lab" && lab ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="relative inline-flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-slate-950/50"
              >
                <span className={`text-3xl font-semibold ${scoreToneClass(lab.score)}`}>{lab.score}</span>
              </motion.div>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/55">{t("liveAudit.vitals.score")}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {labMetrics.map((metric) => (
                <div key={metric.id} className="rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">{metric.label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{lab[metric.id]}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-amber-200/70">{t("liveAudit.vitals.labFallbackNote")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
