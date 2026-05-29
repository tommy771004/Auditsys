import { motion } from "framer-motion";
import { Activity, ImageOff, Heading, Link2Off, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { DOMIssueType, LiveDOMIssue } from "../../types/liveAudit.types";
import CodeSnippet from "./CodeSnippet";

interface DOMIssueHighlighterProps {
  issues: LiveDOMIssue[];
}

const ISSUE_ICONS: Record<DOMIssueType, LucideIcon> = {
  missing_alt: ImageOff,
  multiple_h1: Heading,
  invalid_canonical: Link2Off,
  render_blocking: Activity,
};

const ISSUE_ACCENT: Record<DOMIssueType, string> = {
  missing_alt: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  multiple_h1: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  invalid_canonical: "border-rose-400/25 bg-rose-400/10 text-rose-200",
  render_blocking: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
};

/**
 * Task C — Real DOM Issue Inspector.
 * Renders backend-generated DOM remediation patches with the original HTML,
 * production-ready fixed snippet, and a concise explanation of the change.
 */
export default function DOMIssueHighlighter({ issues }: DOMIssueHighlighterProps) {
  const { t } = useTranslation();

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 px-5 py-5 text-sm text-emerald-100">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <span>{t("liveAudit.dom.empty")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => {
        const Icon = ISSUE_ICONS[issue.issueType] ?? Link2Off;
        const accent = ISSUE_ACCENT[issue.issueType] ?? "border-white/15 bg-white/[0.05] text-white/80";

        return (
          <motion.div
            key={`${issue.issueType}-${index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.24 }}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold", accent].join(" ")}>
                <Icon className="h-3.5 w-3.5" />
                {t(`liveAudit.dom.types.${issue.issueType}`)}
              </span>
              <code className="rounded-md bg-slate-950/60 px-2 py-1 text-xs text-cyan-200">{issue.elementId}</code>
            </div>
            <p className="mb-4 text-sm leading-6 text-white/70">{issue.description}</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-200/80">{t("liveAudit.dom.original")}</p>
                <CodeSnippet code={issue.originalSnippet} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">{t("liveAudit.dom.fixed")}</p>
                <CodeSnippet code={issue.fixedSnippet} />
              </div>
            </div>
            <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm leading-6 text-white/70">
              <span className="font-semibold text-white/85">{t("liveAudit.dom.diff")}</span> {issue.diffExplanation}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
