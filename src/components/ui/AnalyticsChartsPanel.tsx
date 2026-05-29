import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Search, TrendingDown, TrendingUp } from "lucide-react";
import type { LiveScanSummary, PerformanceTrendAlertReport } from "../../types/liveAudit.types";
import { buildAnalyticsChartModel } from "./analyticsChartPresenter";

interface AnalyticsChartsPanelProps {
  summary?: LiveScanSummary;
  trendReport?: PerformanceTrendAlertReport;
}

export default function AnalyticsChartsPanel({ summary, trendReport }: AnalyticsChartsPanelProps) {
  const [activeView, setActiveView] = useState<"performance" | "seo">("performance");
  const chartModel = buildAnalyticsChartModel(summary);
  const TrendIcon = trendReport?.trendStatus === "regressing" ? TrendingDown : TrendingUp;
  const trendTone = trendReport?.trendStatus === "regressing"
    ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
    : trendReport?.trendStatus === "improving"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100";

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
      <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-white">智慧數據即時透視</h3>
            <span
              className={[
                "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                chartModel.dataSource.kind === "live"
                  ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                  : "border-amber-400/25 bg-amber-500/10 text-amber-100",
              ].join(" ")}
            >
              {chartModel.dataSource.label}
            </span>
          </div>
          <p className="text-sm text-white/50">{chartModel.dataSource.description}</p>
        </div>
        
        {/* Toggle Controls */}
        <div className="inline-flex rounded-xl bg-slate-900/50 p-1 shadow-inner">
          <button
            onClick={() => setActiveView("performance")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeView === "performance" ? "bg-amber-400/20 text-amber-300 shadow-sm" : "text-white/60 hover:text-white/90"
            }`}
          >
            <Activity className="h-4 w-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveView("seo")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeView === "seo" ? "bg-emerald-400/20 text-emerald-300 shadow-sm" : "text-white/60 hover:text-white/90"
            }`}
          >
            <Search className="h-4 w-4" />
            SEO Analysis
          </button>
        </div>
      </div>

      <div className="relative h-[300px] w-full">
        <AnimatePresence mode="wait">
          {activeView === "performance" ? (
            <motion.div
              key="perf"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 h-full w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartModel.performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 11 }} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12, color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="current" name="當前實測" fill="#FFBB28" radius={[4, 4, 0, 0]}>
                    {chartModel.performanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.current > entry.target ? "#FF2255" : "#05FFC4"} />
                    ))}
                  </Bar>
                  <Bar dataKey="target" name="綠色標準臨界" fill="#05FFC4" stroke="#00F0FF" strokeDasharray="2" fillOpacity={0.2} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              key="seo"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 h-full w-full flex items-center justify-center pt-5"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="80%" data={chartModel.seoData}>
                  <PolarGrid stroke="#ffffff20" />
                  <PolarAngleAxis dataKey="subject" stroke="#cbd5e1" style={{ fontSize: 12, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="SEO 達成率" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12, color: "#fff" }} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {trendReport ? (
        <div className={["mt-6 rounded-[22px] border p-4", trendTone].join(" ")}>
          <div className="mb-3 flex items-center gap-2">
            <TrendIcon className="h-4 w-4" />
            <p className="text-sm font-semibold">效能趨勢警示報告</p>
          </div>
          <div className="space-y-3 text-sm leading-6">
            <div>
              <p className="font-semibold text-white">近期趨勢摘要</p>
              <p className="text-white/75">{trendReport.trendSummary}</p>
            </div>
            {trendReport.keyRegressions.length > 0 ? (
              <div>
                <p className="font-semibold text-white">關鍵衰退指標</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-white/75">
                  {trendReport.keyRegressions.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div>
              <p className="font-semibold text-white">潛在肇因假說</p>
              <p className="text-white/75">{trendReport.hypothesizedRootCause}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
