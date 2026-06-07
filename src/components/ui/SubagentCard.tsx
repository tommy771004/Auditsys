import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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

  const terminalLines = useMemo(
    () =>
      toolCalls.flatMap((toolCall) =>
        toolCall.logs.map((log, index) => ({
          id: `${toolCall.id}-${index}`,
          toolName: t(`auditConsole.tools.${toolCall.name}.label`),
          text: log,
        })),
      ),
    [t, toolCalls],
  );

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
  }, [terminalLines]);

  const statusLabel = t(`auditConsole.subagentStatus.${subagent.status}`);
  const statusToneClassName =
    subagent.status === "done"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : subagent.status === "active"
        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-700"
        : "border-[var(--border)] bg-black/5 text-brand-muted";

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
      className="group relative overflow-hidden rounded-sm border border-[var(--border)] bg-black/10 p-5 backdrop-blur-xl transition-colors hover:bg-black/5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">{t("auditConsole.subagentCard.eyebrow")}</p>
            <div>
              <h3 className="text-lg font-semibold text-[var(--text)] tracking-tight">{subagent.role}</h3>
              <p className="mt-1 text-sm text-brand-muted">{t("auditConsole.subagentCard.toolCount", { count: toolCalls.length })}</p>
            </div>
          </div>
          <span className={["rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]", statusToneClassName].join(" ")}>
            {statusLabel}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--surface)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-faint">{t("auditConsole.subagentCard.executionTimeLabel")}</p>
            <p className="mt-2 text-base font-semibold text-[var(--text)] tracking-tight">{t("auditConsole.subagentCard.executionTime", { value: subagent.executionTimeMs })}</p>
          </div>
          <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:bg-[var(--surface)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-faint">{t("auditConsole.subagentCard.activeToolLabel")}</p>
            <p className="mt-2 text-base font-semibold text-[var(--text)] tracking-tight">{toolCalls[0] ? t(`auditConsole.tools.${toolCalls[0].name}.label`) : t("auditConsole.subagentCard.noTool")}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4 shadow-inner shadow-black/5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-muted">{t("auditConsole.subagentCard.terminalTitle")}</p>
            <div className="flex gap-2">
              {toolCalls.map((toolCall) => (
                <span
                  key={toolCall.id}
                  className={[
                    "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]",
                    toolCall.status === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      : toolCall.status === "failed"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-700",
                  ].join(" ")}
                >
                  {t(`auditConsole.toolStatus.${toolCall.status}`)}
                </span>
              ))}
            </div>
          </div>
          <div ref={terminalRef} className="max-h-56 space-y-2 overflow-y-auto pr-1 font-mono text-[12px] leading-6 text-brand-muted scrollbar-thin scrollbar-track-transparent scrollbar-thumb-black/10">
            {terminalLines.length > 0 ? (
              terminalLines.map((line) => (
                <motion.div initial={{opacity:0, x: -10}} animate={{opacity:1, x:0}} key={line.id} className="rounded-sm border border-[var(--border)] bg-black/5 px-3 py-2 transition-colors hover:bg-black/5">
                  <span className="mr-2 text-cyan-600 font-medium">[{line.toolName}]</span>
                  <span>{line.text}</span>
                </motion.div>
              ))
            ) : (
              <p className="rounded-sm border border-dashed border-[var(--border)] px-3 py-3 text-brand-muted">{t("auditConsole.subagentCard.emptyLogs")}</p>
            )}
          </div>
        </div>

        <div className="space-y-3 rounded-sm border border-[var(--border)] bg-black/5 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-faint">{t("auditConsole.subagentCard.argsTitle")}</p>
          <div className="grid gap-2 text-sm text-brand-muted">
            {toolCalls.flatMap((toolCall) =>
              Object.entries(toolCall.args).map(([key, value]) => (
                <div key={`${toolCall.id}-${key}`} className="flex items-start justify-between gap-4 rounded-sm border border-[var(--border)] px-3 py-2 transition-colors hover:bg-black/5">
                  <span className="text-brand-faint font-mono text-xs">{t(`auditConsole.argKeys.${key}`)}</span>
                  <span className="max-w-[60%] break-all text-right text-[var(--text)] font-mono text-xs">{formatArgumentValue(value)}</span>
                </div>
              )),
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}
