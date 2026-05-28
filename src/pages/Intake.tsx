import { type FormEvent, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Mail, MessageSquareText, Users, Waypoints, Workflow } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import GlowingButton from "../components/ui/GlowingButton";
import PageIntro from "../components/ui/PageIntro";
import { useIntakeWizard } from "../hooks/useIntakeWizard";
import type { NavigateTo } from "../types/home";

interface IntakePageProps {
  onNavigate: NavigateTo;
}

interface WizardOption {
  id: string;
  labelKey: string;
}

interface StepItem {
  id: number;
  titleKey: string;
  descriptionKey: string;
}

const pageMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.45 },
};

const stepContentMotion = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
  transition: { duration: 0.22, ease: "easeOut" },
};

export default function Intake({ onNavigate }: IntakePageProps) {
  const { t } = useTranslation();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      onNavigate("login");
    }
  }, [onNavigate]);
  const { currentStep, errorKey, formState, isError, isLoading, isSuccess, nextStep, previousStep, progressValue, submitWizard, toggleSelection, updateField } = useIntakeWizard();
  const isCompanyError = errorKey === "validation.requiredCompany";
  const isUrlError = errorKey === "validation.requiredUrl" || errorKey === "validation.invalidUrl";
  const isGoalsError = errorKey === "validation.requiredGoal";
  const isStackError = errorKey === "validation.requiredStack";
  const isEmailError = errorKey === "validation.requiredEmail" || errorKey === "validation.invalidEmail";
  const showSubmitError = errorKey === "validation.intakeSubmitFailed";

  const stepItems: StepItem[] = [
    {
      id: 1,
      titleKey: "intake.steps.target.title",
      descriptionKey: "intake.steps.target.description",
    },
    {
      id: 2,
      titleKey: "intake.steps.stack.title",
      descriptionKey: "intake.steps.stack.description",
    },
    {
      id: 3,
      titleKey: "intake.steps.context.title",
      descriptionKey: "intake.steps.context.description",
    },
  ];

  const goalOptions: WizardOption[] = [
    {
      id: "seo",
      labelKey: "intake.options.goals.seo",
    },
    {
      id: "performance",
      labelKey: "intake.options.goals.performance",
    },
    {
      id: "cost",
      labelKey: "intake.options.goals.cost",
    },
  ];

  const stackOptions: WizardOption[] = [
    {
      id: "react",
      labelKey: "intake.options.stack.react",
    },
    {
      id: "nextjs",
      labelKey: "intake.options.stack.nextjs",
    },
    {
      id: "node",
      labelKey: "intake.options.stack.node",
    },
    {
      id: "azure",
      labelKey: "intake.options.stack.azure",
    },
    {
      id: "vercel",
      labelKey: "intake.options.stack.vercel",
    },
  ];

  const teamSizeOptions: WizardOption[] = [
    {
      id: "small",
      labelKey: "intake.options.teamSize.small",
    },
    {
      id: "mid",
      labelKey: "intake.options.teamSize.mid",
    },
    {
      id: "large",
      labelKey: "intake.options.teamSize.large",
    },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitWizard();
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-5">
            <label className="block space-y-3">
              <span className="text-sm font-medium text-white/90">{t("intake.fields.companyName")}</span>
              <input
                type="text"
                value={formState.companyName}
                onChange={(event) => {
                  updateField("companyName", event.target.value);
                }}
                placeholder={t("intake.placeholders.companyName")}
                aria-invalid={isCompanyError}
                aria-describedby={isCompanyError ? "intake-company-error" : undefined}
                className={[
                  "w-full rounded-2xl bg-slate-950/50 min-h-[44px] px-4 py-3 text-base text-white outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950",
                  isCompanyError
                    ? "border border-rose-300/40 focus:border-rose-400 focus:ring-rose-400/50"
                    : "border border-white/10 focus:border-brand-cyan focus:ring-brand-cyan/50",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </label>

            {isCompanyError ? (
              <p id="intake-company-error" className="text-sm text-rose-200" aria-live="polite">
                {t(errorKey)}
              </p>
            ) : null}

            <label className="block space-y-3">
              <span className="text-sm font-medium text-white/90">{t("intake.fields.url")}</span>
              <div className="relative">
                <Waypoints className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  type="url"
                  value={formState.url}
                  onChange={(event) => {
                    updateField("url", event.target.value);
                  }}
                  placeholder={t("intake.placeholders.url")}
                  aria-invalid={isUrlError}
                  aria-describedby={isUrlError ? "intake-url-error" : undefined}
                  className={[
                  "w-full rounded-2xl bg-slate-950/50 min-h-[44px] py-3 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
                    isUrlError
                      ? "border border-rose-300/40 focus:border-rose-400 focus:ring-rose-400/50"
                      : "border border-white/10 focus:border-brand-cyan focus:ring-brand-cyan/50",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </div>
            </label>

            {isUrlError ? (
              <p id="intake-url-error" className="text-sm text-rose-200" aria-live="polite">
                {t(errorKey)}
              </p>
            ) : null}
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-white/90">{t("intake.fields.goals")}</p>
              <div className="grid gap-3">
                {goalOptions.map((option) => {
                  const isSelected = formState.goals.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={[
                        "rounded-[22px] border px-4 py-4 text-left text-sm transition",
                        isSelected
                          ? "border-cyan-300/30 bg-cyan-300/10 text-white shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                          : isGoalsError
                            ? "border-rose-300/30 bg-rose-300/[0.08] text-white/85 hover:bg-rose-300/[0.12]"
                            : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        toggleSelection("goals", option.id);
                      }}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
              {isGoalsError ? (
                <p className="text-sm text-rose-200" aria-live="polite">
                  {t(errorKey)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <p className="text-sm font-medium text-white/90">{t("intake.fields.stack")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {stackOptions.map((option) => {
                const isSelected = formState.stack.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      "rounded-[22px] border px-4 py-4 text-left text-sm transition",
                      isSelected
                        ? "border-cyan-300/30 bg-cyan-300/10 text-white shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                        : isStackError
                          ? "border-rose-300/30 bg-rose-300/[0.08] text-white/85 hover:bg-rose-300/[0.12]"
                          : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      toggleSelection("stack", option.id);
                    }}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
            {isStackError ? (
              <p className="text-sm text-rose-200" aria-live="polite">
                {t(errorKey)}
              </p>
            ) : null}
          </div>

          <GlassCard className="p-5">
            <div className="space-y-4">
              <p className="text-sm font-medium text-white/90">{t("intake.fields.teamSize")}</p>
              <div className="grid gap-3">
                {teamSizeOptions.map((option) => {
                  const isSelected = formState.teamSize === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={[
                        "rounded-[20px] border px-4 py-4 text-left text-sm transition",
                        isSelected ? "border-white/20 bg-white/[0.1] text-white shadow-[0_0_24px_rgba(139,92,246,0.12)]" : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        updateField("teamSize", option.id);
                      }}
                    >
                      {t(option.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      );
    }

    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <label className="block space-y-3">
            <span className="text-sm font-medium text-white/90">{t("intake.fields.contactEmail")}</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
              <input
                type="email"
                value={formState.contactEmail}
                onChange={(event) => {
                  updateField("contactEmail", event.target.value);
                }}
                placeholder={t("intake.placeholders.contactEmail")}
                aria-invalid={isEmailError}
                aria-describedby={isEmailError ? "intake-email-error" : undefined}
                className={[
                  "w-full rounded-2xl bg-slate-950/50 min-h-[44px] py-3 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900",
                  isEmailError
                    ? "border border-rose-300/40 focus:border-rose-400 focus:ring-rose-400/50"
                    : "border border-white/10 focus:border-brand-cyan focus:ring-brand-cyan/50",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </div>
          </label>

          {isEmailError ? (
            <p id="intake-email-error" className="text-sm text-rose-200" aria-live="polite">
              {t(errorKey)}
            </p>
          ) : null}

          <label className="block space-y-3">
            <span className="text-sm font-medium text-white/90">{t("intake.fields.notes")}</span>
            <div className="relative">
              <MessageSquareText className="pointer-events-none absolute left-4 top-5 h-5 w-5 text-white/40" />
              <textarea
                value={formState.notes}
                onChange={(event) => {
                  updateField("notes", event.target.value);
                }}
                placeholder={t("intake.placeholders.notes")}
                rows={6}
                className="w-full rounded-[1.4rem] border border-white/10 bg-slate-950/50 py-4 pl-12 pr-4 text-base text-white outline-none transition placeholder:text-brand-muted focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/15"
              />
            </div>
          </label>
        </div>

        <GlassCard glow="cyan" className="p-5">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("intake.summaryEyebrow")}</p>
            <h3 className="text-xl font-semibold text-white">{t("intake.summaryTitle")}</h3>
            <p className="text-sm leading-7 text-brand-muted">{t("intake.summaryDescription")}</p>
            <div className="space-y-3 text-sm text-white/85">
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                <span>{t(`intake.options.teamSize.${formState.teamSize}`)}</span>
              </div>
              <div className="flex items-start gap-3">
                <Workflow className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                <span>{formState.stack.map((item) => t(`intake.options.stack.${item}`)).join(" / ")}</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                <span>{formState.goals.map((item) => t(`intake.options.goals.${item}`)).join(" / ")}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  return (
    <PageContainer className="relative z-10 flex flex-col gap-10 pb-16 pt-28 sm:pt-32 lg:gap-12 lg:pb-24">
      <motion.section {...pageMotion} className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow={t("intake.badge")}
          title={t("intake.title")}
          description={t("intake.description")}
          align="center"
          descriptionClassName="mx-auto max-w-3xl"
        />
      </motion.section>

      <motion.section {...pageMotion} className="mx-auto w-full max-w-5xl">
        <GlassCard glow="purple" className="p-6 sm:p-8">
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("intake.progressEyebrow")}</p>
                  <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-white lg:text-[36px]">{t("intake.panelTitle")}</h2>
                </div>
                <p className="text-sm text-brand-muted">{t("intake.progressLabel", { current: currentStep, total: stepItems.length })}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-500" style={{ width: `${progressValue}%` }} />
              </div>
            </div>

            {isSuccess ? (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-cyan-300/20 bg-cyan-300/10 p-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full border border-white/10 bg-slate-950/40 p-3">
                      <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-white">{t("intake.successTitle")}</p>
                      <p className="text-sm leading-7 text-white/75">{t("intake.successDescription")}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <GlassCard className="p-5">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("intake.followupEyebrow")}</p>
                      <h3 className="text-xl font-semibold text-white">{t("intake.followupTitle")}</h3>
                      <p className="text-sm leading-7 text-brand-muted">{t("intake.followupDescription")}</p>
                    </div>
                  </GlassCard>
                  <div className="flex flex-col gap-3">
                    <GlowingButton
                      className="justify-center"
                      loadingLabel={t("hero.loading")}
                      onClick={() => {
                        localStorage.setItem("intake_submitted_url", formState.url);
                        onNavigate("console");
                      }}
                    >
                      {t("intake.buttons.launchConsole")}
                    </GlowingButton>
                    <GlowingButton
                      className="justify-center"
                      loadingLabel={t("hero.loading")}
                      variant="ghost"
                      onClick={() => {
                        onNavigate("report");
                      }}
                    >
                      {t("intake.buttons.viewReport")}
                    </GlowingButton>
                    <GlowingButton
                      className="justify-center"
                      loadingLabel={t("hero.loading")}
                      variant="ghost"
                      onClick={() => {
                        onNavigate("pricing");
                      }}
                    >
                      {t("intake.buttons.viewPricing")}
                    </GlowingButton>
                  </div>
                </div>
              </div>
            ) : (
              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="grid gap-4 lg:grid-cols-3">
                  {stepItems.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;

                    return (
                      <div
                        key={step.id}
                        className={[
                          "rounded-[24px] border px-4 py-4 text-left transition",
                          isActive
                            ? "border-white/20 bg-white/[0.08] shadow-[0_0_30px_rgba(139,92,246,0.14)]"
                            : isCompleted
                              ? "border-cyan-300/20 bg-cyan-300/[0.08]"
                              : "border-white/10 bg-white/[0.04]",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">0{step.id}</p>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4 text-cyan-300" /> : null}
                        </div>
                        <p className="mt-3 text-base font-semibold text-white">{t(step.titleKey)}</p>
                        <p className="mt-2 text-sm leading-7 text-brand-muted">{t(step.descriptionKey)}</p>
                      </div>
                    );
                  })}
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={`step-${currentStep}`} {...stepContentMotion}>
                    {renderStepContent()}
                  </motion.div>
                </AnimatePresence>

                {isError && showSubmitError && errorKey ? (
                  <div className="rounded-[24px] border border-rose-300/20 bg-rose-300/10 px-4 py-4 text-sm text-white/85" aria-live="polite">
                    {t(errorKey)}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm leading-7 text-brand-muted">{t("intake.helper")}</div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {currentStep > 1 ? (
                      <GlowingButton className="justify-center" loadingLabel={t("hero.loading")} variant="ghost" onClick={previousStep}>
                        {t("intake.buttons.previous")}
                      </GlowingButton>
                    ) : null}
                    {currentStep < 3 ? (
                      <GlowingButton className="justify-center" loadingLabel={t("hero.loading")} onClick={nextStep}>
                        {t("intake.buttons.next")}
                      </GlowingButton>
                    ) : (
                      <GlowingButton className="justify-center" isLoading={isLoading} loadingLabel={t("hero.loading")} type="submit">
                        {t("intake.buttons.submit")}
                      </GlowingButton>
                    )}
                  </div>
                </div>
              </form>
            )}
          </div>
        </GlassCard>
      </motion.section>
    </PageContainer>
  );
}
