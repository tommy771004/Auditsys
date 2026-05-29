import { useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Gauge, LayoutDashboard, ListChecks, Network, Search, Download, Loader2, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import ConsoleTabs from "../components/ui/ConsoleTabs";
import Tooltip from "../components/ui/Tooltip";
import GlowingButton from "../components/ui/GlowingButton";
import PageIntro from "../components/ui/PageIntro";
import { useLatestAuditReport } from "../hooks/useLatestAuditReport";
import { buildSampleReportViewModel, type PanelContent, type ReportSectionId } from "../services/reportViewModel";
import type { NavigateTo } from "../types/home";
import SeoChecklist from "../components/ui/SeoChecklist";
import MetricRing from "../components/ui/MetricRing";
import ProgressBar from "../components/ui/ProgressBar";

interface SampleReportProps {
  activeSection: string | null;
  onNavigate: NavigateTo;
}

interface ReportSectionItem {
  id: ReportSectionId;
  labelKey: string;
  icon: LucideIcon;
}

const pageMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.45 },
};

const sectionItems: ReportSectionItem[] = [
  {
    id: "overview",
    labelKey: "report.sections.overview",
    icon: LayoutDashboard,
  },
  {
    id: "performance",
    labelKey: "report.sections.performance",
    icon: Gauge,
  },
  {
    id: "seo",
    labelKey: "report.sections.seo",
    icon: Search,
  },
  {
    id: "architecture",
    labelKey: "report.sections.architecture",
    icon: Network,
  },
  {
    id: "actions",
    labelKey: "report.sections.actions",
    icon: ListChecks,
  },
];

const statToneClasses = {
  default: "border-white/10 bg-white/[0.04]",
  warning: "border-amber-300/20 bg-amber-300/10",
  success: "border-cyan-300/20 bg-cyan-300/10",
} as const;

function isReportSectionId(value: string | null): value is ReportSectionId {
  return sectionItems.some((item) => item.id === value);
}

