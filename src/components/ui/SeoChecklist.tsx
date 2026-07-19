import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, ChevronDown, ImageOff, Type, FileSearch, MonitorSmartphone, Zap, Target, BrainCircuit, Sparkles } from "lucide-react";
import type { DeterministicDocumentEvidence } from "../../shared/types/auditPipelineTypes";
import GlassCard from "./GlassCard";

interface SeoChecklistProps {
  documentEvidence?: DeterministicDocumentEvidence;
  standalone?: boolean;
}

const seoGuideSteps = [
  {
    id: "title",
    icon: Type,
    titleKey: "seoChecklistGuide.steps.title.title",
    descriptionKey: "seoChecklistGuide.steps.title.description",
    eyebrowKey: "seoChecklistGuide.steps.title.eyebrow",
  },
  {
    id: "meta-description",
    icon: FileSearch,
    titleKey: "seoChecklistGuide.steps.metaDescription.title",
    descriptionKey: "seoChecklistGuide.steps.metaDescription.description",
    eyebrowKey: "seoChecklistGuide.steps.metaDescription.eyebrow",
  },
  {
    id: "h1",
    icon: Type,
    titleKey: "seoChecklistGuide.steps.h1.title",
    descriptionKey: "seoChecklistGuide.steps.h1.description",
    eyebrowKey: "seoChecklistGuide.steps.h1.eyebrow",
  },
  {
    id: "alt-text",
    icon: ImageOff,
    titleKey: "seoChecklistGuide.steps.altText.title",
    descriptionKey: "seoChecklistGuide.steps.altText.description",
    eyebrowKey: "seoChecklistGuide.steps.altText.eyebrow",
  },
  {
    id: "viewport",
    icon: MonitorSmartphone,
    titleKey: "seoChecklistGuide.steps.viewport.title",
    descriptionKey: "seoChecklistGuide.steps.viewport.description",
    eyebrowKey: "seoChecklistGuide.steps.viewport.eyebrow",
  },
];

const checklistItemConfigs = [
  {
    id: "title",
    icon: Type,
    labelKey: "seoChecklist.items.title.label",
    getStatus: (ev: DeterministicDocumentEvidence | undefined) => 
      !!ev?.title && ev.title.length > 10 ? "pass" : "fail",
    getValue: (ev: DeterministicDocumentEvidence | undefined) => ev?.title || "Missing",
    getMessage: (ev: DeterministicDocumentEvidence | undefined, t: (k: string) => string) => 
      ev?.title && ev.title.length <= 10 ? t("seoChecklist.items.title.tooShort") 
        : !ev?.title ? t("seoChecklist.items.title.missing")
        : t("seoChecklist.items.title.optimal"),
  },
  {
    id: "meta-description",
    icon: FileSearch,
    labelKey: "seoChecklist.items.metaDescription.label",
    getStatus: (ev: DeterministicDocumentEvidence | undefined) => 
      !!ev?.metaDescription && ev.metaDescription.length > 50 ? "pass" : "fail",
    getValue: (ev: DeterministicDocumentEvidence | undefined) => ev?.metaDescription || "Missing",
    getMessage: (ev: DeterministicDocumentEvidence | undefined, t: (k: string) => string) => 
      ev?.metaDescription && ev.metaDescription.length <= 50 ? t("seoChecklist.items.metaDescription.tooShort") 
        : !ev?.metaDescription ? t("seoChecklist.items.metaDescription.missing")
        : t("seoChecklist.items.metaDescription.optimal"),
  },
  {
    id: "alt-text",
    icon: ImageOff,
    labelKey: "seoChecklist.items.altText.label",
    getStatus: (ev: DeterministicDocumentEvidence | undefined) => 
      ev?.counts.imagesMissingAlt === 0 ? "pass" : "fail",
    getValue: (ev: DeterministicDocumentEvidence | undefined) => 
      `${ev?.counts.imagesMissingAlt ?? 0} missing alt tags`,
    getMessage: (ev: DeterministicDocumentEvidence | undefined, t: (k: string, opts?: any) => string) => 
      ev?.counts.imagesMissingAlt && ev.counts.imagesMissingAlt > 0
        ? t("seoChecklist.items.altText.hasMissing", { count: ev.counts.imagesMissingAlt })
        : t("seoChecklist.items.altText.allGood"),
  },
  {
    id: "h1",
    icon: Type,
    labelKey: "seoChecklist.items.h1.label",
    getStatus: (ev: DeterministicDocumentEvidence | undefined) => 
      ev?.counts.h1 === 1 ? "pass" : "fail",
    getValue: (ev: DeterministicDocumentEvidence | undefined) => 
      `${ev?.counts.h1 ?? 0} H1 tags`,
    getMessage: (ev: DeterministicDocumentEvidence | undefined, t: (k: string, opts?: any) => string) => 
      ev?.counts.h1 === 1 ? t("seoChecklist.items.h1.optimal") 
        : ev?.counts.h1 === 0 ? t("seoChecklist.items.h1.missing")
        : t("seoChecklist.items.h1.multiple", { count: ev?.counts.h1 ?? 0 }),
  },
  {
    id: "viewport",
    icon: MonitorSmartphone,
    labelKey: "seoChecklist.items.viewport.label",
    getStatus: (ev: DeterministicDocumentEvidence | undefined) => 
      !!ev?.viewport ? "pass" : "fail",
    getValue: (ev: DeterministicDocumentEvidence | undefined) => 
      ev?.viewport ? "Viewport configured" : "Missing",
    getMessage: (ev: DeterministicDocumentEvidence | undefined, t: (k: string, opts?: any) => string) => 
      ev?.viewport ? t("seoChecklist.items.viewport.configured") : t("seoChecklist.items.viewport.missing"),
  },
];

