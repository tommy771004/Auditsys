import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { MemoryUpdate } from "../../types/agent.types";

interface MemorySyncBadgeProps {
  update: MemoryUpdate | null;
}

export default function MemorySyncBadge({ update }: MemorySyncBadgeProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {update ? (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.98 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="fixed right-4 top-24 z-50 sm:right-8"
        >
          <div className="relative overflow-hidden rounded-full border border-emerald-400/25 bg-slate-950/75 px-4 py-3 shadow-[0_0_36px_rgba(16,185,129,0.22)] backdrop-blur-xl">
            <motion.span
              aria-hidden="true"
              className="absolute right-4 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-emerald-300"
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="pr-7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-100/88">{t("auditConsole.memoryBadge.saved")}</p>
              <p className="mt-1 max-w-[18rem] text-sm text-white/90">{update.fact}</p>
              <p className="mt-1 text-xs text-white/55">{t("auditConsole.memoryBadge.type", { value: t(`auditConsole.memoryType.${update.type}`) })}</p>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
