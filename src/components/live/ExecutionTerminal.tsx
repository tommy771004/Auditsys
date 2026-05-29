import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ExecutionStatus, SSELog, SSELogLevel } from "../../types/liveAudit.types";

interface ExecutionTerminalProps {
  logs: SSELog[];
  status: ExecutionStatus;
}

const LEVEL_CLASSNAMES: Record<SSELogLevel, string> = {
  info: "text-slate-300",
  warn: "text-amber-300",
  error: "text-rose-300",
  success: "text-emerald-300",
};

const LEVEL_DOT: Record<SSELogLevel, string> = {
  info: "bg-slate-400",
  warn: "bg-amber-400",
  error: "bg-rose-400",
  success: "bg-emerald-400",
};

// The connection is "live" while the server is expected to be emitting frames.
const ACTIVE_STATUSES: ReadonlySet<ExecutionStatus> = new Set<ExecutionStatus>([
  "connecting",
  "scanning",
  "analyzing",
]);

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Task A — Real-Time SSE Terminal.
 * Renders streamed `SSELog` frames in an auto-scrolling glass terminal and shows
 * a pulsing "awaiting server response" hint when the live connection has been
 * silent for 3 seconds. The timer below only drives that idle hint — it never
 * fabricates log data.
 */
export default function ExecutionTerminal({ logs, status }: ExecutionTerminalProps) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [isAwaiting, setIsAwaiting] = useState<boolean>(false);

  const isActive = ACTIVE_STATUSES.has(status);

  // Auto-scroll to the newest frame.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logs.length]);

  // Idle detector: if the live connection produces no new frame for 3s, hint.
  useEffect(() => {
    if (!isActive) {
      setIsAwaiting(false);
      return;
    }

    setIsAwaiting(false);
    const timeoutId = window.setTimeout(() => {
      setIsAwaiting(true);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isActive, logs.length]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/60 backdrop-blur-md">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-rose-400/80" />
        <span className="h-3 w-3 rounded-full bg-amber-400/80" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
        <div className="ml-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
          <Terminal className="h-4 w-4" />
          {t("liveAudit.terminal.title")}
        </div>
      </div>

      <div className="h-80 overflow-y-auto px-4 py-3 font-mono text-[12.5px] leading-6">
        {logs.length === 0 && !isActive ? (
          <p className="text-slate-500">{t("liveAudit.terminal.idle")}</p>
        ) : null}

        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-start gap-3 py-0.5"
            >
              <span className="shrink-0 select-none text-slate-600">{formatTimestamp(log.timestamp)}</span>
              <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${LEVEL_DOT[log.level]}`} />
              <span className={`whitespace-pre-wrap break-words ${LEVEL_CLASSNAMES[log.level]}`}>{log.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {isAwaiting ? (
          <div className="flex items-center gap-2 py-1 text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="animate-pulse">{t("liveAudit.terminal.awaiting")}</span>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
