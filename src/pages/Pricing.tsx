import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles, Cpu, ShieldAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import SolidButton from "../components/ui/SolidButton";
import StatusBadge from "../components/ui/StatusBadge";
import PageIntro from "../components/ui/PageIntro";
import { useCurrentUser } from "../hooks/useCurrentUser";
import SectionHeader from "../components/ui/SectionHeader";
import type { NavigateTo } from "../types/home";
import Accordion from "../components/ui/Accordion";

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
    <div className="relative w-full min-h-screen">
      <div className="hero-grid-bg pointer-events-none" />
      <PageContainer className="relative z-10 flex flex-col gap-16 pb-16 pt-28 sm:pt-32 lg:gap-20 lg:pb-24">
      <motion.section {...pageMotion} className="max-w-4xl">
        <PageIntro
          eyebrow={t("pricing.badge")}
          title={t("pricing.title")}
          description={t("pricing.description")}
          descriptionClassName="max-w-3xl"
        />
        {statusMessage && (
          <div className="mt-6 rounded-sm border border-[var(--border)] bg-black/5 px-4 py-3 text-sm text-brand-cyan backdrop-blur-md">
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

        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          {plans.map((plan, index) => {
            const isFeatured = plan.id === "optimization";
            const isCurrentPlan = user?.subscriptionPlan === plan.planIdMap;
            
            return (
              <motion.div 
                key={plan.id} 
                initial={{ opacity: 0, y: 20 }} 
                whileInView={{ opacity: 1, y: 0 }} 
                viewport={{ once: true, amount: 0.15 }} 
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`flex flex-col h-full ${isFeatured ? "md:-translate-y-3 z-10" : "z-0"}`}
              >
                <div 
                  className={[
                    "flex flex-col h-full rounded-sm border p-6 sm:p-8 transition-colors duration-300 bg-[var(--surface)]",
                    isFeatured 
                      ? "border-[var(--border)] ring-1 ring-white/10" 
                      : "border-[var(--border)]"
                  ].join(" ")}
                >
                  <div className="flex h-full flex-col justify-between gap-8">
                    <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-brand-faint mb-1">
                            {t(plan.nameKey)}
                          </p>
                          <h3 className="text-2xl font-black text-[var(--text)] tracking-tight">
                            {isFeatured ? "PRO PLAN" : plan.id.toUpperCase()}
                          </h3>
                        </div>
                        {isFeatured && (
                          <span className="rounded bg-black/5 border border-[var(--border)] px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest text-brand-muted">
                            {t("pricing.plans.optimization.badge") || "POPULAR"}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-4xl font-black tracking-tight text-[var(--text)] font-mono">
                            {(() => {
                              const apiPlan = plansData.find(p => p.planId === plan.planIdMap);
                              return apiPlan?.price || t(plan.priceKey);
                            })()}
                          </span>
                          <span className="text-xs font-mono text-brand-faint">{t(plan.cadenceKey)}</span>
                        </div>
                        <p className="text-xs sm:text-sm leading-relaxed text-brand-muted">{t(plan.descriptionKey)}</p>
                      </div>

                      <div className="h-px bg-black/5" />

                      <div className="space-y-3.5">
                        {(() => {
                          const apiPlan = plansData.find(p => p.planId === plan.planIdMap);
                          const models = apiPlan?.allowedModels?.split(",").map((m: string) => m.trim()).filter(Boolean) || [];
                          return models.map((model: string) => (
                            <div key={model} className="flex items-center gap-3 text-xs font-mono text-brand-faint">
                              <span className="w-1.5 h-1.5 bg-white/30 rounded-none shrink-0" />
                              <span>{t("misc.provides", { model })}</span>
                            </div>
                          ));
                        })()}
                        {plan.featureKeys.map((featureKey) => (
                          <div key={featureKey} className="flex items-start gap-3 text-xs sm:text-sm text-brand-muted">
                            <span className="mt-2 w-1.5 h-px bg-[var(--surface)] shrink-0" />
                            <span>{t(featureKey)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--border)] mt-auto">
                      {(() => {
                        const requiresApproval = user && (plan.planIdMap === "enterprise" && user.subscriptionPlan !== "enterprise");

                        if (requiresApproval) {
                          return (
                            <div id="enterprise-approval-badge" className="w-full flex flex-col items-center gap-2">
                              <div className="w-full inline-flex items-center justify-center gap-1.5 rounded-sm border border-[var(--border)] bg-black/5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--text)]">
                                <span>{t("pricing.approvalRequired") || "APPROVAL REQUIRED"}</span>
                              </div>
                              <p className="text-[10px] text-brand-faint text-center leading-normal">
                                {t("pricing.enterpriseApprovalHint") || "Upgrade to this tier requires administrator intervention."}
                              </p>
                            </div>
                          );
                        }

                        return (
                          <SolidButton
                            className="w-full justify-center text-xs font-mono font-bold tracking-wider uppercase h-10 rounded-sm active:scale-[0.99] transition-transform"
                            isLoading={upgradingPlan === plan.planIdMap}
                            loadingLabel={t("misc.upgrading")}
                            variant={isCurrentPlan ? "ghost" : (isFeatured ? "primary" : "secondary")}
                            onClick={() => {
                              if (isCurrentPlan) {
                                onNavigate("console");
                              } else {
                                handleUpgrade(plan.planIdMap);
                              }
                            }}
                          >
                            {isCurrentPlan ? t("misc.activePlan") : t(plan.ctaKey)}
                          </SolidButton>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <motion.section {...pageMotion} className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start border-t border-[var(--border)] pt-12">
        <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10 space-y-6">
          <div className="space-y-4">
            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-brand-faint">{t("pricing.deliveryEyebrow")}</p>
            <h2 className="text-3xl font-black text-[var(--text)] tracking-tight leading-tight">{t("pricing.deliveryTitle")}</h2>
            <p className="text-sm leading-relaxed text-brand-muted">{t("pricing.deliveryDescription")}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <SolidButton
              className="justify-center h-11 px-6 rounded-sm text-xs tracking-wider font-mono font-bold uppercase"
              loadingLabel={t("hero.loading")}
              onClick={() => {
                onNavigate("intake");
              }}
            >
              {t("pricing.primaryCta")}
            </SolidButton>
          </div>
        </div>

        <div className="space-y-6">
          <SectionHeader 
            eyebrow={t("pricing.faqEyebrow")} 
            title={t("pricing.faqTitle")} 
            description={t("pricing.faqDescription")} 
            titleClassName="text-2xl lg:text-3xl"
          />

          <Accordion 
            items={faqItems.map((item) => ({
              id: item.id,
              title: t(item.questionKey),
              content: t(item.answerKey)
            }))} 
          />
        </div>
      </motion.section>
    </PageContainer>
    </div>
  );
}
