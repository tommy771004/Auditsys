import { motion } from "framer-motion";
import { ImageOff, Heading, Link2Off, ShieldCheck } from "lucide-react";
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
};

const ISSUE_ACCENT: Record<DOMIssueType, string> = {
  missing_alt: "border-amber-400/25 bg-amber-400/10 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.15)]",
  multiple_h1: "border-violet-400/25 bg-violet-400/10 text-violet-200 shadow-[0_0_12px_rgba(167,139,250,0.15)]",
  invalid_canonical: "border-rose-400/25 bg-rose-400/10 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
};

/**
 * Task C — Real DOM Issue Inspector.
 * Renders the `LiveDOMIssue[]` parsed by the backend, using a custom dark-theme
 * HTML highlighter (`CodeSnippet`) with a `bg-red-500/20` overlay on the exact
 * offending line.
 */
export default function DOMIssueHighlighter({ issues }: DOMIssueHighlighterProps) {
  const { t } = useTranslation();

  if (issues.length === 0) {
    return (
      <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} className="flex items-center gap-3 rounded-sm border border-emerald-400/20 bg-emerald-500/10 px-5 py-5 text-sm text-emerald-100 shadow-inner shadow-emerald-500/20">
        <div className="p-2 rounded-full bg-emerald-400/20 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">
          <ShieldCheck className="h-5 w-5 shrink-0" />
        </div>
        <span className="font-semibold">{t("liveAudit.dom.empty")}</span>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => {
        const Icon = ISSUE_ICONS[issue.issueType] ?? Link2Off;
        const accent = ISSUE_ACCENT[issue.issueType] ?? "border-black/15 bg-black/5 text-black/80";

        return (
          <motion.div
            key={`${issue.issueType}-${index}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.24 }}
            className="group rounded-sm border border-black bg-white p-4 backdrop-blur-xl transition-colors hover:bg-white hover:border-black/15"
          >
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className={["inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold overflow-hidden relative", accent].join(" ")}>
                <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity group-hover:opacity-100 mix-blend-overlay" />
                <Icon className="h-3.5 w-3.5" />
                {t(`liveAudit.dom.types.${issue.issueType}`)}
              </span>
              <code className="rounded-md border border-black/5 bg-white px-2.5 py-1 text-xs font-semibold tracking-wide text-cyan-200/90 shadow-inner shadow-black/20">
                {issue.element}
              </code>
            </div>
            <div className="rounded-sm overflow-hidden border border-black/5 shadow-inner shadow-black/40">
              <CodeSnippet code={issue.snippet} highlightLine={issue.highlightLine} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
