import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock3, Code2, Gauge, Globe2, Network, ShieldCheck, Sparkles, MoveRight, ChevronRight, Zap, Target, BrainCircuit } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import GlassCard from "../components/ui/GlassCard";
import SolidButton from "../components/ui/SolidButton";
import SectionHeader from "../components/ui/SectionHeader";
import Logos3 from "../components/ui/Logos3";
import { useAuditForm } from "../hooks/useAuditForm";
import type { LocalizedContentItem, NavigateTo } from "../types/home";
import Accordion from "../components/ui/Accordion";
import SeoChecklistGuide from "../components/ui/SeoChecklistGuide";

interface FeatureCard extends LocalizedContentItem {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  glow: "purple" | "cyan" | "blue";
  iconClassName: string;
  colSpan?: string;
  rowSpan?: string;
}

interface WorkflowStep extends LocalizedContentItem {
  eyebrowKey: string;
  titleKey: string;
  descriptionKey: string;
  glow: "purple" | "cyan" | "blue";
  icon: LucideIcon;
}

interface TrustPill extends LocalizedContentItem {
  labelKey: string;
  icon: LucideIcon;
}

const AmbientOrbs = () => null;

const BentoCard = ({ children, className }: { children: React.ReactNode, className?: string, glow?: string }) => {
  return (
    <motion.div
        whileHover={{ y: -2, x: -2, boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className={`relative overflow-hidden rounded-sm border border-[var(--border)] bg-[var(--surface)] shadow-[4px_4px_0_rgba(0,0,0,1)] p-8 sm:p-10 transition-all duration-200 text-[var(--text)] ${className}`}
    >
      <div className="relative z-10 h-full">
        {children}
      </div>
    </motion.div>
  );
};

const RevealWordText = ({ text, className }: { text: string, className?: string }) => {
  return (
    <motion.span
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      transition={{ staggerChildren: 0.12 }}
      className={className}
    >
      {text.split(" ").map((word, index) => (
         <motion.span
           key={index}
           variants={{
             hidden: { opacity: 0, y: 30, rotateX: 30, filter: "blur(10px)" },
             visible: { opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }
           }}
           transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
           className="inline-block mr-[0.25em]"
           style={{ transformStyle: "preserve-3d" }}
         >
           {word}
         </motion.span>
      ))}
    </motion.span>
  );
};

const InfiniteMarquee = () => {
  const terms = [
    { text: "AI Powered" },
    { text: "Auto Remediation" },
    { text: "Core Web Vitals" },
    { text: "Security First" },
    { text: "Performance Audits" },
    { text: "Instant Execution" }
  ];

  return (
    <div className="relative w-full overflow-hidden flex flex-col py-12 border-y border-[var(--border)] bg-[var(--surface)]">
      <div className="flex animate-marquee whitespace-nowrap w-max opacity-100">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-16 items-center min-w-max px-8">
            {terms.map((term, idx) => {
              return (
                <div key={idx} className="flex items-center gap-4 text-[var(--text)]">
                  <span className="text-sm font-bold tracking-wide uppercase font-mono">{term.text}</span>
                  {idx !== terms.length - 1 && <div className="w-1.5 h-1.5 rounded-full bg-black ml-12" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

interface HomeProps {
  activeSection: string | null;
  onNavigate: NavigateTo;
}

export default function Home({ activeSection, onNavigate }: HomeProps) {
  const { t, i18n } = useTranslation();
  const { errorKey, isError, isLoading, isSuccess, submitAudit, updateUrl, url } = useAuditForm();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

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
    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeSection]);

  const trustPills: TrustPill[] = [
    { id: "security", labelKey: "hero.trustPills.security", icon: ShieldCheck },
    { id: "turnaround", labelKey: "hero.trustPills.turnaround", icon: Clock3 },
    { id: "expert", labelKey: "hero.trustPills.expert", icon: Target },
  ];

  const featureCards: FeatureCard[] = [
    {
      id: "performance",
      titleKey: "features.cards.performance.title",
      descriptionKey: "features.cards.performance.description",
      icon: Gauge,
      glow: "purple",
      iconClassName: "text-brand-purple",
      colSpan: "lg:col-span-2",
      rowSpan: "lg:row-span-1"
    },
    {
      id: "architecture",
      titleKey: "features.cards.architecture.title",
      descriptionKey: "features.cards.architecture.description",
      icon: Network,
      glow: "cyan",
      iconClassName: "text-brand-cyan",
      colSpan: "lg:col-span-1",
      rowSpan: "lg:row-span-1"
    },
    {
      id: "remediation",
      titleKey: "features.cards.remediation.title",
      descriptionKey: "features.cards.remediation.description",
      icon: Code2,
      glow: "blue",
      iconClassName: "text-blue-300",
      colSpan: "lg:col-span-3",
      rowSpan: "lg:row-span-1"
    },
  ];

  const workflowSteps: WorkflowStep[] = [
    {
      id: "intake",
      eyebrowKey: "workflow.steps.intake.eyebrow",
      titleKey: "workflow.steps.intake.title",
      descriptionKey: "workflow.steps.intake.description",
      glow: "purple",
      icon: Zap
    },
    {
      id: "analysis",
      eyebrowKey: "workflow.steps.analysis.eyebrow",
      titleKey: "workflow.steps.analysis.title",
      descriptionKey: "workflow.steps.analysis.description",
      glow: "cyan",
      icon: BrainCircuit
    },
    {
      id: "delivery",
      eyebrowKey: "workflow.steps.delivery.eyebrow",
      titleKey: "workflow.steps.delivery.title",
      descriptionKey: "workflow.steps.delivery.description",
      glow: "blue",
      icon: Sparkles
    },
  ];

  const statusConfig = isError
    ? {
        titleKey: "hero.errorTitle",
        descriptionKey: errorKey ?? "validation.submitFailed",
        icon: AlertTriangle,
        panelClassName: "border-rose-400/30 bg-rose-400/10 backdrop-blur-xl shadow-lg shadow-rose-500/10",
        iconClassName: "text-rose-300",
      }
    : isSuccess
      ? {
          titleKey: "hero.successTitle",
          descriptionKey: "hero.successDescription",
          icon: ShieldCheck,
          panelClassName: "border-cyan-400/30 bg-cyan-400/10 backdrop-blur-xl shadow-lg shadow-cyan-500/10",
          iconClassName: "text-cyan-300",
        }
      : {
          titleKey: "status.idleTitle",
          descriptionKey: "status.idleDescription",
          icon: Sparkles,
          panelClassName: "border-[var(--border)] bg-black/5 backdrop-blur-xl",
          iconClassName: "text-brand-purple",
        };

  const StatusIcon = statusConfig.icon;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const hasToken = !!localStorage.getItem("auth_token");
    if (!hasToken) {
      if (url) localStorage.setItem("intake_submitted_url", url);
      onNavigate("login");
      return;
    }
    await submitAudit();
  };

  return (
    <div className="relative w-full min-h-screen overflow-hidden antialiased" ref={containerRef}>
      <div className="hero-grid-bg transition-opacity duration-300 ease-out" />
      <AmbientOrbs />

      <PageContainer className="relative z-10 flex flex-col pt-24 pb-24 lg:pb-32">
        {/* HERO SECTION */}
        <motion.section 
          id="overview" 
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="grid gap-16 lg:gap-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center min-h-[75vh]"
        >
          <div className="space-y-12 z-20">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="inline-flex items-center rounded-sm border border-[var(--border)] bg-black/5 px-4 py-2 text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-brand-muted"
            >
              <Sparkles className="w-3.5 h-3.5 mr-2 text-brand-muted" />
              {t("hero.badge")}
            </motion.div>

            <div className="space-y-8 relative z-10">
              <h1 className="max-w-4xl text-[3.25rem] font-black leading-[1.05] tracking-tight text-[var(--text)] sm:text-6xl lg:text-[5.5rem] font-grotesk">
                <span className="block opacity-95">
                  <RevealWordText text={t("hero.titleLine1")} />
                </span>
                <span className="mt-4 block text-brand-faint">
                  <RevealWordText text={t("hero.titleLine2")} />
                </span>
              </h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 1, ease: "easeOut" }}
                className="max-w-2xl text-base sm:text-lg leading-relaxed text-brand-muted font-normal tracking-wide"
              >
                {t("hero.description")}
              </motion.p>
            </div>

            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.7 } }
              }}
              className="flex flex-wrap gap-3 pt-2"
            >
              {trustPills.map((pill) => {
                return (
                  <motion.div 
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 20 } }
                    }}
                    key={pill.id} 
                    className="inline-flex items-center gap-3 rounded-sm border border-[var(--border)] bg-white/[0.015] px-5 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-muted transition-all duration-300 hover:bg-black/10 hover:border-[var(--border)] cursor-default"
                  >
                    <span className="tracking-wide">{t(pill.labelKey)}</span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateY: -15, x: 20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0, x: 0 }}
            transition={{ duration: 1.2, delay: 0.4, type: "spring", stiffness: 80, damping: 20 }}
            className="relative z-30"
          >
            <div className="relative">
              
              <div className="relative rounded-sm overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-8 sm:p-10 z-10 hover:border-[var(--border)] transition-all duration-300 shadow-none">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black tracking-tight text-[var(--text)] mb-2">{t("hero.panelTitle")}</h3>
                    <p className="text-sm leading-relaxed text-brand-muted">{t("hero.panelDescription")}</p>
                  </div>

                  <form id="scan-form" className="space-y-6 pt-2" onSubmit={handleSubmit}>
                    <label className="block space-y-3 relative group">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-brand-faint ml-2 group-focus-within:text-[var(--text)] transition-colors">{t("hero.inputLabel")}</span>
                      <div className="relative rounded-sm overflow-hidden p-[1px] transition-all">
                        <div className="relative flex items-center bg-[var(--surface)] rounded-sm border border-[var(--border)] group-focus-within:border-[var(--border)] group-focus-within:shadow-[4px_4px_0_rgba(0,0,0,1)] group-focus-within:-translate-x-[2px] group-focus-within:-translate-y-[2px] transition-all">
                          <input
                            type="url"
                            inputMode="url"
                            value={url}
                            onChange={(event) => updateUrl(event.target.value)}
                            placeholder={t("hero.inputPlaceholder")}
                            aria-invalid={isUrlFieldError}
                            aria-describedby={isUrlFieldError ? "home-url-error" : undefined}
                            className={[
                              "w-full bg-transparent min-h-[58px] py-3.5 pl-6 pr-6 text-sm text-[var(--text)] outline-none transition-all duration-300 placeholder:text-brand-faint font-mono tracking-wider",
                              isUrlFieldError
                                ? "border-transparent"
                                : "border-transparent",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          />
                        </div>
                      </div>
                    </label>

                    <AnimatePresence mode="wait">
                      {isUrlFieldError && (
                        <motion.p 
                          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          id="home-url-error" className="text-sm text-rose-400 font-medium tracking-wide flex items-center ml-2" aria-live="polite"
                        >
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          {t(errorKey)}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <div className="grid gap-4 sm:grid-cols-2 pt-2">
                      <SolidButton className="w-full justify-center group text-sm h-12 rounded-sm" isLoading={isLoading} loadingLabel={t("hero.loading")} type="submit">
                        {t("hero.submit")}
                      </SolidButton>
                      <SolidButton
                        className="w-full justify-center text-sm h-12 rounded-sm border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-black hover:text-white shadow-[4px_4px_0_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px] transition-all duration-200"
                        loadingLabel={t("hero.loading")}
                        type="button"
                        variant="secondary"
                        onClick={() => onNavigate("console")}
                      >
                        {t("hero.secondaryCta")}
                      </SolidButton>
                    </div>
                  </form>

                  <div className={["rounded-sm border p-5 transition-all duration-200 ease-out", statusConfig.panelClassName].filter(Boolean).join(" ")} aria-live="polite">
                    <div className="space-y-1">
                      <p className="text-[15px] font-bold tracking-wide text-[var(--text)]">{t(statusConfig.titleKey)}</p>
                      <p className="text-sm leading-relaxed text-brand-muted">{t(statusConfig.descriptionKey)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1 }}
          className="mt-20 mb-32"
        >
          <Logos3 />
        </motion.section>

      </PageContainer>
      
      <InfiniteMarquee />

      <PageContainer className="relative z-10 flex flex-col pb-24 lg:pb-32">

        {/* WORKFLOW SECTION */}
        <section id="workflow" className="relative space-y-16 py-24 section-divider border-t">
          <SectionHeader 
            eyebrow={t("workflow.sectionEyebrow")} 
            title={t("workflow.sectionTitle")} 
            description={t("workflow.sectionDescription")} 
            className="max-w-4xl mx-auto text-center" 
          />

          <div className="relative mt-20">
            {/* Ambient Background Line */}
            <div className="absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent hidden lg:block -z-10" />
            
            <div className="grid gap-10 lg:gap-6 lg:grid-cols-3 relative z-10">
              {workflowSteps.map((step, index) => {
                const StepIcon = step.icon;
                return (
                  <motion.div 
                    key={step.id} 
                    initial={{ opacity: 0, y: 40, scale: 0.95 }} 
                    whileInView={{ opacity: 1, y: 1 - (index % 2 === 0 ? 0 : 20), scale: 1 }} 
                    viewport={{ once: true, amount: 0.3 }} 
                    transition={{ duration: 0.8, delay: index * 0.15, type: "spring", stiffness: 80, damping: 20 }}
                    className={`relative ${index % 2 === 1 ? 'lg:translate-y-12' : ''}`}
                  >
                    <BentoCard className="h-full flex flex-col justify-between group">
                      <div className="space-y-6">
                        <div>
                          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-brand-faint mb-3 ml-1">{t(step.eyebrowKey)}</p>
                          <h3 className="text-2xl font-black text-[var(--text)] tracking-tight mb-4">{t(step.titleKey)}</h3>
                          <p className="text-sm sm:text-base leading-relaxed text-brand-muted">{t(step.descriptionKey)}</p>
                        </div>
                      </div>
                    </BentoCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* BENTO GRID FEATURES SECTION */}
        <section id="features" className="relative space-y-16 py-24 section-divider border-t">
          <SectionHeader 
            eyebrow={t("features.sectionEyebrow")} 
            title={t("features.sectionTitle")} 
            description={t("features.sectionDescription")} 
            className="max-w-4xl mx-auto text-center" 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative max-w-6xl mx-auto">
            {featureCards.map((card, index) => {
              const CardIcon = card.icon;

              return (
                <motion.div 
                  key={card.id} 
                  initial={{ opacity: 0, scale: 0.95, y: 30 }} 
                  whileInView={{ opacity: 1, scale: 1, y: 0 }} 
                  viewport={{ once: true, amount: 0.2 }} 
                  transition={{ duration: 0.8, delay: index * 0.1, type: "spring", stiffness: 100 }}
                  className={`${card.colSpan} ${card.rowSpan} h-full`}
                >
                  <BentoCard className="h-full group flex flex-col justify-between">
                    <div className="flex flex-col h-full gap-8">
                      <div className="space-y-4 mt-auto">
                        <h3 className="text-2xl font-black text-[var(--text)] tracking-tight">{t(card.titleKey)}</h3>
                        <p className="text-sm sm:text-base leading-relaxed text-brand-muted max-w-xl">{t(card.descriptionKey)}</p>
                      </div>
                    </div>
                  </BentoCard>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* WORK EXPERIENCE CHRONICLES & AUDIT PORTFOLIO */}
        <section id="experience" className="relative space-y-16 py-24 section-divider border-t">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] max-w-6xl mx-auto">
            
            {/* LEFT SIDE: PROJECT CARD GALLERY WITH ENHANCED IMAGES & HOVER DEEPENING */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 drop-shadow-sm">
                  {i18n.language?.startsWith("zh") ? "稽核專案成果展示（示例）" : "AUDITED PROJECTS SHOWCASE (ILLUSTRATIVE)"}
                </p>
                <h2 className="text-3xl font-black leading-tight tracking-tight text-[var(--text)] sm:text-4xl font-grotesk">
                  {i18n.language?.startsWith("zh") ? "近期效能實績與商業價值" : "Recent Audits & Business Value"}
                </h2>
                <p className="text-base text-brand-muted/80 max-w-lg leading-7">
                  {i18n.language?.startsWith("zh")
                    ? "檢視團隊協助客戶進行網站體檢與重構之經典專案。滑過卡片時，內部圖片高比例放大，且整個卡片優雅上移與邊框加深。"
                    : "Review key cases where we streamlined our clients' core web vitals. Hover over the cards to experience smooth image scaling, subtle translation, and crisp card borders."}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                
                {/* PROJECT CARD 1 */}
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="group relative overflow-hidden rounded-sm border border-[var(--border)] bg-white/[0.015] p-5 shadow-none hover:bg-white/[0.035] hover:border-[var(--border)] transition-all duration-300 cursor-default"
                >
                  <div className="relative overflow-hidden rounded-sm aspect-[16/10] bg-zinc-900 border border-[var(--border)]">
                    <img
                      src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80"
                      referrerPolicy="no-referrer"
                      alt="SaaS Optimization"
                      className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Next.js • Tailwind</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">-54% Latency</span>
                    </div>
                    <h4 className="text-lg font-bold text-[var(--text)] group-hover:text-cyan-300 transition-colors">
                      {i18n.language?.startsWith("zh") ? "跨國 SaaS 智慧主控台" : "Global SaaS Admin Console"}
                    </h4>
                    <p className="text-xs text-brand-muted/80 leading-relaxed">
                      {i18n.language?.startsWith("zh")
                        ? "優化 SSR 串流渲染佇列，大幅改善 LCP 首屏渲染速度與 DOM 層級。"
                        : "Optimized SSR streaming pipelines to drastically lift initial LCP times and DOM metrics."}
                    </p>
                  </div>
                </motion.div>

                {/* PROJECT CARD 2 */}
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="group relative overflow-hidden rounded-sm border border-[var(--border)] bg-white/[0.015] p-5 shadow-none hover:bg-white/[0.035] hover:border-[var(--border)] transition-all duration-300 cursor-default"
                >
                  <div className="relative overflow-hidden rounded-sm aspect-[16/10] bg-zinc-900 border border-[var(--border)]">
                    <img
                      src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80"
                      referrerPolicy="no-referrer"
                      alt="E-Commerce Audit"
                      className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.05]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  </div>
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Astro • SolidJS</span>
                      <span className="text-xs font-mono font-bold text-emerald-400">99/100 Lighthouse</span>
                    </div>
                    <h4 className="text-lg font-bold text-[var(--text)] group-hover:text-purple-300 transition-colors">
                      {i18n.language?.startsWith("zh") ? "新零售奢品閃購平台" : "LuxRetail Flash-sale Hub"}
                    </h4>
                    <p className="text-xs text-brand-muted/80 leading-relaxed">
                      {i18n.language?.startsWith("zh")
                        ? "導入邊緣渲染與孤島架構 (Islands)，去除大量冗餘無用的客戶端 JS 開銷。"
                        : "Adopted progressive hydration and islands architectures to eliminate bloated JS parsing."}
                    </p>
                  </div>
                </motion.div>

              </div>
            </div>

            {/* RIGHT SIDE: EXPERIENCES ACCORDION (工作經歷) */}
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400 drop-shadow-sm">
                  {i18n.language?.startsWith("zh") ? "核心顧問工作經歷（示例）" : "PROFESSIONAL TIMELINE (ILLUSTRATIVE)"}
                </p>
                <h3 className="text-3xl font-black leading-tight tracking-tight text-[var(--text)] sm:text-4xl font-grotesk">
                  {i18n.language?.startsWith("zh") ? "專家團隊技術資歷" : "Consultant Technical Footprint"}
                </h3>
                <p className="text-base text-brand-muted/80 leading-7">
                  {i18n.language?.startsWith("zh")
                    ? "資深架構師團隊歷年於頂尖矽谷與亞太企業之效能攻堅、系統稽核工作軌跡。"
                    : "Our architecture squad's historical tenure solving performance roadblocks for industry giants."}
                </p>
              </div>

              <Accordion
                items={[
                  {
                    id: "lead-architect",
                    title: i18n.language?.startsWith("zh")
                      ? "首席架構稽核總監 @ AuditLens (2024 - 至今)"
                      : "Chief Audit Architect @ AuditLens (2024 - Present)",
                    content: i18n.language?.startsWith("zh")
                      ? "主導開發多代理 (Multi-agent) AI 效能自動诊断引擎，協助客戶自動還原並重定義 Web CSS/JS 加載阻礙，最佳化 Core Web Vitals 及累積成本。總累計協助逾百家知名企業完成架構升級。"
                      : "Directing the production-ready AI orchestration systems that automate core performance profiling. Streamlining critical rendering paths and eliminating long-task blockages across 120+ global enterprise platforms."
                  },
                  {
                    id: "principal-optimizer",
                    title: i18n.language?.startsWith("zh")
                      ? "技術合夥人兼效能優化專家 @ Vercel Alliance (2022 - 2024)"
                      : "Principal Optimization Lead @ Vercel Alliance (2022 - 2024)",
                    content: i18n.language?.startsWith("zh")
                      ? "專司 Next.js 深入渲染渠道、SSR 數據並行預加載及 ISR 即時靜態生成之底層調優。成功將高流量電商首屏加載時間 (TTFB) 減去 65%，年度雲端 API 資源與計費開銷降低 40% 以上。"
                      : "Specialized in deep telemetry hooks for framework hydration. Implemented advanced streaming pre-resolving mechanisms that reduced global rendering budget and cut database egress bills by 40."
                  },
                  {
                    id: "senior-consultant",
                    title: i18n.language?.startsWith("zh")
                      ? "資深網頁前端分析師 @ CyberSpeed Labs (2019 - 2022)"
                      : "Senior Frontend Systems Engineer @ CyberSpeed Labs (2019 - 2022)",
                    content: i18n.language?.startsWith("zh")
                      ? "負責全方位代碼拆包 (Bundle Code Splitting)、樹搖 (Tree-shaking) 的深度靜態分析儀，精巧地為大規模 React 單頁式應用 (SPA) 還原乾淨加載視窗。編寫之稽核手冊與分析腳本普及於團隊內部。"
                      : "Pioneered automated static chunk analyses and dynamic tree-shaking toolings. Built core performance SDKs that profile CPU times, memory retention profiles, and cross-origin fetch bottlenecks."
                  }
                ]}
              />
            </div>

          </div>
        </section>

        {/* SEO CHECKLIST GUIDE SECTION */}
        <section id="seo-checklist" className="relative space-y-16 py-24 section-divider border-t">
          <SeoChecklistGuide />
        </section>

        {/* BOTTOM TEASERS */}
        <motion.section 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="grid gap-6 md:grid-cols-2 mt-12 mb-20 max-w-6xl mx-auto"
        >
          <BentoCard className="p-8 md:p-14 relative overflow-hidden group border-[var(--border)]">
            <div className="relative z-10 space-y-6">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-brand-faint">{t("homePreview.sectionEyebrow")}</p>
              <h2 className="text-3xl font-black leading-tight tracking-tight text-[var(--text)] lg:text-[2.5rem]">{t("homePreview.sectionTitle")}</h2>
              <p className="text-sm sm:text-base leading-relaxed text-brand-muted mt-4 max-w-md">{t("homePreview.sectionDescription")}</p>
              
              <div className="pt-6">
                <div className="inline-flex items-center gap-2 text-brand-faint text-sm font-semibold tracking-wide uppercase hover:text-[var(--text)] transition-colors cursor-pointer group/link">
                   View Details
                </div>
              </div>
            </div>
          </BentoCard>

          <BentoCard className="p-8 md:p-14 relative overflow-hidden group border-[var(--border)]">
            <div className="relative z-10 space-y-6">
              <p className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-brand-faint">{t("homePreview.secondaryEyebrow")}</p>
              <h3 className="text-3xl font-black tracking-tight text-[var(--text)] lg:text-[2.5rem]">{t("homePreview.secondaryTitle")}</h3>
              <p className="text-sm sm:text-base leading-relaxed text-brand-muted mt-4 max-w-md">{t("homePreview.secondaryDescription")}</p>

              <div className="pt-6">
                <div className="inline-flex items-center gap-2 text-brand-faint text-sm font-semibold tracking-wide uppercase hover:text-[var(--text)] transition-colors cursor-pointer group/link">
                   Learn More
                </div>
              </div>
            </div>
          </BentoCard>
        </motion.section>
      </PageContainer>
    </div>
  );
}

