import { type FormEvent, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Mail, MessageSquareText, Users, Waypoints, Workflow, AlertTriangle, ShieldCheck, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import SolidButton from "../components/ui/SolidButton";
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

function TargetSafetyChecklist({ url }: { url: string }) {
  const { t } = useTranslation();

  // Parse URL safely
  let isValidUrl = false;
  let parsedUrl: URL | null = null;
  try {
    parsedUrl = new URL(url);
    isValidUrl = true;
  } catch (e) {
    // Attempt with https if missing protocol for visual check
    if (url && !url.includes("://")) {
      try {
        parsedUrl = new URL(`https://${url}`);
      } catch (_) {}
    }
  }

  const hostname = parsedUrl?.hostname || "";

  // 1. Protocol Validation
  let protocolStatus: "pending" | "valid" | "invalid" = "pending";
  if (!url) {
    protocolStatus = "pending";
  } else if (parsedUrl && (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:")) {
    protocolStatus = "valid";
  } else {
    protocolStatus = "invalid";
  }

  // 2. Host Validation
  let hostStatus: "pending" | "valid" | "invalid" = "pending";
  const blockedHosts = [
    "localhost",
    "metadata.google.internal",
  ];
  const isBlocked = url && (
    blockedHosts.includes(hostname.toLowerCase()) ||
    hostname.toLowerCase().endsWith(".localhost") ||
    hostname.toLowerCase().endsWith(".local") ||
    hostname.toLowerCase().endsWith(".internal")
  );

  if (!url || !hostname) {
    hostStatus = "pending";
  } else if (isBlocked) {
    hostStatus = "invalid";
  } else {
    hostStatus = "valid";
  }

  // 3. Network Address / IP Validation
  let ipStatus: "pending" | "valid" | "invalid" = "pending";
  const isPrivateIp = (ip: string) => {
    // Simple client-side private IP check
    if (!ip) return false;
    if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1" || ip === "::") return true;
    
    // Check RFC 1918 Class A, B, C
    const parts = ip.split(".").map(Number);
    if (parts.length === 4 && parts.every(p => !isNaN(p))) {
      const [first, second] = parts;
      if (first === 10) return true;
      if (first === 172 && second >= 16 && second <= 31) return true;
      if (first === 192 && second === 168) return true;
      if (first === 169 && second === 254) return true;
      if (first >= 224) return true; // multicast / reserved
    }
    return false;
  };

  const isIpAddress = url && /^[0-9.:a-fA-F]+$/.test(hostname);
  if (!url || !hostname) {
    ipStatus = "pending";
  } else if (isIpAddress && isPrivateIp(hostname)) {
    ipStatus = "invalid";
  } else {
    ipStatus = "valid";
  }

  const getStatusIcon = (status: "pending" | "valid" | "invalid") => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400 animate-pulse" />;
      case "invalid":
        return <AlertTriangle className="h-4 w-4 text-brand-danger" />;
      case "pending":
      default:
        return <HelpCircle className="h-4 w-4 text-brand-muted" />;
    }
  };

  const getStatusTextClass = (status: "pending" | "valid" | "invalid") => {
    switch (status) {
      case "valid":
        return "text-emerald-400 font-medium";
      case "invalid":
        return "text-brand-danger font-medium";
      case "pending":
      default:
        return "text-brand-muted";
    }
  };

  return (
    <div id="target-safety-checklist" className="p-4 rounded-sm bg-black/5 border border-black/5 space-y-3 mt-4">
      <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted flex items-center">
          <ShieldCheck className="h-4 w-4 mr-1.5 text-brand-purple" /> Target Safety Preflight
        </span>
        {url && (
          <span className="text-[10px] font-mono text-brand-cyan bg-brand-cyan/15 border border-brand-cyan/20 px-2 py-0.5 rounded-full">
            Active Scan
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 text-xs">
        {/* Protocol Preflight */}
        <div className="flex items-center justify-between">
          <span className="text-black/85">Protocol Restriction (HTTP/HTTPS)</span>
          <div className="flex items-center space-x-2">
            <span className={getStatusTextClass(protocolStatus)}>
              {protocolStatus === "valid" ? "HTTP/HTTPS Verified" : protocolStatus === "invalid" ? "Protocol Rejected" : "Awaiting URL"}
            </span>
            {getStatusIcon(protocolStatus)}
          </div>
        </div>

        {/* Host Preflight */}
        <div className="flex items-center justify-between">
          <span className="text-black/85">Host Lookup Restriction (Blocked Domains)</span>
          <div className="flex items-center space-x-2">
            <span className={getStatusTextClass(hostStatus)}>
              {hostStatus === "valid" ? "Public Host Verified" : hostStatus === "invalid" ? "Domain Restricted" : "Awaiting URL"}
            </span>
            {getStatusIcon(hostStatus)}
          </div>
        </div>

        {/* IP Preflight */}
        <div className="flex items-center justify-between">
          <span className="text-black/85">Network Destination Protection</span>
          <div className="flex items-center space-x-2">
            <span className={getStatusTextClass(ipStatus)}>
              {ipStatus === "valid" ? "External Range Check" : ipStatus === "invalid" ? "Private Range Blocked" : "Awaiting Host"}
            </span>
            {getStatusIcon(ipStatus)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Intake({ onNavigate }: IntakePageProps) {
  const { t } = useTranslation();

  const { currentStep, errorKey, formState, isError, isLoading, isSuccess, nextStep, previousStep, progressValue, submitWizard, toggleSelection, updateField } = useIntakeWizard();
  const isCompanyError = errorKey === "validation.requiredCompany";
  const isUrlError = errorKey === "validation.requiredUrl" || errorKey === "validation.invalidUrl";
  const isGoalsError = errorKey === "validation.requiredGoal";
  const isStackError = errorKey === "validation.requiredStack";
  const isEmailError = errorKey === "validation.requiredEmail" || errorKey === "validation.invalidEmail";
  const showSubmitError = errorKey === "validation.submitFailed";

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
              <span className="text-sm font-medium text-black/90">{t("intake.fields.companyName")}</span>
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
                  "w-full rounded-sm bg-black/50 min-h-[44px] px-4 py-3 text-base text-black outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950",
                  isCompanyError
                    ? "border border-rose-300/40 focus:border-rose-400 focus:ring-rose-400/50"
                    : "border border-black focus:border-brand-cyan focus:ring-brand-cyan/50",
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
              <span className="text-sm font-medium text-black/90">{t("intake.fields.url")}</span>
              <div className="relative">
                <Waypoints className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/60" />
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
                  "w-full rounded-sm bg-black/50 min-h-[44px] py-3 pl-12 pr-4 text-base text-black outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-slate",
                    isUrlError
                      ? "border border-brand-danger/40 focus:border-brand-danger focus:ring-brand-danger/50"
                      : "border border-black focus:border-brand-cyan focus:ring-brand-cyan/50",
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

            <TargetSafetyChecklist url={formState.url} />
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-black/90">{t("intake.fields.goals")}</p>
              <div className="grid gap-3">
                {goalOptions.map((option) => {
                  const isSelected = formState.goals.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={[
                        "rounded-sm border px-4 py-4 text-left text-sm transition",
                        isSelected
                          ? "border-cyan-300/30 bg-cyan-300/10 text-black shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                          : isGoalsError
                            ? "border-rose-300/30 bg-rose-300/[0.08] text-black/85 hover:bg-rose-300/[0.12]"
                            : "border-black bg-black/10 text-black/75 hover:bg-black/5 hover:text-black",
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
            <p className="text-sm font-medium text-black/90">{t("intake.fields.stack")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {stackOptions.map((option) => {
                const isSelected = formState.stack.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={[
                      "rounded-sm border px-4 py-4 text-left text-sm transition",
                      isSelected
                        ? "border-cyan-300/30 bg-cyan-300/10 text-black shadow-[0_0_24px_rgba(34,211,238,0.14)]"
                        : isStackError
                          ? "border-rose-300/30 bg-rose-300/[0.08] text-black/85 hover:bg-rose-300/[0.12]"
                          : "border-black bg-black/10 text-black/75 hover:bg-black/5 hover:text-black",
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
              <p className="text-sm font-medium text-black/90">{t("intake.fields.teamSize")}</p>
              <div className="grid gap-3">
                {teamSizeOptions.map((option) => {
                  const isSelected = formState.teamSize === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={[
                        "rounded-sm border px-4 py-4 text-left text-sm transition",
                        isSelected ? "border-black bg-white/[0.1] text-black shadow-[0_0_24px_rgba(139,92,246,0.12)]" : "border-black bg-black/10 text-black/70 hover:bg-black/5 hover:text-black",
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
            <span className="text-sm font-medium text-black/90">{t("intake.fields.contactEmail")}</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/60" />
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
                  "w-full rounded-sm bg-black/50 min-h-[44px] py-3 pl-12 pr-4 text-base text-black outline-none transition placeholder:text-brand-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-slate",
                  isEmailError
                    ? "border border-brand-danger/40 focus:border-brand-danger focus:ring-brand-danger/50"
                    : "border border-black focus:border-brand-cyan focus:ring-brand-cyan/50",
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
            <span className="text-sm font-medium text-black/90">{t("intake.fields.notes")}</span>
            <div className="relative">
              <MessageSquareText className="pointer-events-none absolute left-4 top-5 h-5 w-5 text-black/60" />
              <textarea
                value={formState.notes}
                onChange={(event) => {
                  updateField("notes", event.target.value);
                }}
                placeholder={t("intake.placeholders.notes")}
                rows={6}
                className="w-full rounded-sm border border-black bg-black/50 py-4 pl-12 pr-4 text-base text-black outline-none transition placeholder:text-brand-muted focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/15"
              />
            </div>
          </label>
        </div>

        <GlassCard glow="cyan" className="p-5">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("intake.summaryEyebrow")}</p>
            <h3 className="text-xl font-semibold text-black">{t("intake.summaryTitle")}</h3>
            <p className="text-sm leading-7 text-brand-muted">{t("intake.summaryDescription")}</p>
            <div className="space-y-3 text-sm text-black/85">
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
                  <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-black lg:text-[36px]">{t("intake.panelTitle")}</h2>
                </div>
                <p className="text-sm text-brand-muted">{t("intake.progressLabel", { current: currentStep, total: stepItems.length })}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div className="h-full rounded-full bg-brand-gradient transition-[width] duration-200 ease-out" style={{ width: `${progressValue}%` }} />
              </div>
            </div>

            {isSuccess ? (
              <div className="space-y-6">
                <div className="rounded-sm border border-cyan-300/20 bg-cyan-300/10 p-6 text-left">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full border border-black bg-white p-3">
                      <CheckCircle2 className="h-5 w-5 text-cyan-300" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-semibold text-black">{t("intake.successTitle")}</p>
                      <p className="text-sm leading-7 text-black/75">{t("intake.successDescription")}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <GlassCard className="p-5">
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("intake.followupEyebrow")}</p>
                      <h3 className="text-xl font-semibold text-black">{t("intake.followupTitle")}</h3>
                      <p className="text-sm leading-7 text-brand-muted">{t("intake.followupDescription")}</p>
                    </div>
                  </GlassCard>
                  <div className="flex flex-col gap-3">
                    <SolidButton
                      className="justify-center"
                      loadingLabel={t("hero.loading")}
                      onClick={() => {
                        localStorage.setItem("intake_submitted_url", formState.url);
                        localStorage.setItem("intake_submitted_data", JSON.stringify(formState));
                        const hasToken = !!localStorage.getItem("auth_token");
                        if (!hasToken) {
                          onNavigate("login");
                        } else {
                          onNavigate("console");
                        }
                      }}
                    >
                      {t("intake.buttons.launchConsole")}
                    </SolidButton>

                    <SolidButton
                      className="justify-center"
                      loadingLabel={t("hero.loading")}
                      variant="ghost"
                      onClick={() => {
                        onNavigate("pricing");
                      }}
                    >
                      {t("intake.buttons.viewPricing")}
                    </SolidButton>
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
                          "rounded-sm border px-4 py-4 text-left transition",
                          isActive
                            ? "border-black bg-black/5 shadow-[0_0_30px_rgba(139,92,246,0.14)]"
                            : isCompleted
                              ? "border-cyan-300/20 bg-cyan-300/[0.08]"
                              : "border-black bg-black/10",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">0{step.id}</p>
                          {isCompleted ? <CheckCircle2 className="h-4 w-4 text-cyan-300" /> : null}
                        </div>
                        <p className="mt-3 text-base font-semibold text-black">{t(step.titleKey)}</p>
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
                  <div className="rounded-sm border border-rose-300/20 bg-rose-300/10 px-4 py-4 text-sm text-black/85" aria-live="polite">
                    {t(errorKey)}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-t border-black pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm leading-7 text-brand-muted">{t("intake.helper")}</div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    {currentStep > 1 ? (
                      <SolidButton className="justify-center" loadingLabel={t("hero.loading")} variant="ghost" onClick={previousStep}>
                        {t("intake.buttons.previous")}
                      </SolidButton>
                    ) : null}
                    {currentStep < 3 ? (
                      <SolidButton className="justify-center" loadingLabel={t("hero.loading")} onClick={nextStep}>
                        {t("intake.buttons.next")}
                      </SolidButton>
                    ) : (
                      <SolidButton className="justify-center" isLoading={isLoading} loadingLabel={t("hero.loading")} type="submit">
                        {t("intake.buttons.submit")}
                      </SolidButton>
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
