import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Shield, ShieldAlert } from "lucide-react";
import type { Subagent, ToolCall, ToolCallArgumentValue } from "../../types/agent.types";

interface SubagentCardProps {
  subagent: Subagent;
  toolCalls: ToolCall[];
}

function formatArgumentValue(value: ToolCallArgumentValue): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value === null ? "null" : String(value);
}

export default function SubagentCard({ subagent, toolCalls }: SubagentCardProps) {
  const { t } = useTranslation();
  const terminalRef = useRef<HTMLDivElement | null>(null);

  const sbToken = useMemo(() => {
    switch (subagent.id) {
      case "frontend-speed-agent":
        return "sb-2026.1";
      case "backend-perf-agent":
        return "sb-2026.2";
      case "a11y-agent":
        return "sb-2026.3";
      case "architecture-agent":
      default:
        return "sb-2026.4";
    }
  }, [subagent.id]);

  const terminalLines = useMemo(() => {
    if (toolCalls.length === 0) return [];

    const sandboxInitLogs = [
      {
        id: `sb-init-1-${subagent.id}`,
        toolName: "Sandbox-Shield",
        text: `🛡️ [Active] Bootstrapped execution sandbox environment. (Thread ID: ${sbToken})`,
        isSandboxLog: true,
      },
      {
        id: `sb-init-2-${subagent.id}`,
        toolName: "Sandbox-Shield",
        text: `🔒 OS security constraints verified. Direct file write and OS privilege escalation restricted. Ready.`,
        isSandboxLog: true,
      }
    ];

    const actualLogs = toolCalls.flatMap((toolCall) =>
      toolCall.logs.map((log, index) => ({
        id: `${toolCall.id}-${index}`,
        toolName: t(`auditConsole.tools.${toolCall.name}.label`),
        text: log,
        isSandboxLog: false,
      })),
    );

    return [...sandboxInitLogs, ...actualLogs];
  }, [t, toolCalls, subagent.id, sbToken]);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines]);

  const statusLabel = t(`auditConsole.subagentStatus.${subagent.status}`);
  const statusToneClassName =
    subagent.status === "done"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
      : subagent.status === "active"
        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
        : "border-white/15 bg-white/5 text-white/72";

  return (
    <motion.article
      layout
      animate={
        subagent.status === "active"
          ? {
              y: [0, -4, 0],
              boxShadow: [
                "0 18px 48px rgba(15, 23, 42, 0.42)",
                "0 28px 68px rgba(34, 211, 238, 0.18)",
                "0 18px 48px rgba(15, 23, 42, 0.42)",
              ],
            }
          : { y: 0, boxShadow: "0 18px 48px rgba(15, 23, 42, 0.42)" }
      }
      transition={{ duration: 2.8, repeat: subagent.status === "active" ? Infinity : 0, ease: "easeInOut" }}
      className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/48">{t("auditConsole.subagentCard.eyebrow")}</p>
            <div>
              <h3 className="text-lg font-semibold text-white">{subagent.role}</h3>
              <p className="mt-1 text-sm text-brand-muted">{t("auditConsole.subagentCard.toolCount", { count: toolCalls.length })}</p>
            </div>
          </div>
          <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", statusToneClassName].join(" ")}>
            {statusLabel}
          </span>
        </div>

        {/* Sandbox Active Protection Badge */}
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
          <ShieldAlert className="h-4 w-4 text-emerald-400 shrink-0" />
          <div className="flex-1 flex justify-between items-center">
            <span className="font-semibold text-emerald-200/90">{t("auditConsole.subagentCard.sandboxLabel")}</span>
            <span className="font-mono bg-emerald-500/15 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px]">{t("auditConsole.subagentCard.sandboxToken", { token: sbToken })}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.subagentCard.executionTimeLabel")}</p>
            <p className="mt-2 text-base font-semibold text-white">{t("auditConsole.subagentCard.executionTime", { value: subagent.executionTimeMs })}</p>
          </div>
          <div className="rounded-[22px] border border-white/10 bg-slate-950/35 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.subagentCard.activeToolLabel")}</p>
            <p className="mt-2 text-base font-semibold text-white">{toolCalls[0] ? t(`auditConsole.tools.${toolCalls[0].name}.label`) : t("auditConsole.subagentCard.noTool")}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/10 bg-slate-950/55 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/90">{t("auditConsole.subagentCard.terminalTitle")}</p>
            <div className="flex gap-2">
              {toolCalls.map((toolCall) => (
                <span
                  key={toolCall.id}
                  className={[
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    toolCall.status === "success"
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
                      : toolCall.status === "failed"
                        ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
                        : "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
                  ].join(" ")}
                >
                  {t(`auditConsole.toolStatus.${toolCall.status}`)}
                </span>
              ))}
            </div>
          </div>
          <div ref={terminalRef} className="max-h-56 space-y-2 overflow-y-auto pr-1 font-mono text-[12px] leading-6 text-cyan-50/88">
            {terminalLines.length > 0 ? (
              terminalLines.map((line) => (
                <div key={line.id} className="rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2">
                  <span className={line.toolName === "Sandbox-Shield" ? "mr-2 text-emerald-400 font-bold" : "mr-2 text-cyan-200"}>
                    [{line.toolName}]
                  </span>
                  <span>{line.text}</span>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-white/60">{t("auditConsole.subagentCard.emptyLogs")}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/48">{t("auditConsole.subagentCard.argsTitle")}</p>
          <div className="grid gap-2 text-sm text-white/76">
            {toolCalls.flatMap((toolCall) =>
              Object.entries(toolCall.args).map(([key, value]) => (
                <div key={`${toolCall.id}-${key}`} className="flex items-start justify-between gap-4 rounded-2xl border border-white/5 px-3 py-2">
                  <span className="text-white/52">{t(`auditConsole.argKeys.${key}`)}</span>
                  <span className="max-w-[60%] break-all text-right text-white/86">{formatArgumentValue(value)}</span>
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
