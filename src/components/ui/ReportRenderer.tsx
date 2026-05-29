import React from "react";
import { LayoutDashboard, Zap, Target, ShieldAlert, Flag } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ParsedReport {
  executiveSummary?: string;
  deterministicFindings?: { issue: string; impact: string; severity?: string }[];
  browserFlowGaps?: { issue: string; impact: string; severity?: string }[];
  architectureRisks?: { issue: string; impact: string; severity?: string }[];
  nextActions?: { action: string; impact: string }[];
}

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
    if (s === "high") return <span className="rounded-md bg-semantic-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-danger border border-semantic-danger/30">{isZh ? "高影響" : "High Impact"}</span>;
    if (s === "medium") return <span className="rounded-md bg-semantic-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-warning border border-semantic-warning/30">{isZh ? "中等" : "Medium"}</span>;
    return <span className="rounded-md bg-semantic-success/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-semantic-success border border-semantic-success/30">{isZh ? "低" : "Low"}</span>;
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

      <div className="grid gap-6 md:grid-cols-2">
        {parsed.deterministicFindings && parsed.deterministicFindings.length > 0 && (
          <div className={`rounded-[28px] border border-brand-purple/20 bg-slate-950/40 p-5 sm:p-6 shadow-lg shadow-black/20 ${!(parsed.browserFlowGaps && parsed.browserFlowGaps.length > 0) ? "md:col-span-2" : ""}`}>
            <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
              <Zap className="h-5 w-5 text-brand-purple" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">{isZh ? "技術發現" : "Technical Findings"}</h3>
            </div>
            <div className={!(parsed.browserFlowGaps && parsed.browserFlowGaps.length > 0) ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
              {parsed.deterministicFindings.map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.02] p-4 border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-semibold text-white leading-snug">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.browserFlowGaps && parsed.browserFlowGaps.length > 0 && (
          <div className={`rounded-[28px] border border-semantic-success/20 bg-slate-950/40 p-5 sm:p-6 shadow-lg shadow-black/20 ${!(parsed.deterministicFindings && parsed.deterministicFindings.length > 0) ? "md:col-span-2" : ""}`}>
            <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
              <Target className="h-5 w-5 text-semantic-success" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">{isZh ? "流程驗證" : "Flow Verification"}</h3>
            </div>
            <div className={!(parsed.deterministicFindings && parsed.deterministicFindings.length > 0) ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
              {parsed.browserFlowGaps.map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.02] p-4 border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-semibold text-white leading-snug">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.architectureRisks && parsed.architectureRisks.length > 0 && (
          <div className="rounded-[28px] border border-semantic-danger/20 bg-slate-950/40 p-5 sm:p-6 shadow-lg shadow-black/20 md:col-span-2">
            <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
              <ShieldAlert className="h-5 w-5 text-semantic-danger" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">{isZh ? "架構風險" : "Architecture Risks"}</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.architectureRisks.map((item, i) => (
                <div key={i} className="rounded-2xl bg-white/[0.02] p-4 border border-white/[0.05] hover:bg-white/[0.04] transition-colors">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <p className="text-sm font-semibold text-white leading-snug">{item.issue}</p>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-xs text-white/60 leading-relaxed">{item.impact}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {parsed.nextActions && parsed.nextActions.length > 0 && (
          <div className="rounded-[28px] border border-semantic-warning/20 bg-slate-950/40 p-5 sm:p-6 shadow-lg shadow-black/20 md:col-span-2">
            <div className="flex items-center gap-3 mb-5 border-b border-white/5 pb-4">
              <Flag className="h-5 w-5 text-semantic-warning" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/90">{isZh ? "後續建議行動" : "Strategic Next Steps"}</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {parsed.nextActions.map((item, i) => (
                <div key={i} className="flex gap-4 rounded-2xl bg-white/[0.02] p-4 border border-semantic-warning/10 hover:bg-white/[0.04] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-semantic-warning/20 text-semantic-warning font-bold text-sm">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug">{item.action}</p>
                    <p className="mt-1 text-xs text-white/60 leading-relaxed">{item.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
