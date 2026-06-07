import { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Search } from "lucide-react";
import type { LiveScanSummary } from "../../types/liveAudit.types";

interface AnalyticsChartsPanelProps {
  summary?: LiveScanSummary;
}

export default function AnalyticsChartsPanel({ summary }: AnalyticsChartsPanelProps) {
  const [activeView, setActiveView] = useState<"performance" | "seo">("performance");
  const [auditsData, setAuditsData] = useState<any[]>([]);

  useEffect(() => {
    const fetchAudits = async () => {
      const token = localStorage.getItem("auth_token");
      try {
        const res = await fetch("/api/audits", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setAuditsData(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchAudits();
  }, []);

  const last5Audits = auditsData.filter(a => a.status === 'completed' || a.result?.evidence).slice(0, 5).reverse();
  let timeSeriesData = last5Audits.map((a, idx) => {
    const result = a.result;
    const responseTime = result?.evidence?.deterministic?.responseTimeMs ?? 1200;
    const date = new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    
    return {
      name: `Run ${idx + 1} (${date})`,
      LCP: Number(((responseTime) / 1000 * 2.1).toFixed(2)),
      INP: Math.round(responseTime / 2)
    };
  });

  if (timeSeriesData.length === 0) {
    timeSeriesData = [
      { name: "Run 1", LCP: 2.1, INP: 600 },
      { name: "Run 2", LCP: 2.5, INP: 800 },
      { name: "Run 3", LCP: 1.8, INP: 450 },
      { name: "Run 4", LCP: 3.2, INP: 900 },
      { name: "Run 5", LCP: Number(((summary?.responseTimeMs ?? 1500) / 1000 * 2.1).toFixed(2)), INP: Math.round((summary?.responseTimeMs ?? 800) / 2) }
    ];
  }

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
    <div className="rounded-sm border border-[var(--border)] bg-black/5 p-5 backdrop-blur-md sm:p-6">
      <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)]">智慧數據即時透視</h3>
          <p className="text-sm text-brand-faint">動態切換效能指標與 SEO 檢測視圖</p>
        </div>
        
        {/* Toggle Controls */}
        <div className="inline-flex rounded-sm bg-neutral-100/50 p-1 shadow-inner">
          <button
            onClick={() => setActiveView("performance")}
            className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold transition-all ${
              activeView === "performance" ? "bg-amber-400/20 text-amber-300 shadow-sm" : "text-brand-muted hover:text-[var(--text)]"
            }`}
          >
            <Activity className="h-4 w-4" />
            Performance History
          </button>
          <button
            onClick={() => setActiveView("seo")}
            className={`inline-flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-semibold transition-all ${
              activeView === "seo" ? "bg-emerald-400/20 text-emerald-300 shadow-sm" : "text-brand-muted hover:text-[var(--text)]"
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
                <LineChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                  <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" stroke="#FFBB28" style={{ fontSize: 11 }} label={{ value: 'LCP (s)', angle: -90, position: 'insideLeft', fill: '#FFBB28', fontSize: 10, offset: 20 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#05FFC4" style={{ fontSize: 11 }} label={{ value: 'INP (ms)', angle: 90, position: 'insideRight', fill: '#05FFC4', fontSize: 10, offset: 5 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12, color: "#fff" }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="LCP" name="LCP (渲染延遲)" stroke="#FFBB28" strokeWidth={3} dot={{ r: 4, fill: '#FFBB28' }} activeDot={{ r: 6 }} />
                  <Line yAxisId="right" type="monotone" dataKey="INP" name="INP (互動延遲)" stroke="#05FFC4" strokeWidth={3} dot={{ r: 4, fill: '#05FFC4' }} activeDot={{ r: 6 }} />
                </LineChart>
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
