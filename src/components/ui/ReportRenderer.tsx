import React, { useState } from "react";
import { LayoutDashboard, Zap, Target, ShieldAlert, Flag, ChevronDown, Gauge } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";

interface RichFinding {
  // Rich schema (new):
  severity?: string;
  finding?: string;
  rootCause?: string;
  businessImpact?: string;
  actionableFix?: string;
  // Legacy schema (old stored audits):
  issue?: string;
  impact?: string;
}

interface ParsedReport {
  executiveSummary?: string;
  performanceFindings?: RichFinding[];
  deterministicFindings?: RichFinding[];
  browserFlowGaps?: RichFinding[];
  architectureRisks?: RichFinding[];
  nextActions?: { action: string; impact?: string; actionableFix?: string }[];
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
    <div className={`rounded-[28px] border bg-slate-950/40 shadow-lg shadow-black/20 overflow-hidden transition-colors ${borderColorClass}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">{title}</h3>
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
            <div className="px-5 pb-5 sm:px-6 sm:pb-6 border-t border-white/5 pt-4">
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
  
  if (!reportText) return <p className="text-white/60">{isZh ? "尚無報告內容" : "No report content available."}</p>;

  let parsed: ParsedReport;
  try {
    parsed = JSON.parse(reportText);
  } catch {
    return (
      <pre className="mt-5 min-h-[20rem] whitespace-pre-wrap rounded-[24px] border border-white/10 bg-white/[0.03] p-4 font-mono text-[13px] leading-7 text-white/86">
        {reportText}
      </pre>
    );
  }

  const SeverityBadge = ({ severity }: { severity?: string }) => {
    if (!severity) return null;
    const s = severity.toLowerCase();
    if (s === "critical" || s === "high") return <span className="rounded-md bg-semantic-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-danger border border-semantic-danger/30">{isZh ? "嚴重" : "Critical"}</span>;
    if (s === "warning" || s === "medium") return <span className="rounded-md bg-semantic-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-warning border border-semantic-warning/30">{isZh ? "警告" : "Warning"}</span>;
    return <span className="rounded-md bg-semantic-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-success border border-semantic-success/30">{isZh ? "資訊" : "Info"}</span>;
  };

  const FindingCard = ({ item }: { item: RichFinding }) => {
    const title = item.finding ?? item.issue ?? "";
    const impact = item.businessImpact ?? item.impact ?? "";
    return (
      <div className="rounded-2xl bg-white/[0.02] p-4 border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
        <div className="flex justify-between items-start mb-2 gap-2">
          <p className="text-sm font-semibold text-white leading-snug">{title}</p>
          <SeverityBadge severity={item.severity} />
        </div>
        {item.rootCause && (
          <p className="text-xs text-white/50 leading-relaxed mb-1">
            <span className="font-semibold text-white/70">{isZh ? "根因：" : "Root cause: "}</span>{item.rootCause}
          </p>
        )}
        {impact && <p className="text-xs text-white/60 leading-relaxed">{impact}</p>}
        {item.actionableFix && (
          <p className="mt-2 text-xs text-brand-cyan/80 leading-relaxed">
            <span className="font-semibold">{isZh ? "建議解法：" : "Fix: "}</span>{item.actionableFix}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6 flex flex-col gap-6 w-full">
      {parsed.executiveSummary && (
        <div className="relative overflow-hidden rounded-[32px] border border-brand-cyan/30 bg-gradient-to-br from-brand-cyan/10 via-slate-900/50 to-slate-950/80 p-5 sm:p-8 shadow-2xl shadow-brand-cyan/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cyan/20 text-brand-cyan shadow-inner">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">{isZh ? "執行摘要" : "Executive Summary"}</h3>
          </div>
          <p className="text-base leading-relaxed text-white/90">{parsed.executiveSummary}</p>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {parsed.performanceFindings && parsed.performanceFindings.length > 0 && (
          <CollapsibleCard
            title={isZh ? "效能與核心網頁指標" : "Performance & Core Web Vitals"}
            icon={<Gauge className="h-5 w-5 text-brand-cyan" />}
            colorClass="text-brand-cyan"
            borderColorClass="border-brand-cyan/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.performanceFindings.map((item, i) => <FindingCard key={i} item={item} />)}
            </div>
          </CollapsibleCard>
        )}

        {parsed.deterministicFindings && parsed.deterministicFindings.length > 0 && (
          <CollapsibleCard
            title={isZh ? "技術發現" : "Technical Findings"}
            icon={<Zap className="h-5 w-5 text-brand-purple" />}
            colorClass="text-brand-purple"
            borderColorClass="border-brand-purple/20"
            defaultOpen={true}
          >
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.deterministicFindings.map((item, i) => <FindingCard key={i} item={item} />)}
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
              {parsed.browserFlowGaps.map((item, i) => <FindingCard key={i} item={item} />)}
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
              {parsed.architectureRisks.map((item, i) => <FindingCard key={i} item={item} />)}
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
                <div key={i} className="flex gap-4 rounded-2xl bg-white/[0.02] p-4 border border-semantic-warning/10 hover:bg-white/[0.04] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-semantic-warning/20 text-semantic-warning font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug">{item.action}</p>
                    {item.impact && <p className="mt-1 text-xs text-white/60 leading-relaxed">{item.impact}</p>}
                    {item.actionableFix && item.actionableFix !== item.action && (
                      <p className="mt-1 text-xs text-brand-cyan/80 leading-relaxed">{item.actionableFix}</p>
                    )}
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
