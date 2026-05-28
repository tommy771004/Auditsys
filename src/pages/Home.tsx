import { useEffect } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock3, Code2, Gauge, Globe2, Network, ShieldCheck, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import GlowingButton from "../components/ui/GlowingButton";
import SectionHeader from "../components/ui/SectionHeader";
import { useAuditForm } from "../hooks/useAuditForm";
import type { LocalizedContentItem, NavigateTo, TrustPillItem, WorkflowContentItem } from "../types/home";

interface FeatureCard extends LocalizedContentItem {
  icon: LucideIcon;
  glow: "purple" | "cyan" | "blue";
  iconClassName: string;
}

interface WorkflowStep extends WorkflowContentItem {
  glow: "purple" | "cyan" | "blue";
}

interface TrustPill extends TrustPillItem {
  icon: LucideIcon;
}

const heroMotion = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5 },
};

interface HomeProps {
  activeSection: string | null;
  onNavigate: NavigateTo;
}

export default function Home({ activeSection, onNavigate }: HomeProps) {
  const { t } = useTranslation();
  const { errorKey, isError, isLoading, isSuccess, submitAudit, updateUrl, url } = useAuditForm();

  useEffect(() => {
    if (isSuccess && url) {
      localStorage.setItem("intake_submitted_url", url);
      const hasToken = !!localStorage.getItem("auth_token");
      if (!hasToken) {
        onNavigate("login");
      } else {
        onNavigate("console");
      }
    }
  }, [isSuccess, url, onNavigate]);
  const isUrlFieldError = errorKey === "validation.requiredUrl" || errorKey === "validation.invalidUrl";

  useEffect(() => {
    if (!activeSection) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const target = document.getElementById(activeSection);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeSection]);

  const trustPills: TrustPill[] = [
    {
      id: "security",
      labelKey: "hero.trustPills.security",
      icon: ShieldCheck,
    },
    {
      id: "turnaround",
      labelKey: "hero.trustPills.turnaround",
      icon: Clock3,
    },
    {
      id: "expert",
      labelKey: "hero.trustPills.expert",
      icon: Sparkles,
    },
  ];

  const featureCards: FeatureCard[] = [
    {
      id: "performance",
      titleKey: "features.cards.performance.title",
      descriptionKey: "features.cards.performance.description",
      icon: Gauge,
      glow: "purple",
      iconClassName: "text-brand-purple",
    },
    {
      id: "architecture",
      titleKey: "features.cards.architecture.title",
      descriptionKey: "features.cards.architecture.description",
      icon: Network,
      glow: "cyan",
      iconClassName: "text-brand-cyan",
    },
    {
      id: "remediation",
      titleKey: "features.cards.remediation.title",
      descriptionKey: "features.cards.remediation.description",
      icon: Code2,
      glow: "blue",
      iconClassName: "text-blue-300",
    },
  ];

  const workflowSteps: WorkflowStep[] = [
    {
      id: "intake",
      eyebrowKey: "workflow.steps.intake.eyebrow",
      titleKey: "workflow.steps.intake.title",
      descriptionKey: "workflow.steps.intake.description",
      glow: "purple",
    },
    {
      id: "analysis",
      eyebrowKey: "workflow.steps.analysis.eyebrow",
      titleKey: "workflow.steps.analysis.title",
      descriptionKey: "workflow.steps.analysis.description",
      glow: "cyan",
    },
    {
      id: "delivery",
      eyebrowKey: "workflow.steps.delivery.eyebrow",
      titleKey: "workflow.steps.delivery.title",
      descriptionKey: "workflow.steps.delivery.description",
      glow: "blue",
    },
  ];

  const statusConfig = isError
    ? {
        titleKey: "hero.errorTitle",
        descriptionKey: errorKey ?? "validation.submitFailed",
        icon: AlertTriangle,
        panelClassName: "border-rose-400/20 bg-rose-400/10",
        iconClassName: "text-rose-300",
      }
    : isSuccess
      ? {
          titleKey: "hero.successTitle",
          descriptionKey: "hero.successDescription",
          icon: ShieldCheck,
          panelClassName: "border-cyan-400/20 bg-cyan-400/10",
          iconClassName: "text-cyan-300",
        }
      : {
          titleKey: "status.idleTitle",
          descriptionKey: "status.idleDescription",
          icon: Sparkles,
          panelClassName: "border-white/10 bg-white/5",
          iconClassName: "text-brand-purple",
        };

  const StatusIcon = statusConfig.icon;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasToken = !!localStorage.getItem("auth_token");
    if (!hasToken) {
      if (url) {
        localStorage.setItem("intake_submitted_url", url);
      }
      onNavigate("login");
      return;
    }
    await submitAudit();
  };

  return (
    <PageContainer className="relative z-10 flex flex-col gap-24 pb-16 pt-28 sm:pt-32 lg:gap-32 lg:pb-24">
        <section id="overview" className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-center">
          <motion.div {...heroMotion} className="space-y-7">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-brand-cyan backdrop-blur-xl">
              {t("hero.badge")}
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-brand-text sm:text-5xl lg:text-7xl">
                <span className="block">{t("hero.titleLine1")}</span>
                <span className="mt-2 block bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent">
                  {t("hero.titleLine2")}
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-8 text-brand-muted sm:text-lg">{t("hero.description")}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {trustPills.map((pill) => {
                const PillIcon = pill.icon;

                return (
                  <div key={pill.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-white/[0.85] backdrop-blur-xl">
                    <PillIcon className="h-4 w-4 text-brand-cyan" />
                    <span>{t(pill.labelKey)}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div {...heroMotion} transition={{ duration: 0.5, delay: 0.08 }}>
            <GlassCard glow="purple" className="p-6 sm:p-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("hero.panelTitle")}</p>
                  <p className="text-sm leading-7 text-brand-muted">{t("hero.panelDescription")}</p>
                </div>

                <form id="scan-form" className="space-y-4" onSubmit={handleSubmit}>
                  <label className="block space-y-3">
                    <span className="text-sm font-medium text-white/90">{t("hero.inputLabel")}</span>
                    <div className="group relative">
                      <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60 transition group-focus-within:text-brand-cyan" />
                      <input
                        type="url"
                        inputMode="url"
                        value={url}
                        onChange={(event) => {
                          updateUrl(event.target.value);
                        }}
                        placeholder={t("hero.inputPlaceholder")}
                        aria-invalid={isUrlFieldError}
                        aria-describedby={isUrlFieldError ? "home-url-error" : undefined}
                        className={[
                          "w-full rounded-2xl bg-slate-950/50 min-h-[44px] py-3 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950",
                          isUrlFieldError
                            ? "border border-rose-300/40 focus:border-rose-400 focus:ring-rose-400/50"
                            : "border border-white/10 focus:border-brand-cyan focus:ring-brand-cyan/50",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      />
                    </div>
                  </label>

                  {isUrlFieldError ? (
                    <p id="home-url-error" className="text-sm text-rose-200" aria-live="polite">
                      {t(errorKey)}
                    </p>
                  ) : null}

                  <p className="text-sm leading-7 text-brand-muted">{t("hero.formCaption")}</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <GlowingButton className="w-full justify-center" isLoading={isLoading} loadingLabel={t("hero.loading")} type="submit">
                      {t("hero.submit")}
                    </GlowingButton>
                    <GlowingButton
                      className="w-full justify-center"
                      loadingLabel={t("hero.loading")}
                      type="button"
                      variant="ghost"
                      onClick={() => onNavigate("report")}
                    >
                      {t("hero.secondaryCta")}
                    </GlowingButton>
                  </div>
                </form>

                <div className={["rounded-[1.5rem] border p-4", statusConfig.panelClassName].filter(Boolean).join(" ")} aria-live="polite">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full border border-white/10 bg-slate-950/40 p-2">
                      <StatusIcon className={["h-5 w-5", statusConfig.iconClassName].join(" ")} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white">{t(statusConfig.titleKey)}</p>
                      <p className="text-sm leading-7 text-white/70">{t(statusConfig.descriptionKey)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-muted">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-cyan" />
                  <div className="space-y-1">
                    <p className="text-white/[0.85]">{t("hero.helper")}</p>
                    <p>{t("hero.formFootnote")}</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </section>

        <motion.section {...heroMotion} id="features" className="space-y-8">
          <SectionHeader eyebrow={t("features.sectionEyebrow")} title={t("features.sectionTitle")} description={t("features.sectionDescription")} className="max-w-3xl" />

          <div className="grid gap-5 lg:grid-cols-3">
            {featureCards.map((card, index) => {
              const CardIcon = card.icon;

              return (
                <motion.div key={card.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45, delay: index * 0.08 }}>
                  <GlassCard glow={card.glow} className="h-full p-6 sm:p-7">
                    <div className="space-y-5">
                      <div className="inline-flex rounded-2xl border border-white/10 bg-slate-950/40 p-3">
                        <CardIcon className={["h-6 w-6", card.iconClassName].join(" ")} />
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-white">{t(card.titleKey)}</h3>
                        <p className="text-sm leading-7 text-brand-muted">{t(card.descriptionKey)}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section {...heroMotion} id="workflow" className="space-y-8">
          <SectionHeader eyebrow={t("workflow.sectionEyebrow")} title={t("workflow.sectionTitle")} description={t("workflow.sectionDescription")} className="max-w-3xl" />

          <div className="grid gap-5 lg:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <motion.div key={step.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45, delay: index * 0.08 }}>
                <GlassCard glow={step.glow} className="h-full p-6 sm:p-7">
                  <div className="space-y-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t(step.eyebrowKey)}</p>
                    <h3 className="text-xl font-semibold text-white">{t(step.titleKey)}</h3>
                    <p className="text-sm leading-7 text-brand-muted">{t(step.descriptionKey)}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section {...heroMotion} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <GlassCard glow="blue" className="p-6 sm:p-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("homePreview.sectionEyebrow")}</p>
              <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-white lg:text-[36px]">{t("homePreview.sectionTitle")}</h2>
              <p className="text-base leading-8 text-brand-muted">{t("homePreview.sectionDescription")}</p>
            </div>
          </GlassCard>

          <GlassCard glow="cyan" className="p-6 sm:p-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("homePreview.secondaryEyebrow")}</p>
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-white">{t("homePreview.secondaryTitle")}</h3>
              <p className="text-base leading-8 text-brand-muted">{t("homePreview.secondaryDescription")}</p>
            </div>
          </GlassCard>
        </motion.section>
      </PageContainer>
  );
}
