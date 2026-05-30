import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import GlowingButton from "../components/ui/GlowingButton";
import PageIntro from "../components/ui/PageIntro";
import { useCurrentUser } from "../hooks/useCurrentUser";
import SectionHeader from "../components/ui/SectionHeader";
import type { NavigateTo } from "../types/home";

interface PricingPageProps {
  onNavigate: NavigateTo;
}

interface PricingPlan {
  id: string;
  nameKey: string;
  priceKey: string;
  cadenceKey: string;
  descriptionKey: string;
  ctaKey: string;
  featureKeys: string[];
  glow: "purple" | "cyan" | "blue";
  badgeKey?: string;
  planIdMap: string; // Map to database plan_id
}

interface FaqItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

const pageMotion = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.45 },
};

export default function Pricing({ onNavigate }: PricingPageProps) {
  const { t } = useTranslation();
  const { user, refreshUser } = useCurrentUser();
  const [plansData, setPlansData] = useState<any[]>([]);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPlansData(data);
      })
      .catch((err) => console.error("Failed to fetch plan settings:", err));
  }, []);

  const handleUpgrade = async (planMap: string) => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      onNavigate("login");
      return;
    }

    setUpgradingPlan(planMap);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planMap })
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Plan upgrades now require admin approval.");
        }

        throw new Error("Failed to upgrade plan");
      }

      const result = await response.json();
      if (result.success && result.token) {
        localStorage.setItem("auth_token", result.token);
        await refreshUser();
        setStatusMessage(`Successfully subscribed to ${planMap.toUpperCase()}!`);
        setTimeout(() => {
          onNavigate("console");
        }, 1500);
      } else {
        throw new Error("Invalid response");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || "Upgrade failed. Please try again.");
    } finally {
      setUpgradingPlan(null);
    }
  };

  const plans: PricingPlan[] = [
    {
      id: "blueprint",
      nameKey: "pricing.plans.blueprint.name",
      priceKey: "pricing.plans.blueprint.price",
      cadenceKey: "pricing.plans.blueprint.cadence",
      descriptionKey: "pricing.plans.blueprint.description",
      ctaKey: "pricing.plans.blueprint.cta",
      featureKeys: [
        "pricing.plans.blueprint.features.performance",
        "pricing.plans.blueprint.features.seo",
        "pricing.plans.blueprint.features.summary",
      ],
      glow: "blue",
      planIdMap: "free",
    },
    {
      id: "optimization",
      nameKey: "pricing.plans.optimization.name",
      priceKey: "pricing.plans.optimization.price",
      cadenceKey: "pricing.plans.optimization.cadence",
      descriptionKey: "pricing.plans.optimization.description",
      ctaKey: "pricing.plans.optimization.cta",
      featureKeys: [
        "pricing.plans.optimization.features.performance",
        "pricing.plans.optimization.features.architecture",
        "pricing.plans.optimization.features.remediation",
      ],
      glow: "purple",
      badgeKey: "pricing.plans.optimization.badge",
      planIdMap: "pro",
    },
    {
      id: "partner",
      nameKey: "pricing.plans.partner.name",
      priceKey: "pricing.plans.partner.price",
      cadenceKey: "pricing.plans.partner.cadence",
      descriptionKey: "pricing.plans.partner.description",
      ctaKey: "pricing.plans.partner.cta",
      featureKeys: [
        "pricing.plans.partner.features.workshop",
        "pricing.plans.partner.features.roadmap",
        "pricing.plans.partner.features.followup",
      ],
      glow: "cyan",
      planIdMap: "enterprise",
    },
  ];

  const faqItems: FaqItem[] = [
    {
      id: "delivery",
      questionKey: "pricing.faq.delivery.question",
      answerKey: "pricing.faq.delivery.answer",
    },
    {
      id: "access",
      questionKey: "pricing.faq.access.question",
      answerKey: "pricing.faq.access.answer",
    },
    {
      id: "scope",
      questionKey: "pricing.faq.scope.question",
      answerKey: "pricing.faq.scope.answer",
    },
  ];

  return (
    <PageContainer className="relative z-10 flex flex-col gap-16 pb-16 pt-28 sm:pt-32 lg:gap-20 lg:pb-24">
      <motion.section {...pageMotion} className="max-w-4xl">
        <PageIntro
          eyebrow={t("pricing.badge")}
          title={t("pricing.title")}
          description={t("pricing.description")}
          descriptionClassName="max-w-3xl"
        />
        {statusMessage && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-brand-cyan backdrop-blur-md">
            {statusMessage}
          </div>
        )}
      </motion.section>

      <motion.section {...pageMotion} className="space-y-8">
        <SectionHeader
          eyebrow={t("pricing.compareEyebrow")}
          title={t("pricing.compareTitle")}
          description={t("pricing.compareDescription")}
          className="max-w-3xl"
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.45, delay: index * 0.08 }}>
              <GlassCard glow={plan.glow} className="h-full p-6 sm:p-8 transition-transform hover:-translate-y-1 duration-300">
                <div className="flex h-full flex-col gap-6">
                  <div className="space-y-4">
                    {plan.badgeKey ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{t(plan.badgeKey)}</span>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">{t(plan.nameKey)}</p>
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="text-4xl font-semibold tracking-[-0.04em] text-white">
                          {(() => {
                            const apiPlan = plansData.find(p => p.planId === plan.planIdMap);
                            return apiPlan?.price || t(plan.priceKey);
                          })()}
                        </span>
                        <span className="text-sm text-brand-muted">{t(plan.cadenceKey)}</span>
                      </div>
                    </div>
                    <p className="text-sm leading-7 text-brand-muted">{t(plan.descriptionKey)}</p>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      const apiPlan = plansData.find(p => p.planId === plan.planIdMap);
                      const models = apiPlan?.allowedModels?.split(",").map((m: string) => m.trim()).filter(Boolean) || [];
                      return models.map((model: string) => (
                        <div key={model} className="flex items-start gap-3 text-sm text-brand-purple">
                          <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
                          <span>{t("misc.provides", { model })}</span>
                        </div>
                      ));
                    })()}
                    {plan.featureKeys.map((featureKey) => (
                      <div key={featureKey} className="flex items-start gap-3 text-sm text-white/85">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-cyan" />
                        <span>{t(featureKey)}</span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const isCurrentPlan = user?.subscriptionPlan === plan.planIdMap;
                    return (
                      <GlowingButton
                        className="mt-auto w-full justify-center min-h-[44px] transition-transform active:scale-[0.98]"
                        isLoading={upgradingPlan === plan.planIdMap}
                        loadingLabel={t("misc.upgrading")}
                        variant={isCurrentPlan ? "ghost" : "primary"}
                        onClick={() => {
                          if (isCurrentPlan) {
                            onNavigate("console");
                          } else {
                            handleUpgrade(plan.planIdMap);
                          }
                        }}
                      >
                        {isCurrentPlan ? t("misc.activePlan") : t(plan.ctaKey)}
                      </GlowingButton>
                    );
                  })()}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section {...pageMotion} className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <GlassCard glow="cyan" className="p-6 sm:p-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{t("pricing.deliveryEyebrow")}</p>
            <h2 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-white lg:text-[36px]">{t("pricing.deliveryTitle")}</h2>
            <p className="text-base leading-8 text-brand-muted">{t("pricing.deliveryDescription")}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <GlowingButton
                className="justify-center"
                loadingLabel={t("hero.loading")}
                onClick={() => {
                  onNavigate("intake");
                }}
              >
                {t("pricing.primaryCta")}
              </GlowingButton>
              <GlowingButton
                className="justify-center"
                loadingLabel={t("hero.loading")}
                variant="ghost"
                onClick={() => {
                  onNavigate("report");
                }}
              >
                {t("pricing.secondaryCta")}
              </GlowingButton>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-4">
          <SectionHeader eyebrow={t("pricing.faqEyebrow")} title={t("pricing.faqTitle")} description={t("pricing.faqDescription")} />

          {faqItems.map((item) => (
            <GlassCard key={item.id} className="p-5">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">{t(item.questionKey)}</h3>
                <p className="text-sm leading-7 text-brand-muted">{t(item.answerKey)}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </motion.section>
    </PageContainer>
  );
}
