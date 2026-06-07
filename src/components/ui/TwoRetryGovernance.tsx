import { RefreshCcw } from "lucide-react";
import type { AuditHarnessRun } from "../../shared/types/auditPipelineTypes";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

interface TwoRetryGovernanceProps {
  harness?: AuditHarnessRun;
}

export default function TwoRetryGovernance({ harness }: TwoRetryGovernanceProps) {
  const { t } = useTranslation();
  
  if (!harness) return null;

  const retryAttempts = harness.attempts.filter(a => a.strategy === "retry_same_contract");
  const fallbackAttempts = harness.attempts.filter(a => a.strategy === "pivot_after_retries");
  
  const totalRetries = retryAttempts.length;
  // A retry is considered successful if it passed or if we eventually proceeded
  const resolvedRetries = retryAttempts.filter(a => a.status === "passed" || a.status === "manual_review").length;
  
  const correctionRate = totalRetries > 0 ? ((resolvedRetries / totalRetries) * 100).toFixed(0) : "100";
  
  // Also show fallback pivots
  const totalPivots = fallbackAttempts.length;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="group rounded-sm border border-[var(--border)] bg-black/10 p-5 relative overflow-hidden"
    >
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <RefreshCcw className="h-4 w-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
          <h3 className="text-[11px] font-semibold text-brand-muted uppercase tracking-[0.18em]">
            {t("auditConsole.harness.retryWidget.title")}
          </h3>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3 relative z-10">
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex flex-col justify-center items-center h-[90px] transition-colors group-hover:bg-[var(--surface)]">
          <span className="text-3xl font-bold text-[var(--text)] mb-1 drop-shadow-md">{totalRetries}</span>
          <span className="text-[10px] text-brand-faint uppercase tracking-[0.18em] text-center">{t("auditConsole.harness.retryWidget.totalRetries")}</span>
        </div>
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] px-4 py-3 flex flex-col justify-center items-center h-[90px] transition-colors group-hover:bg-[var(--surface)]">
          <span className="text-3xl font-bold text-emerald-400 mb-1 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">{resolvedRetries}</span>
          <span className="text-[10px] text-brand-faint uppercase tracking-[0.18em] text-center">{t("auditConsole.harness.retryWidget.resolved")}</span>
        </div>
        <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex flex-col justify-center items-center h-[90px] relative overflow-hidden shadow-inner shadow-emerald-500/20">
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 to-transparent opacity-60"></div>
          <span className="text-3xl font-bold text-emerald-300 mb-1 relative drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">{correctionRate}%</span>
          <span className="text-[10px] text-emerald-400/80 uppercase tracking-[0.18em] text-center relative drop-shadow-sm">{t("auditConsole.harness.retryWidget.correctionRate")}</span>
        </div>
      </div>
      
      {totalPivots > 0 && (
         <motion.div 
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           className="mt-3 rounded-sm border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/80 font-medium tracking-wide flex justify-center"
         >
           {totalPivots} fallback pivot(s) executed after retry exhaustion.
         </motion.div>
      )}
    </motion.div>
  );
}
