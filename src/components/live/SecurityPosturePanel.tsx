/**
 * SecurityPosturePanel
 *
 * Displays the Security Posture analysis result for a scanned target URL.
 * Driven by:
 *   - `summary.security` (SecurityPostureSummary) from the SSE done-frame  — basic view
 *   - `fullResult` (SecurityPostureResult) fetched from /api/scan/security   — remediation tab
 *
 * Visual design follows the ScanSummaryPanel glass-card system.
 */

import { type ReactNode, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, ShieldX, ChevronDown, ChevronUp, Server } from "lucide-react";
import type { SecurityPostureSummary } from "../../types/liveAudit.types";

// ── Local types (mirrors SecurityPostureResult from server) ───────────────────

interface SecurityPostureResult {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  findings: Array<{
    header: string;
    present: boolean;
    value: string | null;
    severity: "critical" | "high" | "medium" | "low" | "pass";
    misconfiguration?: string;
    remediationHint: string;
  }>;
  detectedStack: "vercel" | "nginx" | "aspnet" | "cloudflare" | "unknown";
  remediationSnippets: {
    vercel: string;
    nginx: string;
    aspnet: string;
  };
}

interface SecurityPosturePanelProps {
  /** Lightweight summary from LiveScanSummary.security (always available after scan) */
  summary: SecurityPostureSummary;
  /** Target URL used to fetch full remediation detail on demand */
  targetUrl: string;
  /** Optional pre-loaded full result (skip the /api/scan/security fetch) */
  fullResult?: SecurityPostureResult;
  /** Auth token for the /api/scan/security API call */
  authToken?: string;
}

// ── Grade styling ─────────────────────────────────────────────────────────────

type GradeTone = { text: string; bg: string; border: string; stroke: string };

