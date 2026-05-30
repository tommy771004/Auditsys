import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  RefreshCcw, 
  Code, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  GitPullRequest, 
  Bot,
  Zap,
  Play
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { soundManager } from "../../utils/audioSynth";

interface LogMessage {
  time: string;
  type: "info" | "success" | "error" | "warning" | "agent";
  message: string;
}

export default function RalphLoopSimulator() {
  const { i18n } = useTranslation();
  const isZh = i18n.language?.startsWith("zh");

  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<"idle" | "round1_edit" | "round1_fail" | "round2_edit" | "round2_fail" | "round3_edit" | "round3_pass" | "completed">("idle");
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [codeContent, setCodeContent] = useState("");
  const [activeTab, setActiveTab] = useState<"editor" | "terminal" | "tests">("editor");

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = (message: string, type: LogMessage["type"] = "info") => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.${String(now.getMilliseconds()).padStart(3, "0")}`;
    setLogs((prev) => [...prev, { time: timeStr, type, message }]);
  };

  const initialCode = `// src/components/Navigation.tsx
export default function Navigation() {
  return (
    <nav className="flex items-center gap-4">
      {/* CLS Issue: No width/height on logo, shifting DOM under slow networks */}
      <img src="/assets/logo.png" className="w-auto h-auto transition-all" />
      <div className="flex gap-2">
        <a href="#home">Home</a>
        <a href="#about">About</a>
      </div>
    </nav>
  );
}`;

  const round1Code = `// src/components/Navigation.tsx
export default function Navigation() {
  return (
    <nav className="flex items-center gap-4">
      {/* Round 1 Auto-Fix: Adds strict dimensions but with incorrect JSX parenthesis */}
      <img src="/assets/logo.png" width={180 height={60} className="w-[180px] h-[60px]" />
      <div className="flex gap-2">
        <a href="#home">Home</a>
        <a href="#about">About</a>
      </div>
    </nav>
  );
}`;

  const round2Code = `// src/components/Navigation.tsx
// Forgot to import some legacy types but corrected JSX
export default function Navigation({ styleProps }) {
  // TypeScript strict checks will fail: styleProps is implicitly 'any'
  return (
    <nav style={styleProps} className="flex items-center gap-4">
      <img src="/assets/logo.png" width={180} height={60} className="w-[180px] h-[60px]" />
      <div className="flex gap-2">
        <a href="#home">Home</a>
        <a href="#about">About</a>
      </div>
    </nav>
  );
}`;

  const round3Code = `// src/components/Navigation.tsx
import React from "react";

interface NavProps {
  styleProps?: React.CSSProperties;
}

export default function Navigation({ styleProps = {} }: NavProps) {
  return (
    <nav style={styleProps} className="flex items-center gap-4">
      {/* Fully sized with strict explicit types & aspect ratio container to prevent layout shift */}
      <div className="relative w-[180px] h-[60px] aspect-video overflow-hidden">
        <img 
          src="/assets/logo.png" 
          width={180} 
          height={60} 
          className="w-full h-full object-contain" 
          loading="eager" 
        />
      </div>
      <div className="flex gap-2">
        <a href="#home" className="hover:text-brand-cyan">Home</a>
        <a href="#about" className="hover:text-brand-cyan">About</a>
      </div>
    </nav>
  );
}`;

  // Reset simulator state
  const handleReset = () => {
    soundManager.play("dial");
    setIsRunning(false);
    setCurrentStep("idle");
    setLogs([]);
    setCodeContent(initialCode);
    setActiveTab("editor");
  };

  const runSimulation = async () => {
    if (isRunning) return;
    soundManager.play("engine_start");
    setIsRunning(true);
    setLogs([]);
    setActiveTab("editor");

    // Helper sleep function for pacing
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // STAGE 1: Starting
    setCurrentStep("round1_edit");
    setCodeContent(initialCode);
    addLog(isZh ? "⚙️ 啟動 Ralph Loop (閉環自動修正引擎)..." : "⚙️ Launching Ralph Loop (Closed-loop auto-correction engine)...", "info");
    addLog(isZh ? "🔍 偵測到 Navigation.tsx 存在嚴重的佈局偏移 (CLS = 0.38)" : "🔍 Critical Layout Shift (CLS = 0.38) detected in Navigation.tsx", "warning");
    addLog(isZh ? "🤖 正在委派給 CodeEditAgent 自主分析並編寫修復代碼..." : "🤖 Delegating navigation CLS fix to CodeEditAgent...", "agent");
    await sleep(2200);

    // Write Round 1 Code
    soundManager.play("click");
    setCodeContent(round1Code);
    addLog(isZh ? "💾 CodeEditAgent 產出了第一版修復程式碼，正在保存並寫入記憶體..." : "💾 CodeEditAgent produced Version 1 fix code. Saving to virtual workspace...", "agent");
    await sleep(1500);

    // STAGE 2: Round 1 compilation failing (Observe)
    soundManager.play("warning");
    setCurrentStep("round1_fail");
    setActiveTab("terminal");
    addLog(isZh ? "🔨 啟動 Sandbox 沙箱編譯器 (Vite Bundler - Hot Reload & Lint)..." : "🔨 Launching sandboxed compiler (Vite Bundler / SWC)...", "info");
    await sleep(1200);
    addLog("src/components/Navigation.tsx:6:41 - SyntaxError: Unexpected token, expected \",\"", "error");
    addLog("    > 6 |       <img src=\"/assets/logo.png\" width={180 height={60} className=\"w-[180px] h-[60px]\" />", "error");
    addLog("        |                                              ^", "error");
    addLog(isZh ? "❌ 沙箱編譯失敗：發現語法錯誤 (Syntax Error)！環境拒絕整合這個變更。" : "❌ Bundler compilation error: Syntax Error! Work environment rejected this change.", "error");
    addLog(isZh ? "🚨 Playwright 即時視覺迴圈：未開啟，因為程式碼無法正常構建。" : "🚨 Playwright E2E loop: Inhibited (build broke).", "warning");
    await sleep(2500);

    // STAGE 3: Round 2 code write (Auto feedback to LLM)
    soundManager.play("click");
    setCurrentStep("round2_edit");
    setActiveTab("editor");
    addLog(isZh ? "🔄 Ralph 閉環自動捕獲編譯錯誤：正在將編譯器 STDERR 回傳給 CodeEditAgent 重新推理..." : "🔄 Ralph Loop interceptor captured compiler STDERR. Retrofitting back to LLM context...", "info");
    addLog(isZh ? "🤖 ClientAgent 分析編譯錯誤：補上缺失的逗號/屬性界膜。進行第二次優化..." : "🤖 ClientAgent analyzing compilation error: Correcting missing attributes. Retrying optimisations...", "agent");
    await sleep(2200);

    setCodeContent(round2Code);
    addLog(isZh ? "💾 寫入第二版優化代碼。正在調用 TypeScript 嚴格類型檢查..." : "💾 Saving Version 2 code. Running typescript direct strict check...", "agent");
    await sleep(1500);

    // STAGE 4: Round 2 typescript check fails (Observe)
    soundManager.play("warning");
    setCurrentStep("round2_fail");
    setActiveTab("terminal");
    addLog(isZh ? "🔨 啟動 TypeScript TSC 編譯及靜態程式碼分析 (Linter)..." : "🔨 Running TypeScript compiler TSC & ESLint validator...", "info");
    await sleep(1200);
    addLog("src/components/Navigation.tsx:3:43 - error TS7006: Parameter 'styleProps' implicitly has an 'any' type.", "error");
    addLog("    > 3 | export default function Navigation({ styleProps }) {", "error");
    addLog("        |                                      ~~~~~~~~~~", "error");
    addLog(isZh ? "❌ 類型檢查失敗！Ralph Loop 回報 Linter 與編譯門檻檢驗未通過。" : "❌ Strict Typecheck failed! ESLint/TSC gateway rejected build.", "error");
    await sleep(2500);

    // STAGE 5: Round 3 code write (Auto feedback again)
    soundManager.play("click");
    setCurrentStep("round3_edit");
    setActiveTab("editor");
    addLog(isZh ? "🔄 Ralph 閉環再次攔截異常！已安全隔離有缺陷的代碼。正在回傳 TS7006 錯誤至 Agent 脈絡中..." : "🔄 Ralph Loop interceptor re-triggered! Strict isolated sandbox protected codebase, sending TS7006 back...", "warning");
    addLog(isZh ? "🤖 Agent 引進 React.CSSProperties 嚴格定義，補上 Props 接口類型限定..." : "🤖 Agent importing React.CSSProperties types & setting defaults...", "agent");
    await sleep(2200);

    setCodeContent(round3Code);
    addLog(isZh ? "💾 第三版健全程式碼封裝完成。正在重啟沙箱跑全套自動化測試..." : "💾 Version 3 typed code finalized. Triggering full sandboxed cycle...", "agent");
    await sleep(1500);

    // STAGE 6: Compile & Test success
    soundManager.play("success");
    setCurrentStep("round3_pass");
    setActiveTab("tests");
    addLog(isZh ? "🔨 執行編譯與 ESLint：完成！出現 0 個警告、0 個錯誤。" : "🔨 Compiling & ESLint checking: Done! 0 warnings, 0 errors.", "success");
    await sleep(1000);
    addLog(isZh ? "🎭 啟動 Playwright 無人瀏覽器自動化 E2E 視覺對照與 CLS 分析..." : "🎭 Spawning Playwright browser instance for layout stability comparison...", "info");
    await sleep(1500);
    soundManager.play("success");
    addLog(isZh ? "✅ Playwright 視窗首屏截圖無佈局偏移，CLS 由 0.38 精確降至 0.00" : "✅ Playwright screenshot matched baseline. CLS dropped from 0.38 to 0.00!", "success");
    addLog(isZh ? "✓ 單元測試：Navigation.tsx 渲染正常。3/3 項目通過！" : "✓ Unit tests: Navigation.tsx renders normally. 3/3 passed!", "success");
    await sleep(2000);

    // STAGE 7: Completed & Commit
    soundManager.play("success");
    setCurrentStep("completed");
    addLog(isZh ? "🎉 Ralph 閉環成功融合代碼！品質門票檢驗合格。正在自動生成分支並發起交付 PR..." : "🎉 Ralph Loop auto-fix loop completed with pristine quality. Submitting Pull Request...", "success");
    addLog("==========================================", "info");
    addLog(isZh ? "📦 整合指標報告：" : "📦 Execution Metrics Report:", "success");
    addLog(isZh ? "   - 優化對象: src/components/Navigation.tsx" : "   - Target Component: src/components/Navigation.tsx", "info");
    addLog(isZh ? "   - CLS 成效: 0.38 ⟶ 0.00 (符合 Core Web Vitals 標準)" : "   - CLS Performance: 0.38 ⟶ 0.00 (Optimal CWV)", "info");
    addLog(isZh ? "   - 二次修改次數 (Ralph Loops): 2 輪自動修正" : "   - Correction Rounds (Ralph Loops): 2 rounds", "info");
    addLog(isZh ? "   - 節省人工 Debug 時間: 約 4.5 小時" : "   - Manual Developer Hours Saved: ~4.5 hrs", "info");
    addLog(isZh ? "   - 安全審查: 電腦與 sandbox 機械化防禦 100% 阻隔有瑕疵代碼" : "   - Safety Guard: 100% block of bad scripts in sandboxed runtimes", "success");
    addLog("==========================================", "info");
  };

  useEffect(() => {
    setCodeContent(initialCode);
  }, []);

  return (
    <div id="ralph-loop-visualizer-container" className="rounded-3xl border border-violet-500/30 bg-slate-950/70 p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(139,92,246,0.06)] ring-1 ring-violet-500/10">
      
      {/* Simulation Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-white/10 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-violet-400/30 bg-violet-500/10 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
            <RefreshCcw className={`h-6 w-6 ${isRunning && currentStep !== "completed" ? "animate-spin" : ""}`} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300 border border-violet-500/30 animate-pulse">
                RALPH-LOOP ACTIVE
              </span>
              <span className="text-[10px] font-mono text-white/40">CLOSED_LOOP_RECOVERY_ARMED</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {isZh ? "Ralph Loop 閉環代碼自主修復沙箱" : "Ralph Loop Closed-Loop Code Correction Sandbox"}
              <span className="text-xs font-mono font-normal opacity-50 px-2 py-0.5 rounded-full bg-white/10 border border-white/5">v1.2-beta</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
              {isZh 
                ? "自主代理的最高境界不僅是「出報告」，而是現場把模型放入一個由 Sandboxed Compiler 与 Playwright 構成的「行動-觀察-反思-修正」Ralph 閉環：出錯自動寫反思日誌重構，直到編譯與 E2E 測試 100% 通過才交付。"
                : "The highest boundary of agentic workflows is putting LLMs inside a closed cycle of 'action-observation-reflection-correction'. This simulation demonstrates the exact compiler-linter-E2E closed loop."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isRunning ? (
            <button
              id="start-ralph-simulation-btn"
              onClick={runSimulation}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-6 py-2.5 rounded-full shadow-[0_0_20px_rgba(135,92,246,0.3)] hover:shadow-[0_0_25px_rgba(135,92,246,0.5)] transition-all duration-300 active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" />
              {isZh ? "啟動 Ralph 閉環模擬修復" : "Trigger Ralph Loop Auto-Fix"}
            </button>
          ) : (
            <button
              id="reset-ralph-simulation-btn"
              onClick={handleReset}
              className="flex items-center gap-2 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-semibold px-4 py-2 rounded-full transition-all"
            >
              <RefreshCcw className="h-4 w-4" />
              {isZh ? "重置沙箱" : "Reset Sandbox"}
            </button>
          )}
        </div>
      </div>

      {/* Main Core View Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Left Side: Loop Nodes & Active Step Visualizer */}
        <div className="lg:col-span-4 rounded-2xl border border-white/5 bg-slate-950/40 p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 font-bold block border-b border-white/5 pb-2">
              {isZh ? "閉環狀態追蹤" : "Closed Loop State Tracker"}
            </span>

            {/* Simulated node paths */}
            <div className="space-y-4 relative pl-8 border-l border-white/10 mt-2">
              
              {/* Step 1 Node */}
              <div className="relative">
                <div className={`absolute -left-[41px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all duration-300 ${
                  currentStep.startsWith("round1") || currentStep.startsWith("round2") || currentStep.startsWith("round3") || currentStep === "completed"
                    ? "bg-violet-500 border-violet-400 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                    : "bg-slate-900 border-white/10 text-white/40"
                }`}>
                  1
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${currentStep.includes("edit") && currentStep.startsWith("round1") ? "text-violet-300 font-bold animate-pulse" : "text-white/80"}`}>
                    {isZh ? "1. Action: AI 自動修改代碼" : "1. Action: AI Code Edit"}
                  </h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {isZh ? "CodeEditAgent 注入 Navigation.tsx 補上寬高" : "Inject logo aspect-ratio metrics to prevent layout shifts"}
                  </p>
                </div>
              </div>

              {/* Step 2 Node */}
              <div className="relative">
                <div className={`absolute -left-[41px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all duration-300 ${
                  currentStep === "round1_fail" || currentStep === "round2_fail" || currentStep === "round3_pass" || currentStep === "completed"
                    ? currentStep.startsWith("round3") || currentStep === "completed"
                      ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : "bg-rose-500 border-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]"
                    : "bg-slate-900 border-white/10 text-white/40"
                }`}>
                  2
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${
                    currentStep === "round1_fail" || currentStep === "round2_fail" 
                      ? "text-rose-300 animate-pulse" 
                      : currentStep === "round3_pass" || currentStep === "completed" 
                        ? "text-emerald-300" 
                        : "text-white/80"
                  }`}>
                    {isZh ? "2. Observe: 沙箱環境編譯與 Linter" : "2. Observe: Sandboxed Compilation & ESLint"}
                  </h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {isZh ? "Vite/SWC 編譯與 TypeScript 靜態嚴格語音驗證" : "Linter check and strict Type checking in quarantined zone"}
                  </p>
                </div>
              </div>

              {/* Step 3 Node */}
              <div className="relative">
                <div className={`absolute -left-[41px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all duration-300 ${
                  currentStep === "round2_edit" || currentStep === "round3_edit" || currentStep === "completed"
                    ? "bg-violet-500 border-violet-400 text-white shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                    : "bg-slate-900 border-white/10 text-white/40"
                }`}>
                  3
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${currentStep.includes("edit") && !currentStep.startsWith("round1") ? "text-violet-300 font-bold animate-pulse" : "text-white/80"}`}>
                    {isZh ? "3. Self-Correct: 自動回傳編譯報錯重寫" : "3. Self-Correct: Auto LLM Feedback Loop"}
                  </h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {isZh ? "Ralph 捕捉編譯器 STDERR 回傳上下文，重構代碼" : "Ralph Loop hooks STDERR directly into LLM active context"}
                  </p>
                </div>
              </div>

              {/* Step 4 Node */}
              <div className="relative">
                <div className={`absolute -left-[41px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all duration-300 ${
                  currentStep === "round3_pass" || currentStep === "completed"
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : "bg-slate-900 border-white/10 text-white/40"
                }`}>
                  4
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${currentStep === "round3_pass" ? "text-emerald-300 font-bold animate-pulse" : "text-white/80"}`}>
                    {isZh ? "4. Re-Verify: Playwright 視覺對比" : "4. Re-Verify: Playwright E2E Verification"}
                  </h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {isZh ? "跑 Playwright 重構檢測，確保 CLS 確實降到規範" : "Run visual snapshot comparisons to ensure performance KPIs"}
                  </p>
                </div>
              </div>

              {/* Step 5 Node */}
              <div className="relative">
                <div className={`absolute -left-[41px] top-0.5 h-6 w-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all duration-300 ${
                  currentStep === "completed"
                    ? "bg-emerald-500 border-emerald-400 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    : "bg-slate-900 border-white/10 text-white/40"
                }`}>
                  ✓
                </div>
                <div>
                  <h4 className={`text-xs font-semibold ${currentStep === "completed" ? "text-emerald-300 font-bold" : "text-white/80"}`}>
                    {isZh ? "5. Merge: 安全合併分支提 PR" : "5. Merge: Secure Pull Request Merger"}
                  </h4>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {isZh ? "零垃圾代碼，100% 潔淨正確編譯，PR 自動合入" : "Zero regressions, code builds with 100% safety telemetry"}
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4">
            <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mb-2">
              {isZh ? "Ralph 智慧防雷效益" : "Ralph Safeguard Efficiency"}
            </span>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                <p className="text-xl font-bold font-mono text-violet-300">
                  {currentStep === "completed" ? "2" : isRunning ? "1" : "0"}
                </p>
                <p className="text-[9px] uppercase font-semibold text-white/40 mt-1">{isZh ? "阻隔迴圈次數" : "Loops Intercepted"}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 p-2.5">
                <p className="text-xl font-bold font-mono text-emerald-400">
                  {currentStep === "completed" ? "100%" : isRunning ? "95%" : "0%"}
                </p>
                <p className="text-[9px] uppercase font-semibold text-white/40 mt-1">{isZh ? "編譯通過率" : "Build Success"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tabbed Interactive Environment (Sandbox Editor & Console logs) */}
        <div className="lg:col-span-8 flex flex-col min-h-[350px] rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden relative">
          
          {/* Tab buttons */}
          <div className="flex border-b border-white/5 bg-slate-900/60 text-xs px-2">
            <button
              onClick={() => { setActiveTab("editor"); soundManager.play("dial"); }}
              className={`flex items-center gap-1.5 px-4 py-3 font-semibold border-b-2 transition-all ${
                activeTab === "editor" 
                  ? "border-violet-400 text-violet-300 bg-slate-950/60" 
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              Navigation.tsx {isRunning && (currentStep.endsWith("edit") || currentStep === "completed") && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />}
            </button>
            <button
              onClick={() => { setActiveTab("terminal"); soundManager.play("dial"); }}
              className={`flex items-center gap-1.5 px-4 py-3 font-semibold border-b-2 transition-all ${
                activeTab === "terminal" 
                  ? "border-violet-400 text-violet-300 bg-slate-950/60" 
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              {isZh ? "沙箱終端機 (Compiler Logs)" : "Compiler Sandbox Terminal"}
              {isRunning && currentStep.endsWith("fail") && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />}
            </button>
            <button
              onClick={() => { setActiveTab("tests"); soundManager.play("dial"); }}
              className={`flex items-center gap-1.5 px-4 py-3 font-semibold border-b-2 transition-all ${
                activeTab === "tests" 
                  ? "border-violet-400 text-violet-300 bg-slate-950/60" 
                  : "border-transparent text-white/40 hover:text-white/70"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              {isZh ? "Playwright 自動端對端測試" : "Playwright E2E Tests"}
              {currentStep === "round3_pass" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />}
            </button>
          </div>

          {/* Sandbox content frames */}
          <div className="flex-1 p-4 font-mono text-xs overflow-y-auto max-h-[310px] custom-scrollbar">
            <AnimatePresence mode="wait">
              
              {/* Tab 1: Code editor view */}
              {activeTab === "editor" && (
                <motion.div
                  key="editor_panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1 block leading-relaxed"
                >
                  <pre className="text-white/80 whitespace-pre overflow-x-auto text-[11px] p-2 bg-slate-950/40 rounded-lg">
                    {codeContent}
                  </pre>
                  
                  {/* Subtle code diagnostics flag */}
                  {currentStep === "round1_edit" && (
                    <div className="p-3 bg-violet-950/20 rounded-xl border border-violet-500/10 text-violet-300 flex items-center gap-2 mt-3 animate-pulse">
                      <Cpu className="h-4 w-4 animate-spin" />
                      <span>{isZh ? "CodeEditAgent 正在分析 aspect-ratio 與 CLS 瓶頸..." : "CodeEditAgent optimizing img elements aspect-ratios..."}</span>
                    </div>
                  )}
                  {currentStep === "round1_fail" && (
                    <div className="p-3 bg-rose-950/25 rounded-xl border border-rose-500/20 text-rose-300 flex items-start gap-2 mt-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{isZh ? "語法錯誤已隔離 (Quarantined Syntax Error)" : "Quarantined: Parse error detected"}</p>
                        <p className="text-[11px] text-rose-400 mt-1">{isZh ? "由於忘了閉合大括號，Ralph 拒絕合入此變更，正在寫入報錯日誌重新重構代碼..." : "Missing closing brackets. Swallowing edits, retrofitting log to agent context..."}</p>
                      </div>
                    </div>
                  )}
                  {currentStep === "round2_fail" && (
                    <div className="p-3 bg-amber-950/25 rounded-xl border border-amber-500/20 text-amber-300 flex items-start gap-2 mt-3">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{isZh ? "防禦機警：TS 嚴格語意解析報錯" : "Pristine Alert: TypeScript Implicit any Error"}</p>
                        <p className="text-[11px] text-amber-400 mt-1">{isZh ? "TS7006 - 缺乏型別宣告。正在將 tsc -noEmit 指向錯誤回報回 AI 核心。" : "styleProps has implicit any type. Redirected strict tsc logs to workspace pipeline."}</p>
                      </div>
                    </div>
                  )}
                  {currentStep === "completed" && (
                    <div className="p-3 bg-emerald-950/25 rounded-xl border border-emerald-500/20 text-emerald-300 flex items-center gap-2 mt-3">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{isZh ? "完成！100% 通過品質門票！自動化分支 PR 已安全就緒。" : "Verified: 100% Quality Gate checklist green. Pull request successfully compiled."}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 2: Terminal Console logs */}
              {activeTab === "terminal" && (
                <motion.div
                  key="terminal_panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-1 text-slate-300"
                >
                  <div className="space-y-1.5 h-[230px] overflow-y-auto custom-scrollbar">
                    {logs.length === 0 ? (
                      <div className="text-white/30 italic text-center pt-10">{isZh ? "等待 Ralph 模擬器啟動..." : "Awaiting simulator trigger..."}</div>
                    ) : (
                      logs.map((log, idx) => {
                        let colorClass = "text-white/60";
                        if (log.type === "success") colorClass = "text-emerald-400 font-bold";
                        if (log.type === "error") colorClass = "text-rose-400 font-semibold bg-rose-500/5 px-1.5 rounded border border-rose-500/10";
                        if (log.type === "warning") colorClass = "text-amber-400";
                        if (log.type === "agent") colorClass = "text-violet-300";

                        return (
                          <div key={idx} className="flex gap-2 leading-relaxed font-mono">
                            <span className="text-white/35 shrink-0 select-none">[{log.time}]</span>
                            <span className={colorClass}>{log.message}</span>
                          </div>
                        );
                      })
                    )}
                    <div ref={terminalEndRef} />
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Test runner visualizer */}
              {activeTab === "tests" && (
                <motion.div
                  key="tests_panel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
                    <p className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">{isZh ? "Playwright 視覺對比對應" : "Playwright E2E Image Compare"}</p>
                    <div className="grid grid-cols-2 gap-4">
                      
                      {/* Left State (CLS issue) */}
                      <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-rose-400">{isZh ? "初始狀態 - CLS 嚴重" : "PRE-OPTIMISED (CLS IMPACT)"}</span>
                        <div className="h-10 mt-2 rounded border border-rose-500/10 flex items-center justify-center text-rose-300 font-bold bg-rose-500/5 animate-pulse text-[10px]">
                          CLS: 0.38
                        </div>
                        <p className="text-[10px] text-rose-400/80 mt-1.5 leading-normal">
                          {isZh ? "⚠ 載入慢速網路時，導航欄高度由 0px 急遽震盪拉伸至 60px，下方主畫面被踩扁下移。" : "⚠ Slow image load shifts page nav vertically by 60px, crushing main block content downward."}
                        </p>
                      </div>

                      {/* Right State (CLS fixed) */}
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400">{isZh ? "Ralph 閉環最佳化" : "POST-RALPH FIX (CWV GREEN)"}</span>
                        <div className="h-10 mt-2 rounded border border-emerald-500/10 flex items-center justify-center text-emerald-300 font-bold bg-emerald-500/5 text-[10px]">
                          CLS: 0.00
                        </div>
                        <p className="text-[10px] text-emerald-400/80 mt-1.5 leading-normal">
                          {isZh ? "✅ 圖片提前佔據 [180x60px] 隔離容器，DOM 骨片紋絲不動，首屏滿分！" : "✅ Element initialized asaspect-video wrap, DOM fully static. Zero flickering."}
                        </p>
                      </div>

                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4">
                    <p className="text-xs font-semibold text-white mb-2 uppercase tracking-wider">{isZh ? "單元測試套件日誌 (Jest Runtime)" : "Unit Tests Telemetry (Jest Runtime)"}</p>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-white/60">✓ Navigation renders properly without throwing</span>
                        <span className="text-emerald-400 font-semibold font-mono">PASS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">✓ Handles incoming responsive custom styleProps styles</span>
                        <span className="text-emerald-400 font-semibold font-mono">PASS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/60">✓ Validates correct image sizes and eager load markers</span>
                        <span className="text-emerald-400 font-semibold font-mono">PASS</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Sandbox Footer Info line */}
          <div className="flex items-center justify-between border-t border-white/5 bg-slate-900/40 px-4 py-2 text-[10px] text-white/40">
            <span className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-violet-400" />
              {isZh ? "沙箱代理：CodeEditAgent + Ralph-Checker" : "Isolated Agent Core: CodeEditAgent + Ralph-Checker"}
            </span>
            <span>Memory window: Optimized</span>
          </div>

        </div>

      </div>

    </div>
  );
}
