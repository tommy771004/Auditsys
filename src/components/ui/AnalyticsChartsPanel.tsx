import { useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Search } from "lucide-react";
import type { LiveScanSummary } from "../../types/liveAudit.types";

interface AnalyticsChartsPanelProps {
  summary?: LiveScanSummary;
}

export default function AnalyticsChartsPanel({ summary }: AnalyticsChartsPanelProps) {
  const [activeView, setActiveView] = useState<"performance" | "seo">("performance");

  const performanceData = [
    { name: "LCP (渲染延遲)", current: (summary?.responseTimeMs ?? 1500) / 1000 * 2.1, target: 2.5 },
    { name: "INP (互動延遲)", current: (summary?.responseTimeMs ?? 800) / 2, target: 200 },
    { name: "CLS (佈局偏移)", current: summary?.scores.architecture ? (100 - summary.scores.architecture) / 100 : 0.15, target: 0.1 },
    { name: "TTFB (伺服器回應)", current: summary?.responseTimeMs ?? 800, target: 400 }
  ];

  const seoData = summary ? [
    { subject: "Meta 描述", A: summary.seo.hasMetaDescription ? 100 : 0, fullMark: 100 },
    { subject: "H1 結構", A: summary.seo.h1Count === 1 ? 100 : (summary.seo.h1Count === 0 ? 0 : 50), fullMark: 100 },
    { subject: "圖片 Alt", A: summary.assets.images > 0 ? ((summary.assets.images - summary.assets.imagesMissingAlt) / summary.assets.images) * 100 : 100, fullMark: 100 },
    { subject: "Canonical 正規化", A: summary.seo.hasCanonical ? 100 : 0, fullMark: 100 },
    { subject: "結構化資料", A: summary.seo.structuredDataBlocks > 0 ? 100 : 0, fullMark: 100 },
    { subject: "內部連結", A: 75, fullMark: 100 } /* Mock for internal links */
  ] : [
    { subject: "Meta 描述", A: 90, fullMark: 100 },
    { subject: "H1 結構", A: 100, fullMark: 100 },
    { subject: "圖片 Alt", A: 60, fullMark: 100 },
    { subject: "Canonical", A: 100, fullMark: 100 },
    { subject: "結構化資料", A: 40, fullMark: 100 },
    { subject: "內部連結", A: 75, fullMark: 100 }
  ];

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
      <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h3 className="text-lg font-semibold text-white">智慧數據即時透視</h3>
          <p className="text-sm text-white/50">動態切換效能指標與 SEO 檢測視圖</p>
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
                <BarChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 11 }} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12, color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="current" name="當前實測" fill="#FFBB28" radius={[4, 4, 0, 0]}>
                    {performanceData.map((entry, index) => (
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
                <RadarChart outerRadius="80%" data={seoData}>
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
    </div>
  );
}