function gradeTone(grade: SecurityPostureResult["grade"]): GradeTone {
  switch (grade) {
    case "A":
      return { text: "text-emerald-300", bg: "bg-emerald-400/10", border: "border-emerald-400/20", stroke: "stroke-emerald-400" };
    case "B":
      return { text: "text-cyan-300", bg: "bg-cyan-400/10", border: "border-cyan-400/20", stroke: "stroke-cyan-400" };
    case "C":
      return { text: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-400/20", stroke: "stroke-amber-400" };
    case "D":
      return { text: "text-orange-300", bg: "bg-orange-400/10", border: "border-orange-400/20", stroke: "stroke-orange-400" };
    default:
      return { text: "text-rose-300", bg: "bg-rose-400/10", border: "border-rose-400/20", stroke: "stroke-rose-400" };
  }
}

function severityRow(severity: SecurityPostureResult["findings"][number]["severity"]) {
  switch (severity) {
    case "critical":
    case "high":
      return { icon: "✕", chip: "border-rose-400/25 bg-rose-400/10 text-rose-100" };
    case "medium":
      return { icon: "⚠", chip: "border-amber-400/25 bg-amber-400/10 text-amber-100" };
    case "low":
      return { icon: "·", chip: "border-sky-400/25 bg-sky-400/10 text-sky-100" };
    default:
      return { icon: "✓", chip: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GradeRing({ score, grade }: { score: number; grade: SecurityPostureResult["grade"] }) {
  const tone = gradeTone(grade);
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
        <span className={`absolute text-xl font-bold ${tone.text}`}>{grade}</span>
      </div>
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">
        {score}/100
      </p>
    </div>
  );
}

const PLATFORM_LABELS: Record<string, string> = {
  vercel: "Vercel (vercel.json)",
  nginx: "Nginx (nginx.conf)",
  aspnet: "ASP.NET Core (Program.cs)",
  cloudflare: "Cloudflare (Workers / Pages)",
  unknown: "通用設定建議",
};

type Platform = "vercel" | "nginx" | "aspnet";

function RemediationTabs({ snippets, detectedStack }: { snippets: SecurityPostureResult["remediationSnippets"]; detectedStack: string }) {
  const platforms: Platform[] = ["vercel", "nginx", "aspnet"];
  const defaultTab: Platform = platforms.includes(detectedStack as Platform) ? (detectedStack as Platform) : "vercel";
  const [active, setActive] = useState<Platform>(defaultTab);
  const [copied, setCopied] = useState(false);

  const code = snippets[active];

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-white/[0.05] p-1">
        {platforms.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActive(p)}
            className={[
              "flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors",
              active === p
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/80",
              p === detectedStack ? "ring-1 ring-violet-400/40" : "",
            ].join(" ")}
          >
            {p === "vercel" ? "Vercel" : p === "nginx" ? "Nginx" : ".NET"}
            {p === detectedStack && <span className="ml-1 text-[9px] text-violet-300">(偵測)</span>}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
          <span className="text-[11px] text-white/50">{PLATFORM_LABELS[active]}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-md px-2 py-1 text-[11px] text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            {copied ? "✓ 已複製" : "複製"}
          </button>
        </div>
        <pre className="max-h-64 overflow-auto p-4 text-[11px] leading-5 text-green-300/90">
          {code}
        </pre>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SecurityPosturePanel({
  summary,
  targetUrl,
  fullResult: initialFullResult,
  authToken,
}: SecurityPosturePanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [fullResult, setFullResult] = useState<SecurityPostureResult | null>(initialFullResult ?? null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const tone = gradeTone(summary.grade);
  const criticalCount = summary.findings.filter((f) => f.severity === "critical" || f.severity === "high").length;

  // Fetch full result (with remediation snippets) when user expands the panel
  useEffect(() => {
    if (!expanded || fullResult || loading) return;
    setLoading(true);
    setFetchError(null);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    fetch(`/api/scan/security?url=${encodeURIComponent(targetUrl)}`, { headers })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<SecurityPostureResult>;
      })
      .then((data) => setFullResult(data))
      .catch((err: Error) => setFetchError(err.message))
      .finally(() => setLoading(false));
  }, [expanded, fullResult, loading, targetUrl, authToken]);

  return (
    <motion.div
      id="security-posture-panel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl sm:p-6"
    >
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${tone.border} ${tone.bg}`}>
            {criticalCount > 0 ? (
              <ShieldX className={`h-5 w-5 ${tone.text}`} />
            ) : summary.grade === "A" || summary.grade === "B" ? (
              <ShieldCheck className={`h-5 w-5 ${tone.text}`} />
            ) : (
              <ShieldAlert className={`h-5 w-5 ${tone.text}`} />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">資安防禦態勢</p>
            <p className="text-xs text-white/50">Security Header Posture Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Stack badge */}
          {summary.detectedStack !== "unknown" && (
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-medium text-white/60">
              <Server className="h-3 w-3" />
              {summary.detectedStack}
            </span>
          )}
          {/* Grade badge */}
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold ${tone.text} ${tone.border} ${tone.bg}`}>
            {summary.grade}
          </span>

          {/* Expand toggle */}
          <button
            type="button"
            id="security-panel-expand-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="rounded-xl border border-white/10 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Compact finding pills (always visible) */}
      <motion.div 
        className="mt-4 flex flex-wrap gap-2"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
      >
        <AnimatePresence initial={false}>
          {summary.findings.map((f) => {
            const row = severityRow(f.severity);
            const label = f.header
              .replace("Content-Security-Policy", "CSP")
              .replace("Strict-Transport-Security", "HSTS")
              .replace("X-Frame-Options", "X-Frame")
              .replace("X-Content-Type-Options", "XCTO");
            return (
              <motion.span
                key={f.header}
                layout
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
                }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${row.chip}`}
              >
                <span>{row.icon}</span>
                {label}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Expandable detail section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-4">
              {/* Score ring + summary row */}
              <div className="flex items-center gap-6 rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <GradeRing score={summary.score} grade={summary.grade} />
                <div className="space-y-1 text-xs text-white/70">
                  <p className={`text-sm font-semibold ${tone.text}`}>
                    {summary.grade === "A" && "優秀 — 安全 header 設定完整"}
                    {summary.grade === "B" && "良好 — 尚有輕微改善空間"}
                    {summary.grade === "C" && "需改善 — 存在中高風險設定缺失"}
                    {summary.grade === "D" && "警告 — 多個高風險 header 缺失"}
                    {summary.grade === "F" && "嚴重不足 — CSP 等關鍵防護完全缺失"}
                  </p>
                  <p>偵測到的伺服器平台：<span className="text-white/90">{PLATFORM_LABELS[summary.detectedStack] ?? summary.detectedStack}</span></p>
                </div>
              </div>

              {/* Per-finding detail list */}
              <motion.div 
                className="space-y-2"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              >
                <AnimatePresence initial={false}>
                  {summary.findings.map((f) => {
                    const row = severityRow(f.severity);
                    return (
                      <motion.div
                        key={f.header}
                        layout
                        variants={{
                          hidden: { opacity: 0, y: 6 },
                          visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
                        }}
                        exit={{ opacity: 0, height: 0, overflow: "hidden", transition: { duration: 0.2 } }}
                        className={`rounded-xl border p-3 text-xs ${row.chip}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{f.header}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${f.severity === "pass" ? "bg-emerald-400/20 text-emerald-200" : "bg-rose-400/20 text-rose-200"}`}>
                            {f.present ? (f.severity === "pass" ? "通過" : "誤設") : "缺失"}
                          </span>
                        </div>
                        <p className="mt-1.5 leading-5 text-white/70">{f.remediationHint}</p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </motion.div>

              {/* Remediation code snippets */}
              <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white">修補程式碼片段</p>
                <p className="mt-0.5 text-xs text-white/50">
                  依偵測到的平台提供精確的設定檔，可直接複製貼上
                </p>

                {loading && (
                  <p className="mt-4 text-center text-xs text-white/40 animate-pulse">
                    載入修補片段中…
                  </p>
                )}

                {fetchError && (
                  <p className="mt-4 text-center text-xs text-rose-300">
                    無法載入修補片段：{fetchError}
                  </p>
                )}

                {fullResult && (
                  <RemediationTabs
                    snippets={fullResult.remediationSnippets}
                    detectedStack={fullResult.detectedStack}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
