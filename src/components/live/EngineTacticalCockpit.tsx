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
    <div 
      id="tactical-engine-cockpit" 
      className="rounded-3xl border border-teal-500/30 bg-slate-950/70 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(20,184,166,0.06)] ring-1 ring-teal-500/10"
    >
      {/* Cockpit Title block */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-400/30 bg-teal-500/10 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.2)]">
            <Sliders className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-teal-300 border border-teal-500/30">
                Sandbox Hyper-Engine
              </span>
              <span className="text-[10px] font-mono text-white/40">COPILOT_TUNER_CONNECTED</span>
            </div>
            
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {isZh ? "量子引擎參數調校座艙" : "Quantum Sandbox Co-Pilot Tuning Center"}
              <span className="text-xs font-mono font-normal opacity-50 px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">Live Cockpit</span>
            </h3>
            
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              {isZh 
                ? "自主調節物理沙箱的網路、安全、核心分配與模型深入思考參數。點選控制鈕可開啟硬體音效合成技術。"
                : "Tune network profiles, safety bounds, core allocations, and model reasoning depth. Toggle physical feedback synthesizer below."}
            </p>
          </div>
        </div>

        {/* Dynamic global feedback switcher */}
        <button
          id="sound-feedback-toggle-btn"
          onClick={handleSoundToggle}
          className={`flex items-center gap-2.5 font-bold text-xs px-5 py-2.5 rounded-full border transition-all duration-300 select-none ${
            soundOn 
              ? "bg-teal-500/20 border-teal-400/50 text-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.25)]" 
              : "bg-white/5 border-white/10 text-white/50"
          }`}
        >
          {soundOn ? (
            <>
              <Volume2 className="h-4 w-4 text-teal-400 animate-pulse" />
              <span>{isZh ? "音效合成開啟" : "Sound Synthesis ON"}</span>
            </>
          ) : (
            <>
              <VolumeX className="h-4 w-4" />
              <span>{isZh ? "音效關閉 (點選開啟)" : "Sound FX Muted"}</span>
            </>
          )}
        </button>
      </div>

      {/* Grid: physical switches + chart metrics */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left 8-cols: Switches and sliders */}
        <div className="lg:col-span-8 grid gap-4 md:grid-cols-2">
          
          {/* Section 1: Memory Constraints & Net throttle */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Wifi className="h-4 w-4 text-teal-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-white/50 font-bold">
                {isZh ? "網路沙箱環境模擬" : "Net Rate Emulator"}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-white/60 leading-normal">
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
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold font-mono transition-all duration-200 select-none ${
                      throttlingMode === item.id 
                        ? "border-teal-400/50 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]"
                        : "border-white/5 bg-slate-950/40 text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Safety & Isolation Integrity */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-white/50 font-bold">
                {isZh ? "Harness 隔離安全機制" : "Harness Sandbox Safety"}
              </span>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-white/60 leading-normal">
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
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold font-mono transition-all duration-200 select-none ${
                      isolationLevel === item.id 
                        ? item.id === "paranoid"
                          ? "border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.15)]"
                          : "border-teal-400/50 bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.15)]"
                        : "border-white/5 bg-slate-950/40 text-white/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Model Thinking Depth Slider */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-teal-400" />
                <span className="text-xs uppercase font-mono tracking-wider text-white/50 font-bold">
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
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-teal-400 focus:outline-none"
              />
              <div className="flex justify-between text-[9px] font-mono text-white/30">
                <span>{isZh ? "高速度 (Fast)" : "Velocity"}</span>
                <span>{isZh ? "平衡" : "Balanced"}</span>
                <span>{isZh ? "量子推理 (Quantum)" : "Deep Reasoning"}</span>
              </div>
            </div>
          </div>

          {/* Section 4: CPU Clusters Allocation dials */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5 space-y-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Cpu className="h-4 w-4 text-teal-400" />
              <span className="text-xs uppercase font-mono tracking-wider text-white/50 font-bold">
                {isZh ? "平行化 CPU 線程分配" : "Sandboxed CPU Allocations"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-slate-950/40 rounded-xl p-2.5 border border-white/5">
              <span className="text-xs text-white/60">{isZh ? "分配子核數：" : "Cores Allocated:"}</span>
              <div className="flex gap-1.5">
                {[4, 8, 16].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      setCpuCount(num as any);
                      triggerSound("click");
                    }}
                    className={`h-7 w-9 rounded-lg border text-xs font-mono font-bold transition-all ${
                      cpuCount === num
                        ? "border-teal-400 bg-teal-500/20 text-teal-300 shadow-[0_0_8px_rgba(20,184,166,0.2)]"
                        : "border-white/5 bg-white/5 text-white/40 hover:text-white"
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
        <div className="lg:col-span-4 rounded-2xl border border-white/5 bg-slate-950/40 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-400 animate-pulse" />
                <span className="text-xs uppercase font-mono tracking-wider text-white/40 font-bold">
                  {isZh ? "系統即時核心負載" : "CPU Real-time Metrics"}
                </span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            </div>

            {/* Spark load line visualizer diagram */}
            <div className="h-28 flex items-end justify-between gap-1.5 bg-slate-950/60 p-3 rounded-xl border border-white/5 overflow-hidden relative">
              
              {/* Background technical grid markers */}
              <div className="absolute inset-0 grid grid-rows-3 pointer-events-none select-none opacity-10">
                <div className="border-b border-white pr-2 text-[8px] font-mono text-white text-right">80%</div>
                <div className="border-b border-white pr-2 text-[8px] font-mono text-white text-right">40%</div>
                <div className="border-b border-white pr-2 text-[8px] font-mono text-white text-right">10%</div>
              </div>

              {systemLoad.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col justify-end h-full">
                  <motion.div 
                    layoutId={`bar-${idx}`}
                    className={`w-full rounded-t-sm transition-all duration-300 ${
                      val > 70 
                        ? "bg-gradient-to-t from-teal-500 to-amber-500" 
                        : "bg-teal-400"
                    }`} 
                    style={{ height: `${val}%` }} 
                  />
                  <span className="text-[7px] font-mono text-white/30 text-center scale-75 block mt-1">{val}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-white/55">{isZh ? "核心狀態機制:" : "Cluster Core State:"}</span>
              <span className="font-mono text-teal-300 font-bold">READY</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-white/55">{isZh ? "隔離區防護指標:" : "Containment Integrity:"}</span>
              <span className="font-mono text-teal-300 font-bold">100% SECURE</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
