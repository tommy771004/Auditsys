import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sliders, 
  Volume2, 
  VolumeX, 
  Cpu, 
  Gauge, 
  Layers, 
  Wifi, 
  ShieldAlert, 
  Zap, 
  Activity, 
  Binary,
  Hammer
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { soundManager } from "../../utils/audioSynth";

export default function EngineTacticalCockpit() {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");

  // Interactive controls states
  const [soundOn, setSoundOn] = useState(soundManager.isEnabled);
  const [throttlingMode, setThrottlingMode] = useState<"none" | "3g" | "4g">("none");
  const [isolationLevel, setIsolationLevel] = useState<"standard" | "paranoid" | "off">("standard");
  const [thinkingDepth, setThinkingDepth] = useState(75); // 0-100 scale slider
  const [cpuCount, setCpuCount] = useState<4 | 8 | 16>(8);
  const [systemLoad, setSystemLoad] = useState<number[]>([15, 24, 21, 38, 41, 36, 45, 52, 48, 62]);

  // Sync sound setting changes globally or on mount
  useEffect(() => {
    const intervalLocal = setInterval(() => {
      if (soundManager.isEnabled !== soundOn) {
        setSoundOn(soundManager.isEnabled);
      }
    }, 400);
    return () => clearInterval(intervalLocal);
  }, [soundOn]);

  // Fluctuating metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemLoad((prev) => {
        const next = [...prev.slice(1)];
        const randomFluctuation = Math.floor(Math.random() * 20) - 10;
        // Paced dynamically around thinking depth
        const baseline = Math.round(thinkingDepth * 0.7);
        const val = Math.max(5, Math.min(100, baseline + randomFluctuation));
        next.push(val);
        return next;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [thinkingDepth]);

  // Handle click sound trigger
  const triggerSound = (type: "click" | "success" | "warning" | "engine_start" | "dial") => {
    soundManager.play(type);
  };

  const handleSoundToggle = () => {
    const nextState = soundManager.toggle();
    setSoundOn(nextState);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      id="tactical-engine-cockpit" 
      className="relative rounded-sm border border-teal-500/20 bg-[var(--surface)] p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(20,184,166,0.08)] ring-1 ring-teal-500/10 overflow-hidden group transition-all duration-200 ease-out hover:border-teal-500/30"
    >
      
      
      {/* Cockpit Title block */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-[var(--border)] pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-teal-400/30 bg-teal-500/10 text-teal-300 shadow-inner shadow-teal-500/20">
            <Sliders className="h-6 w-6 drop-shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-500/30 drop-shadow-sm">
                Sandbox Hyper-Engine
              </span>
              <span className="text-[10px] font-mono text-black/40 tracking-wider">COPILOT_TUNER_CONNECTED</span>
            </div>
            
            <h3 className="text-xl font-bold tracking-tight text-[var(--text)] flex items-center gap-2">
              {isZh ? "量子引擎參數調校座艙" : "Quantum Sandbox Co-Pilot Tuning Center"}
              <span className="text-xs font-mono font-normal opacity-70 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 shadow-inner shadow-cyan-500/10">Live Cockpit</span>
            </h3>
            
            <p className="text-sm text-slate-300/80 leading-relaxed max-w-2xl">
              {isZh 
                ? "自主調節物理沙箱的網路、安全、核心分配與模型深入思考參數。點選控制鈕可開啟硬體音效合成技術。"
                : "Tune network profiles, safety bounds, core allocations, and model reasoning depth. Toggle physical feedback synthesizer below."}
            </p>
          </div>
        </div>

        {/* Dynamic global feedback switcher */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          id="sound-feedback-toggle-btn"
          onClick={handleSoundToggle}
          className={`relative flex items-center gap-2.5 font-bold text-xs px-5 py-2.5 rounded-full border transition-all duration-300 select-none overflow-hidden ${
            soundOn 
              ? "bg-teal-500/10 border-teal-400/50 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.2)] hover:bg-teal-500/20" 
              : "bg-black/5 border-[var(--border)] text-black/50 hover:bg-black/10"
          }`}
        >
          {soundOn && <div className="absolute inset-0 bg-teal-400/10 animate-[pulse_2s_ease-in-out_infinite] pointer-events-none" />}
          {soundOn ? (
            <>
              <Volume2 className="h-4 w-4 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
              <span className="relative z-10">{isZh ? "音效合成開啟" : "Sound Synthesis ON"}</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4" />
              <span className="relative z-10">{isZh ? "音效關閉 (點選開啟)" : "Sound FX Muted"}</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Grid: physical switches + chart metrics */}
      <div className="relative z-10 grid gap-6 lg:grid-cols-12">
        
        {/* Left 8-cols: Switches and sliders */}
        <div className="lg:col-span-8 grid gap-4 md:grid-cols-2">
          
          {/* Section 1: Memory Constraints & Net throttle */}
          <div className="rounded-sm border border-black/5 bg-neutral-100/40 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <Wifi className="h-4 w-4 text-teal-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-black/50 font-bold">
                {isZh ? "網路沙箱環境模擬" : "Net Rate Emulator"}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-black/60 leading-normal">
                {isZh ? "針對緩慢網路載入進行 CLS / FCP 首屏對比分析時的限速條件：" : "Set speed constraints for measuring content layout shift ratios:"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "none", label: isZh ? "未限制" : "No Limit" },
                  { id: "4g", label: isZh ? "4G 中速" : "Medium 4G" },
                  { id: "3g", label: isZh ? "3G 慢速" : "Slow 3G" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setThrottlingMode(item.id as any);
                      triggerSound("dial");
                    }}
                    className={`py-2 px-3 rounded-sm border text-xs font-semibold font-mono transition-all duration-200 select-none ${
                      throttlingMode === item.id 
                        ? "border-teal-400/50 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]"
                        : "border-black/5 bg-[var(--surface)] text-black/60 hover:text-[var(--text)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Safety & Isolation Integrity */}
          <div className="rounded-sm border border-black/5 bg-neutral-100/40 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-black/50 font-bold">
                {isZh ? "Harness 隔離安全機制" : "Harness Sandbox Safety"}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-black/60 leading-normal">
                {isZh ? "編譯時是否實施嚴格程式碼沙箱特權隔離，防止外部危險呼叫：" : "Quarantine level holding suspicious third-party logic:"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "standard", label: isZh ? "平衡" : "Standard" },
                  { id: "paranoid", label: isZh ? "嚴格防禦" : "Paranoid" },
                  { id: "off", label: isZh ? "旁路" : "Bypass" }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setIsolationLevel(item.id as any);
                      if (item.id === "paranoid") triggerSound("warning");
                      else triggerSound("dial");
                    }}
                    className={`py-2 px-3 rounded-sm border text-xs font-semibold font-mono transition-all duration-200 select-none ${
                      isolationLevel === item.id 
                        ? item.id === "paranoid"
                          ? "border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                          : "border-teal-400/50 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]"
                        : "border-black/5 bg-[var(--surface)] text-black/60 hover:text-[var(--text)]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Model Thinking Depth Slider */}
          <div className="rounded-sm border border-black/5 bg-neutral-100/40 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-teal-400" />
                <span className="text-xs uppercase font-mono tracking-wider text-black/50 font-bold">
                  {isZh ? "推理深度等級" : "Model Reasoning Level"}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-teal-400">{thinkingDepth}%</span>
            </div>

            <div className="space-y-2">
              <input 
                type="range" 
                min="10" 
                max="100" 
                value={thinkingDepth} 
                onChange={(e) => {
                  setThinkingDepth(Number(e.target.value));
                  triggerSound("dial");
                }}
                className="w-full h-1.5 bg-neutral-100 rounded-sm appearance-none cursor-pointer accent-teal-400 focus:outline-none"
              />
              <div className="flex justify-between text-[9px] font-mono text-black/30">
                <span>{isZh ? "高速度 (Fast)" : "Velocity"}</span>
                <span>{isZh ? "平衡" : "Balanced"}</span>
                <span>{isZh ? "量子推理 (Quantum)" : "Deep Reasoning"}</span>
              </div>
            </div>
          </div>

          {/* Section 4: CPU Clusters Allocation dials */}
          <div className="rounded-sm border border-black/5 bg-neutral-100/40 p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-black/5 pb-2">
              <Cpu className="h-4 w-4 text-teal-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-black/50 font-bold">
                {isZh ? "平行化 CPU 線程分配" : "Sandboxed CPU Allocations"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-[var(--surface)] rounded-sm p-2.5 border border-black/5">
              <span className="text-xs text-black/60">{isZh ? "分配子核數：" : "Cores Allocated:"}</span>
              <div className="flex gap-1.5">
                {[4, 8, 16].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setCpuCount(num as any);
                      triggerSound("click");
                    }}
                    className={`h-7 w-9 rounded-sm border text-xs font-mono font-bold transition-all ${
                      cpuCount === num
                        ? "border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.2)]"
                        : "border-black/5 bg-black/5 text-black/40 hover:text-[var(--text)]"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right 4-cols: Real-time Fluctuating CPU load monitor spark line / spark canvas */}
        <div className="lg:col-span-4 flex flex-col justify-between group/monitor rounded-sm border border-black/5 bg-[var(--surface)] p-5 shadow-inner shadow-black/20 transition-colors hover:bg-[var(--surface)] hover:border-[var(--border)]">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-2 transition-colors group-hover/monitor:border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                <span className="text-xs uppercase font-mono tracking-wider text-black/50 font-bold transition-colors group-hover/monitor:text-black/70">
                  {isZh ? "系統即時核心負載" : "CPU Real-time Metrics"}
                </span>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-[pulse_1s_infinite] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>

            {/* Spark load line visualizer diagram */}
            <div className="h-28 flex items-end justify-between gap-1.5 bg-neutral-100/50 p-3 rounded-sm border border-black/5 overflow-hidden relative shadow-inner">
              
              {/* Background technical grid markers */}
              <div className="absolute inset-0 grid grid-rows-3 pointer-events-none select-none opacity-20">
                <div className="border-b border-[var(--border)] pr-2 text-[8px] font-mono text-black/60 text-right">80%</div>
                <div className="border-b border-[var(--border)] pr-2 text-[8px] font-mono text-black/60 text-right">40%</div>
                <div className="border-b border-[var(--border)] pr-2 text-[8px] font-mono text-black/60 text-right">10%</div>
              </div>

              {systemLoad.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end h-full relative z-10 w-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${val}%` }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`w-full rounded-t-sm shadow-[0_0_8px_rgba(45,212,191,0.3)] ${
                      val > 80 
                        ? "bg-gradient-to-t from-teal-500 to-rose-500"
                        : val > 60
                        ? "bg-gradient-to-t from-teal-500 to-amber-400" 
                        : "bg-gradient-to-t from-teal-600 to-teal-400"
                    }`} 
                  />
                  <span className="text-[7px] font-mono text-black/30 text-center scale-90 block mt-1 transition-colors group-hover/monitor:text-teal-200/60">{val}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-black/5 space-y-2 transition-colors group-hover/monitor:border-[var(--border)]">
            <div className="flex justify-between items-center text-[11px] p-1.5 rounded bg-black/5">
              <span className="text-black/50">{isZh ? "核心狀態機制:" : "Cluster Core State:"}</span>
              <span className="font-mono text-teal-300 font-bold tracking-wider drop-shadow-[0_0_4px_rgba(45,212,191,0.4)]">READY</span>
            </div>
            <div className="flex justify-between items-center text-[11px] p-1.5 rounded bg-black/5">
              <span className="text-black/50">{isZh ? "隔離區防護指標:" : "Containment Integrity:"}</span>
              <span className="font-mono text-emerald-400 font-bold tracking-wider drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]">100% SECURE</span>
            </div>
          </div>
        </div>

      </div>

    </motion.div>
  );
}
