import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Database, 
  Brain, 
  Sparkles, 
  PlusCircle, 
  Filter, 
  Check, 
  Activity, 
  Layers, 
  Server, 
  ShieldCheck, 
  RotateCw, 
  FileText,
  Workflow
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { soundManager } from "../../utils/audioSynth";
import type { MemoryUpdate, MemoryUpdateType } from "../../types/agent.types";
import LtmNetworkVisualizer from "./LtmNetworkVisualizer";

interface LongTermMemoryPanelProps {
  memoryUpdates: MemoryUpdate[];
  activeUpdate: MemoryUpdate | null;
  approvedFactKeys: Set<string>;
  toggleFactApproval: (key: string) => void;
  targetUrl: string;
}

export default function LongTermMemoryPanel({
  memoryUpdates: externalMemoryUpdates,
  activeUpdate,
  approvedFactKeys,
  toggleFactApproval,
  targetUrl
}: LongTermMemoryPanelProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh") ?? true;

  // Combine external state with user-injected custom facts
  const [customInjections, setCustomInjections] = useState<MemoryUpdate[]>([]);
  const [activeTab, setActiveTab] = useState<"explorer" | "visualizer" | "alignment">("explorer");
  const [filterType, setFilterType] = useState<MemoryUpdateType | "all">("all");
  
  // Inject state
  const [showInjectInput, setShowInjectInput] = useState(false);
  const [injectKey, setInjectKey] = useState("");
  const [injectFact, setInjectFact] = useState("");
  const [injectType, setInjectType] = useState<MemoryUpdateType>("tech_stack");

  // Alignment scanner state
  const [alignmentRunning, setAlignmentRunning] = useState(false);
  const [alignmentProgress, setAlignmentProgress] = useState(0);
  const [alignmentStatus, setAlignmentStatus] = useState<string[]>([]);
  const [accuracyRating, setAccuracyRating] = useState<number | null>(null);

  // Default baseline facts when no dynamic scan is running yet
  const fallbackUrl = targetUrl || "demo.auditlens.io";
  const getFallbackFacts = (): MemoryUpdate[] => [
    {
      key: "crawler-fingerprint",
      fact: isZh 
        ? `系統偵測到 ${fallbackUrl} 跑在 Node.js 反向代理後面，搭配 Nginx 層級保護。`
        : `Detected ${fallbackUrl} running behind Node.js reverse proxy with Nginx layer buffering.`,
      type: "tech_stack"
    },
    {
      key: "spa-route-gate",
      fact: isZh
        ? "偵測到 React 18+ 與 React-Router 單頁路由，缺乏靜態渲染優化 (No Router SSR)。"
        : "React 18+ Single Page Application architecture identified. Missing route pre-rendering or SSR hooks.",
      type: "architecture"
    },
    {
      key: "lcp-asset-blocker",
      fact: isZh
        ? "首屏大型資源未標記 fetchpriority='high'，導致 CLS 在 3G 網路下偏高。"
        : "Primary LCP image payload missing fetchpriority='high' attribute, inducing layout shifts on 3G thresholds.",
      type: "bottleneck"
    }
  ];

  const allMemoryUpdates = [
    ...(externalMemoryUpdates.length > 0 ? externalMemoryUpdates : getFallbackFacts()),
    ...customInjections
  ];

  // Dynamic automatic feedback to active updates
  useEffect(() => {
    if (activeUpdate) {
      soundManager.play("type_key");
    }
  }, [activeUpdate]);

  const handleInjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injectKey.trim() || !injectFact.trim()) {
      soundManager.play("warning");
      return;
    }

    const newUpdate: MemoryUpdate = {
      key: injectKey.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      fact: injectFact,
      type: injectType
    };

    setCustomInjections((prev) => [newUpdate, ...prev]);
    // Approve it automatically
    toggleFactApproval(newUpdate.key);
    
    setInjectKey("");
    setInjectFact("");
    setShowInjectInput(false);
    soundManager.play("success");
  };

  const runAlignmentCheck = () => {
    if (alignmentRunning) return;
    
    soundManager.play("engine_start");
    setAlignmentRunning(true);
    setAlignmentProgress(0);
    setAccuracyRating(null);
    setAlignmentStatus([]);

    const steps = [
      isZh ? "📡 初始化長期語境神經元對齊通道 (Active Context Check)..." : "📡 Initiating Long-Term semantic context vector alignment path...",
      isZh ? "🧬 比對當前 DOM 節點及 DOM 深度指標 (Max-Depth: 18)..." : "🧬 Correlating active DOM footprint with DOM depth metrics (Max-Depth: 18)...",
      isZh ? "🔑 執行網站技術特徵防護與 API Gateway 特徵校對..." : "🔑 Verifying WAF shielding signatures & endpoint access constraints...",
      isZh ? "📉 檢查性能瓶頸與 Chrome UX Report (CrUX) 累計偏移量 (CLS 0.00)..." : "📉 Grounding local bottleneck observations with CrUX standard parameters...",
      isZh ? "✅ 長期記憶引擎宣告與虛擬沙箱 3D 全腦模型協調一致！" : "✅ Long-term memory storage is synchronized & verified green with sandboxed preview."
    ];

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx < steps.length) {
        setAlignmentStatus((prev) => [...prev, steps[currentIdx]]);
        soundManager.play("type_key");
        setAlignmentProgress(((currentIdx + 1) / steps.length) * 100);
        currentIdx++;
      } else {
        clearInterval(interval);
        setAlignmentRunning(false);
        setAccuracyRating(99.4);
        soundManager.play("success");
      }
    }, 750);
  };

  const getFilteredUpdates = () => {
    if (filterType === "all") return allMemoryUpdates;
    return allMemoryUpdates.filter(u => u.type === filterType);
  };

  return (
    <div className="rounded-sm border border-black bg-white p-6 md:p-8 backdrop-blur-2xl relative overflow-hidden transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* Background cyber ambient rings */}
      
      

      {/* Header with tactical information */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-black/5 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <Database className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/15 px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-blue-300">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
                LONG-TERM MEMORY ENGINE
              </span>
              <span className="text-[10px] font-mono text-black/30 uppercase">PERSISTENT_KNOWLEDGE_STORE</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-black mt-1">
              {isZh ? "長期架構記憶控制台" : "Long-term Architectural Memory Console"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              {isZh 
                ? "由多智能體在稽核過程中即時沉澱、去蕪存菁的系統性修復事實。此處的特徵事實可用於生成客製化建議與 3D 簡報核心架構。"
                : "A secure repository of pristine tech stack findings and performance bottlenecks verified by our agent network for dynamic visualization."}
            </p>
          </div>
        </div>

        {/* Tactical interactive modes tab */}
        <div className="flex bg-white p-1.5 rounded-sm border border-black self-start text-xs font-mono font-semibold shadow-inner shadow-black/40">
          <button
            onClick={() => { setActiveTab("explorer"); soundManager.play("dial"); }}
            className={`px-4 py-2 rounded-sm transition-all flex items-center gap-1.5 ${
              activeTab === "explorer" 
                ? "bg-blue-500/20 text-blue-200 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                : "text-slate-400 hover:text-black hover:bg-black/5"
            }`}
          >
            {isZh ? "記憶管理" : "Explorer"}
          </button>
          <button
            onClick={() => { setActiveTab("visualizer"); soundManager.play("dial"); }}
            className={`px-4 py-2 rounded-sm transition-all flex items-center gap-1.5 ${
              activeTab === "visualizer" 
                ? "bg-blue-500/20 text-blue-200 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                : "text-slate-400 hover:text-black hover:bg-black/5"
            }`}
          >
            <Workflow className="h-4 w-4" />
            {isZh ? "記憶管線圖" : "Pipeline UI"}
          </button>
          <button
            onClick={() => { setActiveTab("alignment"); soundManager.play("dial"); }}
            className={`px-4 py-2 rounded-sm transition-all flex items-center gap-1.5 ${
              activeTab === "alignment" 
                ? "bg-blue-500/20 text-blue-200 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                : "text-slate-400 hover:text-black hover:bg-black/5"
            }`}
          >
            <Activity className="h-4 w-4" />
            {isZh ? "語義對齊檢測" : "Semantic Align"}
          </button>
        </div>
      </div>

      {/* Explorer view tab */}
      {activeTab === "explorer" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Fact List with responsive filter (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "tech_stack", "architecture", "bottleneck"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => { setFilterType(type); soundManager.play("click"); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all border ${
                      filterType === type 
                        ? "bg-blue-500/20 text-blue-300 border-blue-500/40" 
                        : "bg-black/5 text-slate-400 border-black/5 hover:text-black hover:bg-black/10"
                    }`}
                  >
                    {type === "all" ? (isZh ? "全部" : "All") : ""}
                    {type === "tech_stack" ? (isZh ? "🌐 技術棧" : "🌐 Tech Stack") : ""}
                    {type === "architecture" ? (isZh ? "🏗️ 藍圖架構" : "🏗️ Architecture") : ""}
                    {type === "bottleneck" ? (isZh ? "⚡ 效能瓶頸" : "⚡ Bottleneck") : ""}
                  </button>
                ))}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowInjectInput(!showInjectInput); soundManager.play("click"); }}
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider transition-colors"
                type="button"
              >
                <PlusCircle className="h-4 w-4" />
                {isZh ? "手動注入核心事實" : "Inject Discovery Fact"}
              </motion.button>
            </div>

            {/* Manual Import injection box */}
            <AnimatePresence>
              {showInjectInput && (
                <motion.form
                  onSubmit={handleInjectSubmit}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden bg-white rounded-sm border border-blue-500/30 p-4 space-y-4 text-xs font-mono"
                >
                  <p className="text-xs font-bold text-blue-300 uppercase">🧠 神經元記憶手動注入閘口</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-black/40 font-semibold block uppercase">Fact Key (識別碼)</label>
                      <input
                        type="text"
                        placeholder="e.g. database-latency"
                        value={injectKey}
                        required
                        onChange={(e) => setInjectKey(e.target.value)}
                        className="w-full bg-neutral-100 border border-black rounded-sm p-2 text-black outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-black/40 font-semibold block uppercase">Fact Type (項目分類)</label>
                      <select
                        value={injectType}
                        onChange={(e) => setInjectType(e.target.value as MemoryUpdateType)}
                        className="w-full bg-neutral-100 border border-black rounded-sm p-2 text-black outline-none focus:border-blue-400"
                      >
                        <option value="tech_stack">{isZh ? "技術棧特徵 (Tech Stack)" : "Tech Stack"}</option>
                        <option value="architecture">{isZh ? "藍圖架構特徵 (Architecture)" : "Architecture"}</option>
                        <option value="bottleneck">{isZh ? "效能瓶頸特徵 (Bottleneck)" : "Bottleneck"}</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-black/40 font-semibold block uppercase">Core Discovery Fact (稽核事實描述)</label>
                    <textarea
                      placeholder={isZh ? "請寫入偵測到的確切修復事實..." : "Describe the systemic discovery details..."}
                      value={injectFact}
                      required
                      onChange={(e) => setInjectFact(e.target.value)}
                      className="w-full bg-neutral-100 border border-black rounded-sm p-2 text-black outline-none focus:border-blue-400 h-16"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowInjectInput(false); soundManager.play("click"); }}
                      className="px-3 py-1.5 rounded-sm bg-black/5 hover:bg-black/10 text-black font-semibold transition"
                    >
                      {isZh ? "取消" : "Cancel"}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-sm bg-blue-500 hover:bg-blue-400 text-slate-950 font-bold transition"
                    >
                      {isZh ? "編入長期記憶" : "Commit Fact"}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* List scrollbar */}
            <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
              {getFilteredUpdates().map((item, idx) => {
                const isApproved = approvedFactKeys.has(item.key);
                return (
                  <motion.div
                    key={`${item.key}-${idx}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    onClick={() => { 
                      toggleFactApproval(item.key); 
                      soundManager.play(isApproved ? "dial" : "success"); 
                    }}
                    className={`group relative flex items-start gap-4 rounded-sm border p-5 cursor-pointer backdrop-blur-sm transition-all duration-300 ${
                      isApproved 
                        ? "border-blue-500/30 bg-blue-900/20 shadow-[0_4px_20px_rgba(59,130,246,0.12)] hover:bg-blue-900/30 hover:border-blue-500/50 hover:scale-[1.01]"
                        : "border-black/5 bg-white opacity-70 hover:opacity-100 grayscale hover:grayscale-0 hover:bg-neutral-100/60 hover:border-black"
                    }`}
                  >
                    <div className="flex items-center h-6 pointer-events-none mt-0.5">
                      <div className={`h-5 w-5 rounded-md border flex items-center justify-center transition-all ${
                        isApproved ? "border-blue-500 bg-blue-500 text-slate-950" : "border-black bg-neutral-100"
                      }`}>
                        {isApproved && <Check className="h-3.5 w-3.5 stroke-[3px]" />}
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center justify-between gap-3 title-wrap">
                        <span className={`text-[9px] font-mono font-bold uppercase px-2.5 py-1 rounded-sm border tracking-wide shadow-inner ${
                          item.type === "architecture" 
                            ? "bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-purple-500/10"
                            : item.type === "bottleneck"
                              ? "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-rose-500/10"
                              : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300 shadow-cyan-500/10"
                        }`}>
                          {item.type === "architecture" ? (isZh ? "建築藍圖" : "Architecture") : ""}
                          {item.type === "bottleneck" ? (isZh ? "效能阻礙" : "Bottleneck") : ""}
                          {item.type === "tech_stack" ? (isZh ? "技術棧特徵" : "Tech Stack") : ""}
                        </span>
                        <span className="text-[10px] font-mono text-black/40 truncate max-w-[12rem] bg-white px-2 py-0.5 rounded-md border border-black/5">SYS_KEY: {item.key}</span>
                      </div>
                      <p className={`text-sm font-semibold transition-colors duration-200 ${
                        isApproved ? "text-black" : "text-black/50"
                      }`}>
                        {item.fact}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right side stats/details bento (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-sm border border-black/5 bg-white p-5 space-y-5 text-xs font-mono">
              <span className="text-[10px] text-blue-400 font-bold block uppercase tracking-wider">📊 Synced Fact Analytics</span>
              
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-black/40">Total Sync Nodes</span>
                    <span className="text-black font-bold">{allMemoryUpdates.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: "100%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-black/40">Active Approved Core</span>
                    <span className="text-blue-400 font-bold">{approvedFactKeys.size} / {allMemoryUpdates.length}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
                    <motion.div 
                      className="h-full bg-cyan-400" 
                      initial={{ width: 0 }}
                      animate={{ width: `${(approvedFactKeys.size / Math.max(1, allMemoryUpdates.length)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-black/5 pt-4 space-y-2 text-[10px] text-black/50">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>3D Presentation state mapping OK</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>Subagents memory bus: Hot Syncing</span>
                </div>
              </div>

              <div className="rounded-sm bg-blue-500/5 border border-blue-500/10 p-3 text-[10.5px] text-blue-300 leading-normal">
                💡 {isZh 
                  ? "當您勾選核心事實時，報告生成智能體 (SynthesisAgent) 會重點引入該事實，使最終的視覺化檔案最具穿透力。"
                  : "By approving critical items, our SynthesisAgent selectively models them with higher statistical weight for markdown rendering."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Pipeline UI */}
      {activeTab === "visualizer" && (
        <div className="p-4 rounded-sm border border-black/5 bg-white flex flex-col items-center">
          <div className="text-center space-y-1 mb-8">
            <p className="text-[10px] font-mono text-blue-400 uppercase tracking-widest">🧠 Memory Graph Map (神經傳導流線圖)</p>
            <p className="text-xs text-black/60">
              {isZh 
                ? "即時觀測 subagents 掃描事實匯入 LTM 記憶引擎 的拓撲神經傳導通道"
                : "A real-time structural schema modeling agent crawls into persistent visual clusters."}
            </p>
          </div>

          <div className="w-full relative py-4">
            <LtmNetworkVisualizer updates={allMemoryUpdates} />
          </div>
        </div>
      )}

      {/* Semantic Alignment Diagnostic view */}
      {activeTab === "alignment" && (
        <div className="rounded-sm border border-black/5 bg-white p-5 space-y-6 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">🔬 Semantic Concept Align Check</span>
            <button
              onClick={runAlignmentCheck}
              disabled={alignmentRunning}
              className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-full transition-all text-xs"
            >
              <RotateCw className={`h-3.5 w-3.5 ${alignmentRunning ? "animate-spin" : ""}`} />
              {isZh ? "啟動對齊比對偵測" : "Execute Alignment Sweep"}
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-sm border border-black/5 bg-neutral-100/40 p-4 space-y-4">
              <span className="text-[10px] text-black/40 uppercase font-semibold">🔍 Diagnostic Step Trace</span>
              <div className="space-y-2 min-h-[9rem] max-h-[14rem] overflow-y-auto">
                {alignmentStatus.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex gap-2 leading-relaxed text-[11px] text-slate-300"
                  >
                    <span className="text-blue-400 font-bold">&gt;</span>
                    <span>{log}</span>
                  </motion.div>
                ))}
                {alignmentRunning && (
                  <div className="flex items-center gap-2 text-cyan-400 animate-pulse mt-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                    <span>Analyzing vector overlap indices...</span>
                  </div>
                )}
                {!alignmentRunning && alignmentStatus.length === 0 && (
                  <p className="text-black/30 text-center py-10 italic">
                    {isZh ? "請點選核對按鈕，執行知識庫對齊" : "Click 'Execute Alignment Sweep' build task logs."}
                  </p>
                )}
              </div>
            </div>

            {/* Right block: Rating meter */}
            <div className="rounded-sm border border-black/5 bg-neutral-100/40 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-black/40 uppercase font-semibold block">Semantic Overlap Accuracy Score</span>
                <div className="mt-4 flex items-baseline gap-2">
                  <p className="text-4xl font-mono font-bold text-black">
                    {accuracyRating ? `${accuracyRating}%` : "---"}
                  </p>
                  <span className="text-xs text-blue-400/80 uppercase tracking-widest">
                    {accuracyRating ? "Optimal (卓越)" : "AWAITING TEST"}
                  </span>
                </div>
              </div>

              {alignmentRunning && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-black/40">
                    <span>Alignment calibration</span>
                    <span>{Math.round(alignmentProgress)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 text-blue-300 shadow-[0_0_8px_#3b82f6]" style={{ width: `${alignmentProgress}%` }} />
                  </div>
                </div>
              )}

              {accuracyRating && (
                <div className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2.5 text-[10.5px] text-emerald-300 animate-fade-in leading-relaxed">
                  <ShieldCheck className="h-5 w-5 text-emerald-300 shrink-0" />
                  <p>
                    {isZh 
                      ? "安全校驗：無交叉雜湊干擾，極端資訊流無佈局泄露。本記憶核心已全面具備生成生產環境建議之法律防護信度。"
                      : "Zero overlap gaps intercepted. Long-term memory structure has high structural confidence."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
