import { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  Cell
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Activity, 
  TrendingUp, 
  Coins, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  BarChart2, 
  RefreshCcw, 
  Cpu
} from "lucide-react";
import type { AuditHarnessRun } from "../../Server/Services/auditPipelineTypes";
import GlassCard from "./GlassCard";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14
    }
  }
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isZh?: boolean;
  compMetric?: string;
}

const CustomTooltip = ({ active, payload, label, isZh = false, compMetric }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-black backdrop-blur-md p-3 rounded-sm shadow-2xl flex flex-col gap-2 min-w-[170px] z-50">
        <p className="text-[10px] uppercase font-bold text-black/40 tracking-widest border-b border-black pb-1.5 mb-1">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((pld: any, i: number) => {
            const dataKey = pld.dataKey;
            let valStr = String(pld.value);
            
            // Format by dataKey or fallback to compMetric if comparing runs
            const formatKey = (dataKey === "durationSec" || dataKey === "passedChecks" || dataKey === "latencySec" || dataKey === "tokens" || dataKey === "costUsd") 
              ? dataKey 
              : compMetric;

            if (formatKey === "costUsd") {
              valStr = `$${Number(pld.value).toFixed(5)}`;
            } else if (formatKey === "latencySec" || formatKey === "durationSec") {
              valStr = `${Number(pld.value).toFixed(1)}s`;
            } else if (formatKey === "tokens") {
              valStr = `${Number(pld.value).toLocaleString()} tokens`;
            } else if (formatKey === "passRate") {
              valStr = `${pld.value}%`;
            } else if (formatKey === "passedChecks") {
              valStr = isZh ? `${pld.value} 次檢查通過` : `${pld.value} checks`;
            } else if (formatKey === "attempts") {
              valStr = isZh ? `${pld.value} 次重試` : `${pld.value} attempts`;
            }

            const seriesColor = pld.color || pld.stroke || pld.fill || "#06b6d4";

            return (
              <div key={i} className="flex items-center justify-between gap-5">
                <span className="text-xs text-black/70 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seriesColor }} />
                  {pld.name}
                </span>
                <span className="text-xs font-mono font-bold text-black">
                  {valStr}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

interface DashboardWidgetProps {
  currentHarness?: AuditHarnessRun;
  isZh?: boolean;
}

export default function DashboardWidget({ currentHarness, isZh = false }: DashboardWidgetProps) {
  const [activeTab, setActiveTab] = useState<"current" | "historical" | "compare" | "costTrend">("current");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRunAId, setSelectedRunAId] = useState<string>(() => {
    return localStorage.getItem("dashboard_compare_run_a") || "";
  });
  const [selectedRunBId, setSelectedRunBId] = useState<string>(() => {
    return localStorage.getItem("dashboard_compare_run_b") || "";
  });
  const [compMetric, setCompMetric] = useState<"latencySec" | "costUsd" | "passRate" | "attempts">("latencySec");

  useEffect(() => {
    if (selectedRunAId) {
      localStorage.setItem("dashboard_compare_run_a", selectedRunAId);
    }
  }, [selectedRunAId]);

  useEffect(() => {
    if (selectedRunBId) {
      localStorage.setItem("dashboard_compare_run_b", selectedRunBId);
    }
  }, [selectedRunBId]);

  // Fetch audit history on mount to build the historical metrics trend
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      try {
        const res = await fetch("/api/audits", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const audits = await res.json();
          // Filter out in-progress or incomplete audits and sort by creation date
          const completedAudits = audits
            .filter((a: any) => a.status === "completed" && a.harness)
            .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

          const chartData = completedAudits.map((a: any, idx: number) => {
            const h = a.harness as AuditHarnessRun;
            const passRate = h.qualityGate?.checks?.length 
              ? Math.round((h.qualityGate.passedCount / h.qualityGate.checks.length) * 100) 
              : 100;
            const costUsd = Number((h.governance?.estimatedTokenSpend * 0.0000015).toFixed(5));
            return {
              id: h.runId || idx,
              name: `Run #${idx + 1}`,
              date: new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
              latencySec: Number((h.durationMs / 1000).toFixed(1)),
              tokens: h.governance?.estimatedTokenSpend || 0,
              costUsd,
              passRate,
              attempts: h.attempts?.length || 1,
              status: h.status
            };
          });

          setHistoryData(chartData);
        }
      } catch (err) {
        console.error("Failed to fetch historical audit data for DashboardWidget:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [currentHarness]);

  // Fallback / mock historical data if none exists
  const displayHistory = historyData.length > 0 ? historyData : [
    { name: "Run #1", date: "May 25", latencySec: 12.4, tokens: 45000, costUsd: 0.0675, passRate: 80, attempts: 1, status: "passed" },
    { name: "Run #2", date: "May 26", latencySec: 18.2, tokens: 68000, costUsd: 0.1020, passRate: 90, attempts: 2, status: "passed" },
    { name: "Run #3", date: "May 28", latencySec: 24.1, tokens: 92000, costUsd: 0.1380, passRate: 60, attempts: 3, status: "manual_review" },
    { name: "Run #4", date: "May 29", latencySec: 14.5, tokens: 51000, costUsd: 0.0765, passRate: 100, attempts: 1, status: "passed" },
    { name: "Run #5", date: "May 30", latencySec: 29.8, tokens: 110000, costUsd: 0.1650, passRate: 50, attempts: 3, status: "failed" },
    { name: "Run #6", date: "Jun 1", latencySec: 15.1, tokens: 54000, costUsd: 0.0810, passRate: 100, attempts: 1, status: "passed" }
  ];

  // Map the current harness attempts metrics
  const currentAttemptsData = currentHarness?.attempts?.map((a, i) => {
    // Attempt duration
    const started = new Date(a.startedAt).getTime();
    const completed = new Date(a.completedAt).getTime();
    const duration = isNaN(started) || isNaN(completed) ? 5000 : Math.max(100, completed - started);
    
    // Check coverage
    const totalChecks = a.sensors?.length || 0;
    const passedChecks = a.sensors?.filter(s => s.status === "passed").length || 0;
    
    return {
      name: `${isZh ? "第" : "Attempt"} ${a.index || i + 1}`,
      durationSec: Number((duration / 1000).toFixed(1)),
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      strategy: a.strategy,
      status: a.status
    };
  }) || [
    { name: "Attempt 1", durationSec: 14.2, passedChecks: 6, failedChecks: 2, strategy: "standard", status: "failed" },
    { name: "Attempt 2 (Retry)", durationSec: 8.5, passedChecks: 8, failedChecks: 0, strategy: "retry_same_contract", status: "passed" }
  ];

  // Helper stats computation
  const avgLatency = displayHistory.reduce((acc, curr) => acc + curr.latencySec, 0) / displayHistory.length;
  const totalSpend = displayHistory.reduce((acc, curr) => acc + curr.costUsd, 0);
  const successRate = (displayHistory.filter(h => h.status === "passed" || h.status === "manual_review").length / displayHistory.length) * 100;

  // Selected comparison runs computation
  const activeRunA = displayHistory.find(h => h.name === selectedRunAId) || displayHistory[0];
  const activeRunB = displayHistory.find(h => h.name === selectedRunBId) || displayHistory[displayHistory.length - 1] || displayHistory[0];

  // Last 10 audits slice for cost trend visualization
  const last10Audits = displayHistory.slice(-10);

  return (
    <GlassCard className="p-6 md:p-8 space-y-6 flex flex-col justify-between" glow="cyan">
      {/* Block Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.06] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
            <h3 className="text-xl font-bold tracking-tight text-black">
              {isZh ? "Harness 智能沙盒觀測台" : "Harness Pipeline Observability"}
            </h3>
          </div>
          <p className="text-xs text-black/50 mt-1">
            {isZh 
              ? "觀測多代理合約重試、Token 目標預算度與即時沙盒治理監控" 
              : "Monitor multi-agent execution trials, actual token budgets & realtime safety-gates"}
          </p>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex border border-black bg-white rounded-full p-1 self-start sm:self-auto overflow-x-auto max-w-full">
          <button 
            type="button"
            onClick={() => setActiveTab("current")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "current" 
                ? "bg-cyan-500/10 text-cyan-400 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.2)] border border-cyan-500/20" 
                : "text-black/60 hover:text-black border border-transparent"
            }`}
          >
            <Activity className="h-3 w-3" />
            {isZh ? "單次合約分析" : "Active Trial Trace"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("historical")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "historical" 
                ? "bg-cyan-500/10 text-cyan-400 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.2)] border border-cyan-500/20" 
                : "text-black/60 hover:text-black border border-transparent"
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            {isZh ? "全站健康趨勢" : "History & Trends"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("compare")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "compare" 
                ? "bg-cyan-500/10 text-cyan-400 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.2)] border border-cyan-500/20" 
                : "text-black/60 hover:text-black border border-transparent"
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            {isZh ? "合約對比工具" : "Trial Comparison"}
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab("costTrend")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activeTab === "costTrend" 
                ? "bg-cyan-500/10 text-cyan-400 shadow-[inset_0_1px_0_0_rgba(34,211,238,0.2)] border border-cyan-500/20" 
                : "text-black/60 hover:text-black border border-transparent"
            }`}
          >
            <Coins className="h-3.5 w-3.5 text-yellow-500" />
            {isZh ? "預算與成本趨勢" : "Cost Trend (Last 10)"}
          </button>
        </div>
      </div>

      {/* Observability Summary KPIs */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div 
          variants={cardVariants}
          whileHover={{ scale: 1.03, y: -2, transition: { duration: 0.2 } }}
          className="bg-black/5 border border-black/[0.04] p-4 rounded-sm hover:bg-black/5 transition-colors cursor-default"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-black/40 tracking-wider">
            <Coins className="h-3.5 w-3.5 text-yellow-500" />
            {isZh ? "累計合約成本" : "Total Spend (USD)"}
          </div>
          <p className="text-2xl font-black text-black mt-1.5 font-mono">
            ${totalSpend.toFixed(3)}
          </p>
        </motion.div>

        <motion.div 
          variants={cardVariants}
          whileHover={{ scale: 1.03, y: -2, transition: { duration: 0.2 } }}
          className="bg-black/5 border border-black/[0.04] p-4 rounded-sm hover:bg-black/5 transition-colors cursor-default"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-black/40 tracking-wider">
            <Clock className="h-3.5 w-3.5 text-cyan-400" />
            {isZh ? "平均運行延遲" : "Avg Execution Time"}
          </div>
          <p className="text-2xl font-black text-cyan-400 mt-1.5 font-mono">
            {avgLatency.toFixed(1)}s
          </p>
        </motion.div>

        <motion.div 
          variants={cardVariants}
          whileHover={{ scale: 1.03, y: -2, transition: { duration: 0.2 } }}
          className="bg-black/5 border border-black/[0.04] p-4 rounded-sm hover:bg-black/5 transition-colors cursor-default"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-black/40 tracking-wider">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            {isZh ? "沙盒過關率" : "Quality Gate Pass"}
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1.5 font-mono">
            {successRate.toFixed(0)}%
          </p>
        </motion.div>

        <motion.div 
          variants={cardVariants}
          whileHover={{ scale: 1.03, y: -2, transition: { duration: 0.2 } }}
          className="bg-black/5 border border-black/[0.04] p-4 rounded-sm hover:bg-black/5 transition-colors cursor-default"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-black/40 tracking-wider">
            <RefreshCcw className="h-3.5 w-3.5 text-purple-400" />
            {isZh ? "單次最高重試" : "Max Trial Retries"}
          </div>
          <p className="text-2xl font-black text-purple-400 mt-1.5 font-mono">
            {Math.max(...displayHistory.map((h) => h.attempts), 1)}
          </p>
        </motion.div>
      </motion.div>

      {/* Main Charts Area */}
      <div className={`${activeTab === "compare" ? "min-h-[420px] md:min-h-[290px]" : "h-[280px]"} w-full relative`}>
        <AnimatePresence mode="wait">
          {activeTab === "current" ? (
            <motion.div
              key="current-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full flex flex-col justify-between"
            >
              <div className="text-xs text-black/60 mb-2 flex items-center justify-between">
                <span>
                  {isZh 
                    ? `當前合約 ID: ${currentHarness?.runId || "Active Simulation"}`
                    : `Active Run ID: ${currentHarness?.runId || "Local Active Session"}`}
                </span>
                <span className="font-sans text-stone-400">
                  {isZh 
                    ? `健康驗證總數: ${currentHarness?.qualityGate.checks.length || 8}`
                    : `Total Quality Checks: ${currentHarness?.qualityGate.checks.length || 8}`}
                </span>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={currentAttemptsData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10, letterSpacing: 1 }} />
                  <YAxis stroke="#94A3B8" style={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip isZh={isZh} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="durationSec" name={isZh ? "單次分析耗時 (秒)" : "Trial Latency (s)"} fill="#3b82f6" radius={[6, 6, 0, 0]}>
                    {currentAttemptsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.status === "failed" ? "#f43f5e" : "#06b6d4"} />
                    ))}
                  </Bar>
                  <Bar dataKey="passedChecks" name={isZh ? "通過的傳感器數" : "Passed Checks"} fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          ) : activeTab === "historical" ? (
            <motion.div
              key="historical-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full flex flex-col justify-between"
            >
              <div className="text-xs text-black/60 mb-2 flex items-center justify-between">
                <span>{isZh ? "歷史合約沙盒運行數據指標" : "Sandboxed AI Agents Runs Performance"}</span>
                <span className="text-yellow-400">{isZh ? "隨時間波動指標" : "Time-series trend analysis"}</span>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={displayHistory} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="#06b6d4" style={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#eab308" style={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip isZh={isZh} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Area 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="latencySec" 
                    name={isZh ? "防禦運行時長 (秒)" : "Latency (s)"} 
                    stroke="#06b6d4" 
                    fillOpacity={0.15} 
                    fill="url(#colorLatency)" 
                    strokeWidth={2}
                  />
                  <Area 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="tokens" 
                    name={isZh ? "Token 耗費量-百倍規模" : "Tokens Spent"} 
                    stroke="#eab308" 
                    fillOpacity={0.08} 
                    fill="url(#colorTokens)" 
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : activeTab === "costTrend" ? (
            <motion.div
              key="cost-trend-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full flex flex-col justify-between"
            >
              <div className="text-xs text-black/60 mb-2 flex items-center justify-between">
                <span>{isZh ? "歷史前 10 次合約分析資源門徑成本趨勢 (USD)" : "Cost Trend for Last 10 Audit Pipeline Runs (USD)"}</span>
                <span className="text-emerald-400 font-semibold">{isZh ? "實時 Token 耗能監控" : "Realtime Token Gate Monitoring"}</span>
              </div>
              <ResponsiveContainer width="100%" height="90%">
                <LineChart data={last10Audits} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
                  <YAxis stroke="#eab308" style={{ fontSize: 10 }} tickFormatter={(value) => `$${value.toFixed(3)}`} />
                  <Tooltip content={<CustomTooltip isZh={isZh} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line 
                    type="monotone" 
                    dataKey="costUsd" 
                    name={isZh ? "預算成本 (USD)" : "Run Cost (USD)"} 
                    stroke="#eab308" 
                    strokeWidth={3}
                    activeDot={{ r: 8 }}
                    dot={{ stroke: '#070b13', strokeWidth: 2, r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              key="compare-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full w-full flex flex-col md:flex-row gap-5"
            >
              {/* Left Column Controls */}
              <div className="flex flex-col gap-3 w-full md:w-[220px] shrink-0 justify-between">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-black/40">
                    {isZh ? "選擇欲比較的合約組" : "Comparative Selections"}
                  </div>
                  
                  {/* Dropdown for Run A */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">Run A</label>
                    <select
                      value={activeRunA?.name || ""}
                      onChange={(e) => setSelectedRunAId(e.target.value)}
                      className="w-full bg-white border border-black rounded-sm px-2.5 py-1.5 text-xs text-black/95 focus:outline-none focus:border-cyan-400 transition-colors"
                    >
                      {displayHistory.map((h) => (
                        <option key={`a-${h.name}`} value={h.name}>
                          {h.name} ({h.date})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Dropdown for Run B */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">Run B</label>
                    <select
                      value={activeRunB?.name || ""}
                      onChange={(e) => setSelectedRunBId(e.target.value)}
                      className="w-full bg-white border border-black rounded-sm px-2.5 py-1.5 text-xs text-black/95 focus:outline-none focus:border-purple-400 transition-colors"
                    >
                      {displayHistory.map((h) => (
                        <option key={`b-${h.name}`} value={h.name}>
                          {h.name} ({h.date})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Performance Insight badge */}
                <div className="bg-black/5 border border-black/[0.04] p-3 rounded-sm flex flex-col justify-center">
                  <span className="text-[9px] uppercase font-bold text-black/40 tracking-wider">
                    {isZh ? "比較洞察分析" : "Performance Delta"}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
                    {(() => {
                      const valA = activeRunA ? activeRunA[compMetric] : 0;
                      const valB = activeRunB ? activeRunB[compMetric] : 0;
                      if (valA === valB) {
                        return <span className="text-xs font-semibold text-black/60">{isZh ? "無顯著差異" : "No difference"}</span>;
                      }
                      const percent = valA !== 0 ? ((valB - valA) / valA) * 100 : 0;
                      const isImprovement = compMetric === "passRate" ? percent > 0 : percent < 0;

                      return (
                        <>
                          <span className={`text-sm font-extrabold font-mono ${isImprovement ? "text-emerald-400" : "text-rose-400"}`}>
                            {percent > 0 ? "+" : ""}{percent.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-black/50 leading-tight">
                            {(() => {
                              if (compMetric === "latencySec") {
                                return isImprovement ? (isZh ? "運行更快" : "faster latency") : (isZh ? "耗時增加" : "slower latency");
                              }
                              if (compMetric === "costUsd") {
                                return isImprovement ? (isZh ? "成本下降" : "cost saved") : (isZh ? "成本增長" : "cost increase");
                              }
                              if (compMetric === "passRate") {
                                return isImprovement ? (isZh ? "安全通關提升" : "pass quality bump") : (isZh ? "過關率滑落" : "quality drop");
                              }
                              return isImprovement ? (isZh ? "更優表現" : "better trial") : (isZh ? "落後指標" : "regression");
                            })()}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Comparison Metric Selectors & Recharts Bar Chart */}
              <div className="flex-1 flex flex-col justify-between">
                {/* Metric Selector Buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  {(["latencySec", "costUsd", "passRate", "attempts"] as const).map((mKey) => (
                    <button
                      key={mKey}
                      onClick={() => setCompMetric(mKey)}
                      className={`px-2.5 py-1 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all border ${
                        compMetric === mKey
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-400/30"
                          : "text-black/45 hover:text-black/80 bg-transparent border-transparent"
                      }`}
                    >
                      {mKey === "latencySec" && (isZh ? "延遲" : "Latency")}
                      {mKey === "costUsd" && (isZh ? "資源成本" : "Cost")}
                      {mKey === "passRate" && (isZh ? "健康過關" : "Pass Rate")}
                      {mKey === "attempts" && (isZh ? "嘗試次數" : "Attempts")}
                    </button>
                  ))}
                </div>

                {/* Subchart rendering comparison side-by-side */}
                <div className="flex-1 min-h-[160px] md:min-h-[190px] w-full mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[
                        {
                          name: isZh ? "指標分析" : "Trial Comparison Value",
                          [activeRunA?.name || "Run A"]: activeRunA ? activeRunA[compMetric] : 0,
                          [activeRunB?.name || "Run B"]: activeRunB ? activeRunB[compMetric] : 0,
                        }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
                      <YAxis stroke="#94A3B8" style={{ fontSize: 10 }} />
                      <Tooltip content={<CustomTooltip isZh={isZh} compMetric={compMetric} />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                      <Bar dataKey={activeRunA?.name || "Run A"} fill="#06b6d4" radius={[6, 6, 0, 0]} />
                      <Bar dataKey={activeRunB?.name || "Run B"} fill="#a855f7" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Safety Compliance Statement */}
      <div className="flex items-center gap-2 border-t border-black/[0.06] pt-4 text-[10px] uppercase font-semibold text-black/50 tracking-wider">
        <AlertTriangle className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>
          {isZh 
            ? "沙盒引擎自我修正守則 (Self-Correction Audit Engine v4.1) 與資源門徑 (Token Gate) 功能均處於實時稽查中。" 
            : "Quality sensor self-correction guidelines (Self-Correction Audit Engine v4.1) & custom token spend gates are active."}
        </span>
      </div>
    </GlassCard>
  );
}
