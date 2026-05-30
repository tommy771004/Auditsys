import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Sparkles, 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle,
  Play,
  RotateCcw,
  UserCheck,
  ChevronRight,
  Flame,
  Scale,
  BrainCircuit,
  MessageSquareDiff
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { soundManager } from "../../utils/audioSynth";

interface DebateTurn {
  round: number;
  role: "planner" | "generator" | "evaluator";
  title: string;
  avatar: string;
  color: string;
  message: string;
  rating?: number;
}

export default function PgeAgentDebateSimulator() {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");

  const [isRunning, setIsRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(-1);
  const [displayedStory, setDisplayedStory] = useState<DebateTurn[]>([]);
  const debateContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic as rounds unfold
  useEffect(() => {
    if (debateContainerRef.current) {
      debateContainerRef.current.scrollTo({
        top: debateContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [displayedStory]);

  const debateTimeline: DebateTurn[] = [
    // ROUND 1
    {
      round: 1,
      role: "planner",
      title: isZh ? "【策劃者 Planner-Agent】" : "[Planner Agent]",
      avatar: "🧠",
      color: "border-blue-400 bg-blue-500/10 text-blue-300",
      message: isZh 
        ? "建立 Sprint Contract #9802：主要任務為優化首屏 Hero Banner。定義成功指標：動態 WebP 支持、延遲載入、LCP < 1.2s、防止 layout shift。"
        : "Establishing Sprint Contract #9802. Core target: Optimize Hero Banner asset loading. Core metrics: dynamic WebP, lazy-loading, FCP < 1.2s, 0 layout shifts."
    },
    {
      round: 1,
      role: "generator",
      title: isZh ? "【生成者 Generator-Agent】" : "[Generator Agent]",
      avatar: "⚙️",
      color: "border-violet-400 bg-violet-500/10 text-violet-300",
      message: isZh 
        ? "第一代解決方案：直接注入 inline Base64 格式的壓縮 Banner，避免 HTTP 請求，直接在 DOM 內層級載入。"
        : "Draft 1 implementation: Encoding hero banner into inline Base64 string to reduce HTTP overhead and render immediately in the main markup.",
    },
    {
      round: 1,
      role: "evaluator",
      title: isZh ? "【冷酷審判者 Evaluator-Agent】" : "[Evaluator Agent]",
      avatar: "⚖️",
      color: "border-rose-400 bg-rose-500/10 text-rose-300",
      message: isZh 
        ? "❌【駁回】Base64 在 HTML 中使大小膨脹了 33.4%，極大阻礙了關鍵路徑 JavaScript 檔案的解析，使得 LCP 狂飆到 2.8s！這是嚴重的自我盲點！"
        : "❌ [REJECTED] Base64 string inflated initial HTML raw size by factor of 33.4%, blocking the main thread from requesting crucial bundle parts. LCP degraded to 2.8s!",
      rating: 42
    },

    // ROUND 2
    {
      round: 2,
      role: "planner",
      title: isZh ? "【策劃者 Planner-Agent】" : "[Planner Agent]",
      avatar: "🧠",
      color: "border-blue-400 bg-blue-500/10 text-blue-300",
      message: isZh 
        ? "重定義合約：拒絕 inline inline 格式。強制採用動態媒體查詢 srcset 配套 <img> 與 100vw 定寬邊距。"
        : "Contract updated: Ban inline Base64 data blocks. Mandating native HTML `srcset` dynamic queries paired with explicit aspect-ratio wraps."
    },
    {
      round: 2,
      role: "generator",
      title: isZh ? "【生成者 Generator-Agent】" : "[Generator Agent]",
      avatar: "⚙️",
      color: "border-violet-400 bg-violet-500/10 text-violet-300",
      message: isZh 
        ? "第二代解決方案：升級至 srcset。調用外部 CDN 提供 480w, 800w 與 1200w 版本的 Banner 優化圖，並加上 loading=\"lazy\"。"
        : "Draft 2 implementation: Refactoring code blocks dynamically using native media queries at sizes 480w, 800w, and 1200w. Opt-in loading=\"lazy\"."
    },
    {
      round: 2,
      role: "evaluator",
      title: isZh ? "【冷酷審判者 Evaluator-Agent】" : "[Evaluator Agent]",
      avatar: "⚖️",
      color: "border-rose-400 bg-rose-500/10 text-rose-305",
      message: isZh 
        ? "❌【駁回】大錯特錯！若對於首屏 LCP 資源使用 「loading=lazy」，將會欺騙瀏覽器排程、拖遲首屏渲染時間，LCP 降速了 450ms！應改成 eager 載入並提早進行預載入 (preload)。"
        : "❌ [REJECTED] Anti-pattern detected! Applying loading=\"lazy\" on above-the-fold media elements tells the browser scheduler to hold off requests. This delayed LCP by 450ms! Eager load + Preload must be used instead.",
      rating: 61
    },

    // ROUND 3
    {
      round: 3,
      role: "planner",
      title: isZh ? "【策劃者 Planner-Agent】" : "[Planner Agent]",
      avatar: "🧠",
      color: "border-blue-400 bg-blue-500/10 text-blue-300",
      message: isZh 
        ? "修訂合約：首屏媒體一律改為 eager 模式並加入 link tag preload headers，同時追加不支援 WebP 的 JPEG 回退機制。"
        : "Contract amended: Force loading=\"eager\" and register link rel=preload tag, while requesting standard visual fallback formats for ancient legacy engines."
    },
    {
      round: 3,
      role: "generator",
      title: isZh ? "【生成者 Generator-Agent】" : "[Generator Agent]",
      avatar: "⚙️",
      color: "border-violet-400 bg-violet-500/10 text-violet-300",
      message: isZh 
        ? "第三代解決方案：改寫成 <picture> 模型。內嵌 WebP/AVIF 極佳性能檔，底層搭配 fallback JPEG，並在頂層 index.html 寫入 header <link rel=\"preload\" as=\"image\"> 進行快取加速。"
        : "Draft 3 implementation: Re-implementing with <picture> tag. Offering low-footprint AVIF/WebP siblings while keeping clean preloads in the container headers.",
    },
    {
      round: 3,
      role: "evaluator",
      title: isZh ? "【冷酷審判者 Evaluator-Agent】" : "[Evaluator Agent]",
      avatar: "⚖️",
      color: "border-emerald-400 bg-emerald-500/10 text-emerald-300",
      message: isZh 
        ? "✅【合格審查通過】測試報告：FCP = 0.8s，LCP = 1.05s。所有安全考量、瀏覽器相容性、與網頁累計佈局偏移皆達到滿分 (Score: 98/100)。"
        : "✅ [VERIFIED & MERGED] Telemetry report: FCP of 0.8s achieved alongside LCP of 1.05s. Security, legacy cross-engine support, and CLS scores maximized.",
      rating: 98
    }
  ];

  const startSimulation = async () => {
    if (isRunning) return;
    soundManager.play("engine_start");
    setIsRunning(true);
    setCurrentRound(1);
    setActiveStepIndex(0);
    setDisplayedStory([debateTimeline[0]]);
    soundManager.play("pge_debate");

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 1; i < debateTimeline.length; i++) {
      await sleep(2600);
      setActiveStepIndex(i);
      setCurrentRound(debateTimeline[i].round);
      
      const turn = debateTimeline[i];
      setDisplayedStory((prev) => [...prev, turn]);
      
      if (turn.role === "evaluator") {
        if (turn.rating && turn.rating >= 90) {
          soundManager.play("success");
        } else {
          soundManager.play("warning");
        }
      } else {
        soundManager.play("pge_debate");
      }
    }
    setIsRunning(false);
  };

  const resetSimulation = () => {
    soundManager.play("dial");
    setIsRunning(false);
    setCurrentRound(0);
    setActiveStepIndex(-1);
    setDisplayedStory([]);
  };

  const getActiveRating = () => {
    // Return latest evaluator rating
    const ratings = displayedStory
      .filter((d) => d.rating !== undefined)
      .map((d) => d.rating as number);
    return ratings.length > 0 ? ratings[ratings.length - 1] : 0;
  };

  return (
    <div id="pge-debate-simulator-container" className="rounded-3xl border border-blue-500/30 bg-slate-950/70 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(59,130,246,0.06)] ring-1 ring-blue-500/10 mt-8">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-blue-300 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
            <Scale className={`h-6 w-6 ${isRunning ? "animate-bounce" : ""}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300 border border-blue-500/30">
                PGE ADVERSARIAL ACTIVE
              </span>
              <span className="text-[10px] font-mono text-white/40">Sprint_Contract_Negotiations_Armed</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {isZh ? "PGE 非交互式代碼論證對抗引擎" : "PGE Non-interactive Code Argumentation Sandbox"}
              <span className="text-xs font-mono font-normal opacity-50 px-2 py-0.5 rounded-full bg-white/10 border border-white/5">GAN-Style</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              {isZh 
                ? "為防範 LLM 對自身產出之程式碼產生「愚弄與評估盲區」，PGE 框架強制將子任務交給 Generator，並由獨立的 Evaluator 扮演冷酷的審查考官，透過多個博弈批駁回合 (5–15 次循環) 持續調優，不達標絕不放行。"
                : "To prevent self-evaluation blind spots, the PGE paradigm separates execution between a Generator and an uncompromising Evaluator, pushing adversarial review cycles (5-15 rounds) until zero-regression is attained."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {displayedStory.length === 0 ? (
            <button
              id="start-pge-simulation-btn"
              onClick={startSimulation}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300 active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" />
              {isZh ? "啟動 PGE 多輪對抗博弈" : "Initiate PGE Adversarial Loop"}
            </button>
          ) : (
            <button
              id="reset-pge-simulation-btn"
              onClick={resetSimulation}
              className="flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 rounded-full transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              {isZh ? "重置論證" : "Reset Debate"}
            </button>
          )}
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Aspect: 3 Active Agents Status Card */}
        <div className="lg:col-span-4 rounded-2xl border border-white/5 bg-slate-950/40 p-5 space-y-4">
          <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 font-bold block border-b border-white/5 pb-2">
            {isZh ? "當前多代理人博弈狀態" : "Agent Adversary States"}
          </span>

          {/* Planner Card */}
          <div className={`p-3 rounded-xl border transition-all duration-300 ${
            activeStepIndex >= 0 && debateTimeline[activeStepIndex].role === "planner"
              ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              : "border-white/5 bg-slate-900/40 opacity-70"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <div>
                <h4 className="text-xs font-bold text-white">{isZh ? "策劃者 (Planner Agent)" : "Planner Agent"}</h4>
                <p className="text-[10px] text-blue-300/80 font-mono">Role: Contract & Spec Architect</p>
              </div>
            </div>
          </div>

          {/* Generator Card */}
          <div className={`p-3 rounded-xl border transition-all duration-300 ${
            activeStepIndex >= 0 && debateTimeline[activeStepIndex].role === "generator"
              ? "border-violet-500 bg-violet-500/10 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
              : "border-white/5 bg-slate-900/40 opacity-70"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <div>
                <h4 className="text-xs font-bold text-white">{isZh ? "生成者 (Generator Agent)" : "Generator Agent"}</h4>
                <p className="text-[10px] text-violet-300/80 font-mono">Role: Code Artisan & Refactorer</p>
              </div>
            </div>
          </div>

          {/* Evaluator Card */}
          <div className={`p-3 rounded-xl border transition-all duration-300 ${
            activeStepIndex >= 0 && debateTimeline[activeStepIndex].role === "evaluator"
              ? "border-rose-500 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
              : "border-white/5 bg-slate-900/40 opacity-70"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <div>
                <h4 className="text-xs font-bold text-white">{isZh ? "冷酷審判者 (Evaluator Agent)" : "Evaluator Agent"}</h4>
                <p className="text-[10px] text-rose-300/80 font-mono">Role: Uncompromising Quality Gate</p>
              </div>
            </div>
          </div>

          {/* Audit Metrics */}
          <div className="rounded-xl border border-white/5 bg-slate-900/20 p-4 space-y-3 pt-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block">
              {isZh ? "審查品質防線阻尼" : "Adversarial Quality Gate"}
            </span>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-white/60">{isZh ? "當前博弈回合" : "Active Rounds"}</span>
                <span className="font-mono text-white font-semibold">
                  {currentRound > 0 ? `Round ${currentRound} / 3` : "Idle"}
                </span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${(currentRound / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-white/60">{isZh ? "產出品質分數" : "Evaluator Match Score"}</span>
                <span className={`font-mono font-bold ${
                  getActiveRating() >= 90 ? "text-emerald-400" : getActiveRating() > 0 ? "text-rose-400" : "text-white/40"
                }`}>
                  {getActiveRating() > 0 ? `${getActiveRating()}%` : "0%"}
                </span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    getActiveRating() >= 90 ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                  style={{ width: `${getActiveRating()}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Aspect: Terminal/Debate dialogue tracker */}
        <div className="lg:col-span-8 flex flex-col min-h-[350px] rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden relative">
          
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold font-mono">
              <MessageSquareDiff className="h-4 w-4 text-blue-400" />
              <span>{isZh ? "PGE 協商對抗討論群組" : "PGE Real-Time Negotiative Dialogue Stream"}</span>
            </div>
            {isRunning && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono animate-pulse font-bold">
                ● RUN_ACTIVE
              </span>
            )}
          </div>

          <div 
            ref={debateContainerRef}
            className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[290px] custom-scrollbar"
          >
            {displayedStory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-white/30 space-y-2 select-none">
                <BrainCircuit className="h-10 w-10 text-white/10 animate-pulse" />
                <p className="text-xs italic">{isZh ? "點擊上方「啟動 PGE 多輪對抗博弈」以解鎖子任務自主調優對抗機制" : "Click 'Initiate PGE Adversarial Loop' to spawn evaluation debate simulations."}</p>
              </div>
            ) : (
              <AnimatePresence>
                {displayedStory.map((turn, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex gap-3 text-xs leading-relaxed"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-sm select-none">
                      {turn.avatar}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white/90">{turn.title}</span>
                        <span className="text-[10px] text-white/30 font-mono">Round {turn.round}</span>
                      </div>
                      <div className={`p-3 rounded-2xl border ${turn.color} mt-1`}>
                        <p className="text-[11px] leading-relaxed select-text whitespace-pre-wrap">{turn.message}</p>
                        {turn.rating !== undefined && (
                          <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-white/40">{isZh ? "一審評核分數" : "Audit score metric:"}</span>
                            <span className={turn.rating >= 90 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                              {turn.rating} / 100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Sandbox Footer Info line */}
          <div className="flex items-center justify-between border-t border-white/5 bg-slate-900/40 px-4 py-2 text-[10px] text-white/40">
            <span className="flex items-center gap-1.5 font-mono">
              <Users className="h-3.5 w-3.5 text-blue-400" />
              {isZh ? "安全沙箱策略：非共享主線模型隔離安全門檻已配置" : "Inter-Agent Protocol: Non-interactive critique isolated pipelines active"}
            </span>
            <span>GAN-Optimization: Armed</span>
          </div>

        </div>

      </div>

    </div>
  );
}
