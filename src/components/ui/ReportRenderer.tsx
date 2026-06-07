import React, { useState } from "react";
import { LayoutDashboard, Zap, Target, ShieldAlert, Flag, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface ParsedReport {
  executiveSummary?: string;
  deterministicFindings?: { issue: string; impact: string; severity?: string }[];
  browserFlowGaps?: { issue: string; impact: string; severity?: string }[];
  architectureRisks?: { issue: string; impact: string; severity?: string }[];
  nextActions?: { action: string; impact: string }[];
}

const CollapsibleCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  colorClass: string; 
  borderColorClass: string;
  children: React.ReactNode; 
  defaultOpen?: boolean;
}> = ({ title, icon, colorClass, borderColorClass, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-sm border bg-[var(--surface)] shadow-lg shadow-black/20 overflow-hidden transition-colors ${borderColorClass}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-black/5"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--text)]">{title}</h3>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className={`h-5 w-5 ${colorClass}`} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 sm:px-6 sm:pb-6 border-t border-[var(--border)] pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ReportRenderer: React.FC<{ reportText?: string }> = ({ reportText }) => {
  const { t, i18n } = useTranslation();
  
  const isZh = i18n.language === "zh-TW";
  
  if (!reportText) return <p className="text-brand-muted">{isZh ? "尚無報告內容" : "No report content available."}</p>;

  let parsed: ParsedReport;
  try {
    parsed = JSON.parse(reportText);
  } catch {
    return (
      <pre className="mt-5 min-h-[20rem] whitespace-pre-wrap rounded-sm border border-[var(--border)] bg-black/5 p-4 font-mono text-[13px] leading-7 text-[var(--text)]">
        {reportText}
      </pre>
    );
  }

  const SeverityBadge = ({ severity }: { severity?: string }) => {
    if (!severity) return null;
    const s = severity.toLowerCase();
    if (s === "high") return <span className="rounded-md bg-semantic-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-danger border border-semantic-danger/30">{isZh ? "高影響" : "High Impact"}</span>;
    if (s === "medium") return <span className="rounded-md bg-semantic-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-warning border border-semantic-warning/30">{isZh ? "中等" : "Medium"}</span>;
    return <span className="rounded-md bg-semantic-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-success border border-semantic-success/30">{isZh ? "低" : "Low"}</span>;
  };

  return (
    <div className="mt-6 flex flex-col gap-6 w-full">
      {parsed.executiveSummary && (
        <div className="relative overflow-hidden rounded-sm border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 via-slate-900/50 to-slate-950/80 p-5 sm:p-8 shadow-2xl shadow-brand-cyan/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-brand-cyan/20 text-brand-cyan shadow-inner">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-[var(--text)]">{isZh ? "執行摘要" : "Executive Summary"}</h3>
          </div>
          <p className="text-base leading-relaxed text-[var(--text)]">{parsed.executiveSummary}</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {parsed.deterministicFindings && parsed.deterministicFindings.length > 0 && (
          <CollapsibleCard
            title={isZh ? "技術發現" : "Technical Findings"}
            icon={<Zap className="h-5 w-5 text-brand-purple" />}
            colorClass="text-brand-purple"
            borderColorClass="border-brand-purple/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.deterministicFindings.map((item, i) => (
                <div key={i} className="rounded-sm bg-black/5 p-4 border border-[var(--border)] hover:bg-black/10 transition-colors">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-semibold text-[var(--text)] leading-snug">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}

        {parsed.browserFlowGaps && parsed.browserFlowGaps.length > 0 && (
          <CollapsibleCard
            title={isZh ? "流程驗證 (Browser evidence)" : "Flow Verification"}
            icon={<Target className="h-5 w-5 text-semantic-success" />}
            colorClass="text-semantic-success"
            borderColorClass="border-semantic-success/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.browserFlowGaps.map((item, i) => (
                <div key={i} className="rounded-sm bg-black/5 p-4 border border-[var(--border)] hover:bg-black/10 transition-colors">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-semibold text-[var(--text)] leading-snug">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}

        {parsed.architectureRisks && parsed.architectureRisks.length > 0 && (
          <CollapsibleCard
            title={isZh ? "架構風險 (Architecture Lens)" : "Architecture Risks"}
            icon={<ShieldAlert className="h-5 w-5 text-semantic-danger" />}
            colorClass="text-semantic-danger"
            borderColorClass="border-semantic-danger/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.architectureRisks.map((item, i) => (
                <div key={i} className="rounded-sm bg-black/5 p-4 border border-[var(--border)] hover:bg-black/10 transition-colors">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-semibold text-[var(--text)] leading-snug">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs text-brand-muted leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}

        {parsed.nextActions && parsed.nextActions.length > 0 && (
          <CollapsibleCard
            title={isZh ? "後續建議行動 (Action)" : "Strategic Next Steps"}
            icon={<Flag className="h-5 w-5 text-semantic-warning" />}
            colorClass="text-semantic-warning"
            borderColorClass="border-semantic-warning/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.nextActions.map((item, i) => (
                <div key={i} className="flex gap-4 rounded-sm bg-black/5 p-4 border border-semantic-warning/10 hover:bg-black/10 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-semantic-warning/20 text-semantic-warning font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)] leading-snug">{item.action}</p>
                    <p className="mt-1 text-xs text-brand-muted leading-relaxed">{item.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleCard>
        )}
      </div>
    </div>
  );
};