export default function SeoChecklist({ documentEvidence, standalone = false }: SeoChecklistProps) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  if (!documentEvidence && !standalone) {
    return null;
  }

  const ChecklistItem = ({ item, index }: { item: typeof checklistItemConfigs[0]; index: number }) => {
    const status = item.getStatus(documentEvidence);
    const value = item.getValue(documentEvidence);
    const message = item.getMessage(documentEvidence, t);
    const isPass = status === "pass";

    return (
      <motion.div
        key={item.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.08 }}
        className="flex flex-col gap-3 rounded-sm border border-[var(--border)] bg-black/5 px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <item.icon className={`h-5 w-5 ${isPass ? "text-emerald-400" : "text-rose-400"}`} />
            <span className="text-sm font-medium text-[var(--text)]">{t(item.labelKey)}</span>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest ${
            isPass ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
            : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
          }`}>
            {isPass ? t("seoChecklist.status.pass") : t("seoChecklist.status.fail")}
          </span>
        </div>
        <div className="space-y-1 pl-8">
          <p className="text-sm font-mono text-brand-muted">{value}</p>
          <p className="text-xs text-brand-muted">{message}</p>
        </div>
      </motion.div>
    );
  };

  const renderGuideMode = () => (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-purple/20 bg-brand-purple/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-purple">
          <Zap className="h-3.5 w-3.5" /> {t("seoChecklistGuide.badge")}
        </span>
        <h1 className="text-4xl font-black tracking-tight text-[var(--text)]">{t("seoChecklistGuide.title")}</h1>
        <p className="max-w-2xl mx-auto text-base leading-relaxed text-brand-muted">{t("seoChecklistGuide.description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {seoGuideSteps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: 0.45, delay: index * 0.1 }}
            className="relative"
          >
            <GlassCard className="h-full p-6 sm:p-8 group">
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-brand-faint mb-3 ml-1">{t(step.eyebrowKey)}</p>
                  <h3 className="text-2xl font-black text-[var(--text)] tracking-tight mb-4">{t(step.titleKey)}</h3>
                  <p className="text-sm sm:text-base leading-relaxed text-brand-muted">{t(step.descriptionKey)}</p>
                </div>
              </div>
              <div className="rounded-sm border border-emerald-300/20 bg-emerald-300/10 px-4 py-4">
                <p className="text-sm font-semibold text-[var(--text)]">{t("seoChecklistGuide.bestPractice")}</p>
                <p className="mt-2 text-sm leading-7 text-brand-muted">{t(`seoChecklistGuide.steps.${step.id}.bestPractice`)}</p>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderAuditMode = () => (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("seoChecklist.auditMode.title")}</p>
      {checklistItemConfigs.map((item, index) => (
        <ChecklistItem item={item} index={index} />
      ))}
    </div>
  );

  if (standalone) {
    return <div className="w-full">{renderGuideMode()}</div>;
  }

  return (
    <div className="w-full">
      {renderAuditMode()}
    </div>
  );
}