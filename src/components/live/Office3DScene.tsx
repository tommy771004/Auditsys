import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Cpu, Laptop, Users, CheckCircle2, AlertCircle, Terminal, Coffee, Sparkles, Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Subagent, ToolCall } from "../../types/agent.types";

interface Office3DSceneProps {
  subagents: Subagent[];
  toolCalls: ToolCall[];
  isZh: boolean;
}

interface Employee {
  id: string;
  name: string;
  englishName: string;
  avatarColor: string;
  accentColor: string;
  deskPosition: { top: string; left: string; xOffset: number; yOffset: number };
  roleKey: string;
  roleZh: string;
  avatarSvg: (status: "pending" | "active" | "done") => React.ReactNode;
}

export default function Office3DScene({ subagents, toolCalls, isZh }: Office3DSceneProps) {
  const { t } = useTranslation();

  // Map our subagents to employee metadata
  const employees: Employee[] = [
    {
      id: "frontend-speed",
      name: "艾莉絲 Alice",
      englishName: "Alice (Frontend)",
      avatarColor: "#06b6d4", // Cyan
      accentColor: "border-cyan-500",
      deskPosition: { top: "35%", left: "20%", xOffset: -120, yOffset: -60 },
      roleZh: "前端架構分析師 (Frontend Speed Analyst)",
      roleKey: "auditConsole.mock.subagents.frontend.role",
      avatarSvg: (status) => (
        <svg viewBox="0 0 100 100" className="w-16 h-16">
          {/* Hair back */}
          <path d="M25,50 Q15,25 35,15 Q50,5 65,15 Q85,25 75,50 Z" fill="#da5552" />
          {/* Head & Neck */}
          <rect x="42" y="45" width="16" height="15" rx="4" fill="#fcd34d" />
          <circle cx="50" cy="35" r="20" fill="#fddf7a" />
          {/* Hair front/bangs */}
          <path d="M28,25 Q45,15 55,25 T72,25 Q50,0 28,25 Z" fill="#b91c1c" />
          <path d="M30,30 L38,18 H62 L70,30" fill="#b91c1c" stroke="#1c1917" strokeWidth="2" />
          {/* Glasses */}
          <rect x="35" y="32" width="12" height="8" rx="2" fill="none" stroke="#1e293b" strokeWidth="3" />
          <rect x="53" y="32" width="12" height="8" rx="2" fill="none" stroke="#1e293b" strokeWidth="3" />
          <line x1="47" y1="36" x2="53" y2="36" stroke="#1e293b" strokeWidth="3" />
          {/* Eyes behind glasses */}
          <circle cx="41" cy="36" r="2.5" fill="#1e293b" />
          <circle cx="59" cy="36" r="2.5" fill="#1e293b" />
          {/* Mouth */}
          {status === "active" ? (
            <path d="M46,45 Q50,49 54,45" fill="none" stroke="#1e293b" strokeWidth="2" />
          ) : status === "done" ? (
            <path d="M44,43 Q50,49 56,43" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          ) : (
            <line x1="45" y1="44" x2="55" y2="44" stroke="#1e293b" strokeWidth="2" />
          )}
          {/* Body */}
          <path d="M30,60 L70,60 L64,85 H36 Z" fill="#0891b2" stroke="#1e293b" strokeWidth="2.5" />
          <path d="M44,60 L50,68 L56,60" fill="#fddf7a" stroke="#1e293b" strokeWidth="1.5" />
          {/* Working / Typing Hands */}
          {status === "active" && (
            <g className="animate-bounce">
              <circle cx="40" cy="74" r="5" fill="#fddf7a" stroke="#1e293b" strokeWidth="2" />
              <circle cx="60" cy="74" r="5" fill="#fddf7a" stroke="#1e293b" strokeWidth="2" />
              {/* Keyboard keys flying sparks */}
              <circle cx="44" cy="68" r="1.5" fill="#22d3ee" className="animate-ping" />
              <circle cx="56" cy="68" r="1.5" fill="#22d3ee" className="animate-ping" />
            </g>
          )}
          {status === "done" && (
            <g>
              {/* Thumbs up hand */}
              <path d="M68,54 Q74,48 76,56 T72,66 Z" fill="#fddf7a" stroke="#1e293b" strokeWidth="2" />
              <line x1="72" y1="56" x2="74" y2="52" stroke="#1e293b" strokeWidth="2" />
            </g>
          )}
        </svg>
      ),
    },
    {
      id: "api-latency",
      name: "鮑伯 Bob",
      englishName: "Bob (Latency)",
      avatarColor: "#8b5cf6", // Purple
      accentColor: "border-purple-500",
      deskPosition: { top: "35%", left: "70%", xOffset: 120, yOffset: -60 },
      roleZh: "API 效能檢測官 (Backend Latency Lead)",
      roleKey: "auditConsole.mock.subagents.backend.role",
      avatarSvg: (status) => (
        <svg viewBox="0 0 100 100" className="w-16 h-16">
          {/* Hair back */}
          <path d="M28,45 Q20,20 50,15 Q80,20 72,45 Z" fill="#eb5e28" />
          {/* Head & Neck */}
          <rect x="42" y="45" width="16" height="15" rx="4" fill="#fddf7a" />
          <circle cx="50" cy="35" r="20" fill="#fedc56" />
          {/* Hair cap */}
          <path d="M50,15 L74,24 V34 L50,22 L26,34 V24 Z" fill="#1e1b4b" stroke="#1c1917" strokeWidth="2" />
          {/* Eyes */}
          <circle cx="42" cy="36" r="3" fill="#1e293b" />
          <circle cx="58" cy="36" r="3" fill="#1e293b" />
          {/* Smile/Focus */}
          {status === "active" ? (
            <ellipse cx="50" cy="45" rx="5" ry="3" fill="#1e293b" />
          ) : status === "done" ? (
            <path d="M42,42 Q50,49 58,42" fill="none" stroke="#1e293b" strokeWidth="2.5" />
          ) : (
            <line x1="45" y1="44" x2="55" y2="44" stroke="#1e293b" strokeWidth="2" />
          )}
          {/* Headset bar & mic */}
          <path d="M26,35 Q50,15 74,35" fill="none" stroke="#6366f1" strokeWidth="3.5" />
          <rect x="23" y="32" width="5" height="10" rx="1.5" fill="#1e1b4b" />
          <rect x="72" y="32" width="5" height="10" rx="1.5" fill="#1e1b4b" />
          <path d="M72,40 Q62,48 57,47" fill="none" stroke="#1e1b4b" strokeWidth="2" />
          {/* Body */}
          <path d="M30,60 L70,60 L62,85 H38 Z" fill="#5b21b6" stroke="#1e293b" strokeWidth="2.5" />
          <rect x="45" y="60" width="10" height="25" fill="#f8fafc" />
          {/* Typing Hands */}
          {status === "active" && (
            <g className="animate-pulse">
              <circle cx="42" cy="72" r="5" fill="#fedc56" stroke="#1e293b" strokeWidth="2" />
              <circle cx="58" cy="72" r="5" fill="#fedc56" stroke="#1e293b" strokeWidth="2" />
              <path d="M40,68 H44 L41,64 Z" fill="#c084fc" />
              <path d="M56,68 H60 L57,64 Z" fill="#c084fc" />
            </g>
          )}
        </svg>
      ),
    },
    {
      id: "a11y-scanner",
      name: "查理 Charlie",
      englishName: "Charlie (A11y)",
      avatarColor: "#10b981", // Emerald
      accentColor: "border-emerald-500",
      deskPosition: { top: "65%", left: "20%", xOffset: -120, yOffset: 60 },
      roleZh: "親和力及無障礙專家 (Accessibility Lead)",
      roleKey: "auditConsole.mock.subagents.a11y.role",
      avatarSvg: (status) => (
        <svg viewBox="0 0 100 100" className="w-16 h-16">
          {/* Beard background */}
          <path d="M26,38 Q50,60 74,38 V48 Q50,75 26,48 Z" fill="#78350f" />
          {/* Head */}
          <rect x="42" y="45" width="16" height="15" rx="4" fill="#fbcfe8" />
          <circle cx="50" cy="35" r="20" fill="#fbcfe8" />
          {/* Hair top / Pompadour */}
          <path d="M28,24 Q50,-4 72,24 Q50,-3 28,24 Z" fill="#2d1500" stroke="#1e293b" strokeWidth="2" />
          {/* Eyes (Magnified glasses look) */}
          <circle cx="41" cy="34" r="5" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <circle cx="59" cy="34" r="5" fill="none" stroke="#10b981" strokeWidth="2.5" />
          <line x1="46" y1="34" x2="54" y2="34" stroke="#1e293b" strokeWidth="2" />
          <circle cx="41" cy="34" r="2.5" fill="#1e293b" />
          <circle cx="59" cy="34" r="2.5" fill="#1e293b" />
          {/* Big mustache */}
          <path d="M35,42 Q50,48 65,42 Q50,38 35,42" fill="#451a03" stroke="#1e293b" strokeWidth="2" />
          {/* Body */}
          <path d="M30,60 L70,60 L63,85 H37 Z" fill="#047857" stroke="#1e293b" strokeWidth="2.5" />
          {/* Working Tools */}
          {status === "active" && (
            <g className="animate-bounce">
              <line x1="32" y1="75" x2="38" y2="67" stroke="#1e293b" strokeWidth="3" />
              <circle cx="30" cy="77" r="6" fill="#fbbf24" stroke="#1e293b" strokeWidth="2" />
              <circle cx="30" cy="77" r="3" fill="#ffffff" />
            </g>
          )}
        </svg>
      ),
    },
    {
      id: "memory-synth",
      name: "戴夫 Dave",
      englishName: "Dave (Synthesis)",
      avatarColor: "#eab308", // Yellow / Gold
      accentColor: "border-yellow-500",
      deskPosition: { top: "65%", left: "70%", xOffset: 120, yOffset: 60 },
      roleZh: "長期架構記憶合成官 (Memory Navigator)",
      roleKey: "auditConsole.mock.subagents.architecture.role",
      avatarSvg: (status) => (
        <svg viewBox="0 0 100 100" className="w-16 h-16">
          {/* Hair back */}
          <path d="M30,45 Q40,10 50,10 Q60,10 70,45" fill="#475569" stroke="#1e293b" strokeWidth="2" />
          {/* Head & Neck */}
          <rect x="42" y="45" width="16" height="15" rx="4" fill="#fcdec0" />
          <circle cx="50" cy="35" r="20" fill="#fcdec0" />
          {/* Forehead hair */}
          <path d="M29,26 Q50,18 71,26 L65,15 H35 Z" fill="#1e293b" />
          {/* Tech Vizor */}
          <polygon points="32,28 68,28 64,38 36,38" fill="#eab308" stroke="#1e293b" strokeWidth="2" />
          <line x1="36" y1="33" x2="64" y2="33" stroke="#ffffff" strokeWidth="25" strokeLinecap="round" className="animate-pulse" />
          {/* Mouth */}
          <ellipse cx="50" cy="46" rx="4" ry="1.5" fill="#7f1d1d" />
          {/* Body */}
          <path d="M30,60 L70,60 L64,85 H36 Z" fill="#b45309" stroke="#1e293b" strokeWidth="2.5" />
          <path d="M42,60 L50,70 L58,60" fill="#f59e0b" />
          {/* Synthesis action */}
          {status === "active" && (
            <g className="animate-spin duration-1000">
              <path d="M15,50 A5,5 0 0 1 25,50" stroke="#f59e0b" strokeWidth="2" fill="none" />
            </g>
          )}
        </svg>
      ),
    },
  ];

  // Helper to extract last log or arguments corresponding to subagent
  const getSubagentInfo = (id: string) => {
    const matchedSubagent = subagents.find((s) => s.id === id);
    const matchedToolCall = toolCalls.find((t) => t.agentId === id);

    const status = matchedSubagent?.status ?? "pending";
    const lastLog = matchedToolCall?.logs && matchedToolCall.logs.length > 0
      ? matchedToolCall.logs[matchedToolCall.logs.length - 1]
      : null;

    return {
      status,
      executionTime: matchedSubagent?.executionTimeMs ?? 0,
      toolName: matchedToolCall?.name ?? "idle",
      lastLog,
    };
  };

  // Status mapping
  const isActiveAny = subagents.some((s) => s.status === "active");

  return (
    <div id="office-3d-scene-container" className="relative w-full overflow-hidden bg-zinc-50 border border-black rounded-sm p-4 md:p-8 shadow-inner shadow-black/10">
      {/* 3D Scene Title and Eyebrow */}
      <div className="flex items-center justify-between gap-4 border-b border-black/15 pb-4 mb-6">
        <div className="flex gap-2.5 items-center">
          <div className="bg-black text-white p-2 rounded-sm border border-black flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-black tracking-tight flex items-center gap-2">
              <span>{isZh ? "3D 擬人化上帝視角指揮島" : "3D Isometric Swarm Swarm Floor"}</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-black/5 border border-black/5 animate-pulse text-neutral-500">Live View</span>
            </h4>
            <p className="text-xs text-brand-muted mt-0.5">
              {isZh ? "專屬分析官各司其職，即時投影其正在呼叫的分析工具、資料庫寫入脈絡與協作流動。" : "Specialized analysts handle modular jobs, reflecting active tool calls and data stream packets live."}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex gap-4 text-[10px] font-mono uppercase font-semibold text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 border border-black/5" />
            <span>Pending / 待載入</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-black/5 animate-ping" />
            <span className="text-cyan-600">Active / 協作中</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black/5" />
            <span className="text-emerald-700">Done / 已交付</span>
          </div>
        </div>
      </div>

      {/* Main 3D Floor Canvas Container */}
      <div className="relative w-full h-[520px] bg-zinc-100 border border-black rounded-sm overflow-hidden flex items-center justify-center">
        
        {/* Relume Grid Background for Isometric depth */}
        <div 
          className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:32px_32px] opacity-100"
          style={{
            transform: "rotateX(60deg) rotateZ(-45deg) scale(1.8)",
            transformStyle: "preserve-3d",
          }}
        />

        {/* Isometric Ambient Shadow Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.05)_100%)] pointer-events-none" />

        {/* Connection Fiber Pipes linking Desks to the Server Rack */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <defs>
            <linearGradient id="cyan-pipe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="purple-pipe" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Draw connecting pipes between four coordinates and the center (50%, 50%) */}
          {/* Station 1: Cyan (Top-Left Desk to Center) */}
          <path d="M 250, 180 Q 300, 220 500, 240" fill="none" stroke="#e4e4e7" strokeWidth="5" strokeLinecap="round" />
          <path d="M 250, 180 Q 300, 220 500, 240" fill="none" stroke="url(#cyan-pipe)" strokeWidth="3" strokeLinecap="round" />
          {getSubagentInfo("frontend-speed").status === "active" && (
            <circle r="4" fill="#06b6d4">
              <animateMotion dur="2s" repeatCount="indefinite" path="M 250, 180 Q 300, 220 500, 240" />
            </circle>
          )}

          {/* Station 2: Purple (Top-Right Desk to Center) */}
          <path d="M 750, 180 Q 700, 220 500, 240" fill="none" stroke="#e4e4e7" strokeWidth="5" strokeLinecap="round" />
          <path d="M 750, 180 Q 700, 220 500, 240" fill="none" stroke="url(#purple-pipe)" strokeWidth="3" strokeLinecap="round" />
          {getSubagentInfo("api-latency").status === "active" && (
            <circle r="4" fill="#8b5cf6">
              <animateMotion dur="1.8s" repeatCount="indefinite" path="M 750, 180 Q 700, 220 500, 240" />
            </circle>
          )}

          {/* Station 3: Emerald (Bottom-Left Desk to Center) */}
          <path d="M 250, 380 Q 300, 310 500, 280" fill="none" stroke="#e4e4e7" strokeWidth="5" strokeLinecap="round" />
          <path d="M 250, 380 Q 300, 310 500, 280" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
          {getSubagentInfo("a11y-scanner").status === "active" && (
            <circle r="4" fill="#10b981">
              <animateMotion dur="2.1s" repeatCount="indefinite" path="M 250, 380 Q 300, 310 500, 280" />
            </circle>
          )}

          {/* Station 4: Yellow (Bottom-Right Desk to Center) */}
          <path d="M 750, 380 Q 700, 311 500, 280" fill="none" stroke="#e4e4e7" strokeWidth="5" strokeLinecap="round" />
          <path d="M 750, 380 Q 700, 311 500, 280" fill="none" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
          {getSubagentInfo("memory-synth").status === "active" && (
            <circle r="4" fill="#eab308">
              <animateMotion dur="1.6s" repeatCount="indefinite" path="M 750, 380 Q 700, 311 500, 280" />
            </circle>
          )}
        </svg>

        {/* 3D CORE SYSTEM CABINET (The centralized mainframe at 50%, 50%) */}
        <div 
          className="absolute z-20"
          style={{ top: "45%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          {/* Mainframe structure */}
          <motion.div 
            animate={isActiveAny ? { y: [0, -3, 0] } : {}}
            transition={{ type: "spring", repeat: Infinity, duration: 2 }}
            className="w-24 h-36 bg-black border border-black rounded-sm shadow-[8px_8px_0px_rgba(0,0,0,0.3)] flex flex-col items-center justify-between p-2.5 relative"
          >
            {/* Hologram top antenna glow */}
            <div className="absolute -top-10 flex flex-col items-center">
              <span className={`w-3 h-3 rounded-full border border-black ${isActiveAny ? "bg-cyan-400 animate-ping" : "bg-zinc-400"}`} />
              <div className="w-0.5 h-10 bg-black" />
            </div>

            {/* Glowing screen showing analyzed Project Mainframe info */}
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-1.5 flex flex-col gap-1 items-center justify-center font-mono">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse self-start absolute top-4 left-3" />
              <p className="text-[7px] text-zinc-500 font-bold uppercase leading-none mt-2">DURABLE HUB</p>
              <div className="w-full h-px bg-zinc-800 my-0.5" />
              <div className="w-full bg-black/60 p-1 flex items-center justify-center rounded-sm">
                <Database className="w-3.5 h-3.5 text-zinc-400" />
              </div>
            </div>

            {/* Pulsing server lights */}
            <div className="w-full grid grid-cols-4 gap-1.5 py-1">
              {[...Array(12)].map((_, i) => (
                <span 
                  key={i} 
                  className={`h-1 rounded-full border border-black/20 ${
                    isActiveAny 
                      ? i % 3 === 0 
                        ? "bg-cyan-400 animate-pulse" 
                        : i % 2 === 0 
                          ? "bg-purple-500" 
                          : "bg-emerald-400"
                      : "bg-zinc-700"
                  }`} 
                />
              ))}
            </div>

            {/* Base Plate */}
            <div className="absolute -bottom-2 bg-zinc-800 border-t border-black w-20 h-2 px-1 text-[6px] text-zinc-300 font-mono flex items-center justify-between">
              <span>SVR.4</span><span>PROJ88</span>
            </div>
          </motion.div>
        </div>

        {/* ENTIRE TEAM AT WORK WORKSTATIONS (DESKS) */}
        {employees.map((member) => {
          const info = getSubagentInfo(member.id);

          return (
            <div 
              key={member.id}
              className="absolute z-20 transition-all duration-300"
              style={{
                top: member.deskPosition.top,
                left: member.deskPosition.left,
                transform: "translate(-50%, -50%)",
              }}
            >
              {/* Individual station floor plate */}
              <div className="relative flex flex-col items-center">
                
                {/* Desk Base & Interactive Glow Spot */}
                <div 
                  className={`w-32 h-20 rounded-full border border-black/10 transition-colors duration-300 ${
                    info.status === "active" 
                      ? "bg-cyan-500/10 shadow-[0_0_24px_rgba(34,211,238,0.22)]" 
                      : info.status === "done" 
                        ? "bg-emerald-500/10" 
                        : "bg-zinc-200/50"
                  }`}
                  style={{ transform: "rotateX(60deg) scaleY(0.7)", borderStyle: "dashed" }}
                />

                {/* Overhead Speech Bubble Dialog */}
                <AnimatePresence>
                  {info.status === "active" && info.lastLog && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute -top-32 w-52 bg-black border border-black text-white p-2.5 rounded-sm shadow-[4px_4px_0px_rgba(0,0,0,1)] z-30 font-mono text-[10px] leading-relaxed"
                    >
                      {/* Triangle pointer */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border-r border-b border-black transform rotate-45" />
                      <div className="flex items-center gap-1 text-cyan-300 font-bold mb-1 border-b border-white/10 pb-0.5">
                        <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>RUN: {info.toolName}()</span>
                      </div>
                      <p className="line-clamp-3 text-neutral-300 font-normal">{info.lastLog}</p>
                    </motion.div>
                  )}
                  
                  {info.status === "done" && (
                    <motion.div 
                      key="done-bubble"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-16 bg-white border-2 border-emerald-500 text-black px-2.5 py-1 rounded-full shadow-md z-30 font-bold text-[10px] flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{isZh ? "交付稽核報告 / Complete" : "Audit Log Saved / Done"}</span>
                    </motion.div>
                  )}

                  {info.status === "pending" && (
                    <div className="absolute -top-16 bg-zinc-200/90 border border-black/15 text-neutral-500 px-2.5 py-1 rounded-sm text-[10px] flex items-center gap-1 shadow-sm">
                      <Coffee className="w-3 h-3 text-zinc-400" />
                      <span>{isZh ? "閒置待命中" : "Awaiting sync..."}</span>
                    </div>
                  )}
                </AnimatePresence>

                {/* Physical workstation block containing Desk furniture & Avatar */}
                <div className="absolute -top-8 flex flex-col items-center group cursor-help">

                  {/* Tooltip on Hover */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-40 bg-black text-white px-3 py-1.5 rounded-sm shadow-xl border border-white/20 text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>
                        {info.status === "active" 
                          ? (t(`auditConsole.tools.${info.toolName}.label`, { defaultValue: "" }) || `${isZh ? "即將執行" : "Running"}: ${info.toolName}`) 
                          : info.status === "done" 
                            ? (isZh ? "分析完畢，報告已建檔" : "Analysis complete, report filed") 
                            : (isZh ? "待命中..." : "Standing by...")}
                      </span>
                    </div>
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-black" />
                  </div>
                  
                  {/* The Human Employee Sitting at Desk */}
                  <motion.div 
                    animate={
                      info.status === "active" 
                        ? { y: [0, -4, 0], rotate: [0, -1, 1, 0] } 
                        : { y: 0, rotate: 0 }
                    }
                    transition={{
                      repeat: Infinity,
                      duration: 0.6,
                      ease: "easeInOut"
                    }}
                    className="relative z-20 pointer-events-none"
                    style={{ transform: "scale(1.15)" }}
                  >
                    {member.avatarSvg(info.status)}
                  </motion.div>

                  {/* Desk / Office workstation table structure */}
                  <div className="w-20 h-10 bg-white border border-black rounded-sm shadow-md mt-[-8px] relative flex justify-around items-center px-1">
                    {/* Glowing computer monitor details */}
                    <div className="relative">
                      <div className={`w-8 h-6 rounded-sm border border-black transform -skew-y-3 flex items-center justify-center ${
                        info.status === "active" 
                          ? "bg-neutral-900 border-cyan-400" 
                          : info.status === "done" 
                            ? "bg-emerald-950 border-emerald-400" 
                            : "bg-zinc-200"
                      }`}>
                        {info.status === "active" ? (
                          <span className="w-5 h-2 bg-cyan-400/30 rounded-full animate-pulse" />
                        ) : info.status === "done" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 animate-bounce" />
                        ) : null}
                      </div>
                      <div className="w-1.5 h-3 bg-black mx-auto mt-[-1px]" />
                      <div className="w-5 h-1 bg-neutral-600 rounded-full mx-auto" />
                    </div>

                    {/* Desk accessory / Coffee Cup / Plant details */}
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-3.5 bg-neutral-900 border border-black rounded-sm flex flex-col justify-between items-center py-0.5">
                        <div className="w-1.5 h-px bg-rose-500 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-cyan-400 rounded-full" />
                      </div>
                      {/* Thermal Steam vapor for a warm coffee cup */}
                      <span className="w-1 h-1 rounded-full bg-zinc-300 animate-ping mt-1" />
                    </div>
                  </div>

                  {/* Character Name Flag Accent */}
                  <div className="mt-2 text-center select-none bg-black text-white rounded-sm px-2 py-0.5 border border-black font-semibold font-mono text-[10px]">
                    {isZh ? member.name : member.englishName}
                  </div>
                </div>

              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
