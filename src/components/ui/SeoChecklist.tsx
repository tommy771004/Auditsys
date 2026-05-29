import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, ChevronDown, ImageOff, Type, FileSearch, MonitorSmartphone } from "lucide-react";
import type { DeterministicDocumentEvidence } from "../../Server/Services/auditPipelineTypes";
import GlassCard from "./GlassCard";

interface SeoChecklistProps {
  documentEvidence?: DeterministicDocumentEvidence;
}

export default function SeoChecklist({ documentEvidence }: SeoChecklistProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!documentEvidence) {
    return null;
  }

  const checklistItems = [
    {
      id: "title",
      icon: Type,
      label: "Title Tag",
      status: !!documentEvidence.title && documentEvidence.title.length > 10 ? "pass" : "fail",
      value: documentEvidence.title || "Missing",
      message: documentEvidence.title && documentEvidence.title.length <= 10 
        ? "Title is too short." 
        : !documentEvidence.title 
          ? "No title tag found." 
          : "Title length is optimal.",
    },
    {
      id: "meta-description",
      icon: FileSearch,
      label: "Meta Description",
      status: !!documentEvidence.metaDescription && documentEvidence.metaDescription.length > 50 ? "pass" : "fail",
      value: documentEvidence.metaDescription || "Missing",
      message: documentEvidence.metaDescription && documentEvidence.metaDescription.length <= 50 
        ? "Meta description is too short." 
        : !documentEvidence.metaDescription 
          ? "No meta description found." 
          : "Meta description length is optimal.",
    },
    {
      id: "alt-text",
      icon: ImageOff,
      label: "Image Alt Text",
      status: documentEvidence.counts.imagesMissingAlt === 0 ? "pass" : "fail",
      value: `${documentEvidence.counts.imagesMissingAlt} missing alt tags`,
      message: documentEvidence.counts.imagesMissingAlt > 0
        ? `Found ${documentEvidence.counts.imagesMissingAlt} images missing alt attributes. This impacts accessibility and image SEO.`
        : "All images have alt tags.",
    },
    {
      id: "h1",
      icon: Type,
      label: "H1 Headings",
      status: documentEvidence.counts.h1 === 1 ? "pass" : "fail",
      value: `${documentEvidence.counts.h1} H1 tags`,
      message: documentEvidence.counts.h1 === 1
        ? "Page has exactly one H1 tag."
        : documentEvidence.counts.h1 === 0
          ? "No H1 tag found. Page structure is missing a primary heading."
          : `Multiple (${documentEvidence.counts.h1}) H1 tags found. Consider using only one per page.`,
    },
    {
      id: "viewport",
      icon: MonitorSmartphone,
      label: "Viewport Meta",
      status: !!documentEvidence.viewport ? "pass" : "fail",
      value: documentEvidence.viewport ? "Present" : "Missing",
      message: documentEvidence.viewport
        ? "Viewport meta tag is correctly configured."
        : "Viewport meta tag is missing, impacting mobile responsiveness.",
    }
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">SEO Signals Checklist</h4>
      <motion.div 
        className="grid gap-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } }
        }}
      >
        <AnimatePresence initial={false}>
          {checklistItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedId === item.id;
            const isPass = item.status === "pass";

            return (
              <motion.div 
                key={item.id} 
                layout
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } }
                }}
                exit={{ opacity: 0, height: 0, overflow: "hidden", transition: { duration: 0.2 } }}
                className={`rounded-[16px] border ${isPass ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-rose-500/20 bg-rose-500/5'} overflow-hidden transition-colors`}
              >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="flex w-full items-center justify-between p-4 text-left focus:outline-none"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isPass ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                    {isPass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <h5 className="font-semibold text-white/90">{item.label}</h5>
                    <p className={`text-xs ${isPass ? 'text-emerald-200/70' : 'text-rose-200/70'}`}>{item.value}</p>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/5 px-4 pb-4 pt-3 text-sm text-white/70">
                      {item.message}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