const CollapsibleBlock: React.FC<{
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, defaultOpen = true, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-2 pb-4 text-left transition-colors hover:opacity-80"
      >
        <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-5 w-5 text-white/50" />
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
            <div className="pb-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function SampleReport({ activeSection, onNavigate }: SampleReportProps) {
  const { i18n, t } = useTranslation();
  const latestReport = useLatestAuditReport();
  const viewModel = latestReport ? buildSampleReportViewModel(latestReport, t, i18n.language) : null;
  const resolvedActiveSection: ReportSectionId = isReportSectionId(activeSection) ? activeSection : "overview";
  const activePanel: PanelContent | null = viewModel ? viewModel.panelContentMap[resolvedActiveSection] : null;
  const activeSectionItem = sectionItems.find((item) => item.id === resolvedActiveSection) ?? sectionItems[0];

  const [isExporting, setIsExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!reportRef.current || isExporting) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#0f172a', // Align with dark theme
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`audit-report-${Date.now()}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <PageContainer className="relative z-10 flex flex-col gap-10 pb-16 pt-28 sm:pt-32 lg:gap-12 lg:pb-24">
      <ConsoleTabs currentRoute="report" onNavigate={onNavigate} />
      <motion.section {...pageMotion} className="max-w-4xl">
        <PageIntro
          eyebrow={t("report.badge")}
          title={t("report.title")}
          description={t("report.description")}
          descriptionClassName="max-w-3xl"
        />
      </motion.section>

      {!viewModel ? (
        <motion.section {...pageMotion}>
          <GlassCard glow="purple" className="max-w-3xl p-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("report.badge")}</p>
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-brand-text">{t("report.runtime.empty.title")}</h2>
                <p className="text-sm leading-7 text-brand-muted">{t("report.runtime.empty.description")}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <GlowingButton
                  className="justify-center"
                  loadingLabel={t("hero.loading")}
                  onClick={() => {
                    onNavigate("home", "scan-form");
                  }}
                >
                  {t("report.runtime.empty.primaryCta")}
                </GlowingButton>
                <GlowingButton
                  className="justify-center"
                  loadingLabel={t("hero.loading")}
                  variant="ghost"
                  onClick={() => {
                    onNavigate("intake");
                  }}
                >
                  {t("report.runtime.empty.secondaryCta")}
                </GlowingButton>
                <GlowingButton
                  className="justify-center"
                  loadingLabel={t("hero.loading")}
                  variant="ghost"
                  onClick={() => {
                    onNavigate("console");
                  }}
                >
                  {t("report.runtime.empty.consoleCta")}
                </GlowingButton>
              </div>
            </div>
          </GlassCard>
        </motion.section>
      ) : null}

      {viewModel ? (
        <section ref={reportRef} className="flex flex-col gap-6">
          <div className="space-y-6">
            <motion.div {...pageMotion} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-semibold tracking-[-0.03em] text-white">{t("report.headerTitle")}</h2>
                  <p className="text-sm text-brand-muted">{viewModel.headerSubtitle}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-brand-muted">{viewModel.generatedAtLabel}</p>
                  <GlowingButton
                    variant="ghost"
                    loadingLabel=""
                    onClick={handleExportPdf}
                    disabled={isExporting}
                  >
                    {isExporting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                    {isExporting ? "Exporting..." : "Export PDF"}
                  </GlowingButton>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {viewModel.metadataChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium tracking-[0.08em] text-white/75">
                    {chip}
                  </span>
                ))}
              </div>
            </motion.div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {viewModel.metricItems.map((item, index) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.38, delay: index * 0.06 }}>
                  <GlassCard glow={item.glow} className="h-full p-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        {item.tooltip ? (
                          <Tooltip content={item.tooltip}>
                            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">{t(item.labelKey)}</p>
                          </Tooltip>
                        ) : (
                          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">{t(item.labelKey)}</p>
                        )}
                        <MetricRing value={item.value} delay={index * 0.1 + 0.2} />
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm leading-7 text-brand-muted">{item.support}</p>
                        <ProgressBar value={item.value} delay={index * 0.1 + 0.3} />
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-col gap-6 w-full">
              <motion.div {...pageMotion}>
                <GlassCard glow="purple" className="h-full p-6 sm:p-8">
                  <CollapsibleBlock title={t("report.sections.overview")}>
                    <motion.div
                      key={resolvedActiveSection}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="space-y-5 pt-4"
                    >
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t(activeSectionItem.labelKey)}</p>
                        <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">{activePanel?.title}</h3>
                        <p className="text-sm leading-7 text-brand-muted">{activePanel?.description}</p>
                      </div>
                      <div className="space-y-3">
                        {activePanel?.bullets.map((bullet, index) => (
                          <motion.div
                            key={`${resolvedActiveSection}-${bullet}`}
                            initial={{ opacity: 0, x: 12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: index * 0.04 }}
                            className="flex items-start gap-3 rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/85"
                          >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                            <span>{bullet}</span>
                          </motion.div>
                        ))}
                      </div>
                      {resolvedActiveSection === "seo" && latestReport?.evidence.deterministic.document && (
                        <div className="mt-8 pt-4">
                          <SeoChecklist documentEvidence={latestReport.evidence.deterministic.document} />
                        </div>
                      )}
                    </motion.div>
                  </CollapsibleBlock>
                </GlassCard>
              </motion.div>

              <div className="flex flex-col gap-6">
                <motion.div {...pageMotion}>
                  <GlassCard glow="cyan" className="p-6">
                    <CollapsibleBlock title={t("report.architectureLens.title")}>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("report.architectureLens.eyebrow")}</p>
                          <p className="text-sm leading-7 text-brand-muted">{t("report.architectureLens.description")}</p>
                        </div>

                        <div className="relative h-64 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:28px_28px]">
                        <div className="absolute left-[20%] top-[29%] h-px w-[22%] bg-gradient-to-r from-cyan-300/60 to-violet-300/40" />
                        <div className="absolute right-[24%] top-[27%] h-px w-[18%] bg-gradient-to-r from-violet-300/50 to-rose-300/60" />
                        <div className="absolute right-[22%] top-[52%] h-px w-[12%] rotate-[60deg] bg-gradient-to-r from-rose-300/50 to-blue-300/55" />
                        {viewModel.architectureNodes.map((node) => (
                          <div
                            key={node.id}
                            className={[
                              "absolute max-w-[132px] rounded-full border bg-slate-950/70 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] backdrop-blur-xl",
                              node.className,
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {node.label}
                          </div>
                        ))}
                      </div>

                      <div className="rounded-[20px] border border-rose-300/20 bg-rose-300/10 px-4 py-4">
                        <p className="text-sm font-semibold text-white">{viewModel.architectureIssueTitle}</p>
                        <p className="mt-2 text-sm leading-7 text-white/75">{viewModel.architectureIssueDescription}</p>
                      </div>
                    </div>
                  </CollapsibleBlock>
                  </GlassCard>
                </motion.div>

                <motion.div {...pageMotion}>
                  <GlassCard glow="blue" className="p-6">
                    <CollapsibleBlock title={t("report.runtime.evidence.title")}>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("report.runtime.evidence.eyebrow")}</p>
                          <p className="text-sm leading-7 text-brand-muted">{t("report.runtime.evidence.description")}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                        {viewModel.browserEvidence.stats.map((stat) => (
                          <div key={stat.id} className={["rounded-[20px] border px-4 py-4", statToneClasses[stat.tone]].join(" ")}>
                            <p className="text-2xl font-semibold tracking-[-0.03em] text-white">{stat.value}</p>
                            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{stat.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        {viewModel.browserEvidence.details.map((detail) => (
                          <div key={detail} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-6 text-white/80">
                            <span className="break-all">{detail}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3 border-t border-white/10 pt-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{t("report.runtime.evidence.manifest.title")}</p>
                          <p className="text-sm leading-6 text-brand-muted">{t("report.runtime.evidence.manifest.description")}</p>
                        </div>

                        {viewModel.browserEvidence.artifacts.length > 0 ? (
                          <div className="space-y-3">
                            {viewModel.browserEvidence.artifacts.map((artifact) => (
                              <div key={artifact.id} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-cyan">{artifact.label}</p>
                                <p className="mt-2 break-all text-sm leading-6 text-white/82">{artifact.value}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/70">
                            {t("report.runtime.evidence.manifest.empty")}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 border-t border-white/10 pt-4">
                        <div className="space-y-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{t("report.runtime.evidence.timeline.title")}</p>
                          <p className="text-sm leading-6 text-brand-muted">{t("report.runtime.evidence.timeline.description")}</p>
                        </div>

                        {viewModel.browserEvidence.timeline.length > 0 ? (
                          <div className="space-y-3">
                            {viewModel.browserEvidence.timeline.map((step) => (
                              <div key={step.id} className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-white">{step.label}</p>
                                    {step.detail ? <p className="mt-1 break-all text-sm leading-6 text-white/72">{step.detail}</p> : null}
                                  </div>
                                  <span className={["rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]", statToneClasses[step.tone], "text-white/80"].join(" ")}>
                                    {step.statusLabel}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/70">
                            {t("report.runtime.evidence.timeline.empty")}
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleBlock>
                  </GlassCard>
                </motion.div>

                <motion.div {...pageMotion}>
                  <GlassCard className="p-6">
                    <CollapsibleBlock title={t("report.actions.title")}>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("report.actions.eyebrow")}</p>
                          <p className="text-sm leading-7 text-brand-muted">{viewModel.actionSummary}</p>
                        </div>

                        <div className="space-y-3">
                        {viewModel.actionItems.map((actionItem) => (
                          <div key={actionItem} className="flex items-start gap-3 text-sm text-white/85">
                            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                            <span>{actionItem}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col gap-3 pt-2">
                        <GlowingButton
                          className="w-full justify-center"
                          loadingLabel={t("hero.loading")}
                          onClick={() => {
                            onNavigate("intake");
                          }}
                        >
                          {t("report.primaryCta")}
                        </GlowingButton>
                        <GlowingButton
                          className="w-full justify-center"
                          loadingLabel={t("hero.loading")}
                          variant="ghost"
                          onClick={() => {
                            onNavigate("console");
                          }}
                        >
                          {t("report.consoleCta")}
                        </GlowingButton>
                        <GlowingButton
                          className="w-full justify-center"
                          loadingLabel={t("hero.loading")}
                          variant="ghost"
                          onClick={() => {
                            onNavigate("pricing");
                          }}
                        >
                          {t("report.secondaryCta")}
                        </GlowingButton>
                      </div>
                    </div>
                    </CollapsibleBlock>
                  </GlassCard>
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </PageContainer>
  );
}
