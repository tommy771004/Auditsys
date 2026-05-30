import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Mail, Megaphone, Search } from "lucide-react";
import PageContainer from "../components/layout/PageContainer";
import SectionHeader from "../components/ui/SectionHeader";
import GlassContainer from "../components/ui/GlassContainer";
import type { NavigateTo } from "../types/home";

interface CampaignProps {
  onNavigate: NavigateTo;
}

export default function Campaign({ onNavigate }: CampaignProps) {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t("campaign.badge")}
          title={t("campaign.title")}
          description={t("campaign.description")}
          className="text-center"
        />

        <div className="mt-16 space-y-24">
          {/* Section 1: Google Ads */}
          <section>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-cyan/20 text-brand-cyan">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-brand-cyan">{t("campaign.googleAds.eyebrow")}</p>
                <h2 className="text-2xl font-bold text-white">{t("campaign.googleAds.title")}</h2>
              </div>
            </div>
            
            <GlassContainer accent="cyan" className="p-5 sm:p-8">
              <div className="flex flex-col gap-6">
                <div>
                  <p className="mb-2 text-xs font-mono text-white/60">{t("campaign.googleAds.keywords")}</p>
                  <div className="rounded-xl bg-slate-950/50 p-6 border border-white/5">
                    <h3 className="text-xl font-bold text-brand-cyan hover:underline cursor-pointer">{t("campaign.googleAds.headline1")}</h3>
                    <h3 className="text-xl font-bold text-brand-cyan hover:underline cursor-pointer mt-1">{t("campaign.googleAds.headline2")}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/80">{t("campaign.googleAds.description")}</p>
                    <p className="mt-4 text-xs font-semibold text-brand-cyan/80">{t("campaign.googleAds.sitelinks")}</p>
                  </div>
                </div>
              </div>
            </GlassContainer>
          </section>

          {/* Section 2: Social Ads (Meta / LinkedIn) */}
          <section>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-brand-purple">{t("campaign.socialAds.eyebrow")}</p>
                <h2 className="text-2xl font-bold text-white">{t("campaign.socialAds.title")}</h2>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <GlassContainer accent="violet" className="p-5 sm:p-8">
                <h3 className="mb-4 text-sm font-bold text-white/90">{t("campaign.socialAds.test1.title")}</h3>
                <div className="mb-4 aspect-video rounded-xl bg-slate-950/80 border border-brand-purple/20 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                  <p className="text-xs text-white/60 italic">"{t("campaign.socialAds.test1.visual")}"</p>
                </div>
                <p className="text-sm leading-relaxed text-white/90">"{t("campaign.socialAds.test1.text")}"</p>
                <div className="mt-6 flex justify-end">
                  <span className="rounded-full bg-brand-purple px-4 py-2 text-xs font-bold text-white">{t("campaign.socialAds.test1.cta")}</span>
                </div>
              </GlassContainer>

              <GlassContainer accent="blue" className="p-5 sm:p-8">
                <h3 className="mb-4 text-sm font-bold text-white/90">{t("campaign.socialAds.test2.title")}</h3>
                <div className="mb-4 aspect-video rounded-xl bg-slate-950/80 border border-blue-500/20 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                  <p className="text-xs text-white/60 italic">"{t("campaign.socialAds.test2.visual")}"</p>
                </div>
                <p className="text-sm leading-relaxed text-white/90">"{t("campaign.socialAds.test2.text")}"</p>
                <div className="mt-6 flex justify-end">
                  <span className="rounded-full bg-blue-500 px-4 py-2 text-xs font-bold text-white">{t("campaign.socialAds.test2.cta")}</span>
                </div>
              </GlassContainer>
            </div>
          </section>

          {/* Section 3: Email Sequence */}
          <section>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-semantic-success/20 text-semantic-success">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-semantic-success">{t("campaign.emailSequence.eyebrow")}</p>
                <h2 className="text-2xl font-bold text-white">{t("campaign.emailSequence.title")}</h2>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {['email1', 'email2', 'email3'].map((emailKey) => (
                <GlassContainer key={emailKey} accent="violet" className="flex flex-col p-5 sm:p-6 transition-transform hover:-translate-y-1">
                  <div className="mb-4 border-b border-white/10 pb-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-white/60 mb-2">{t(`campaign.emailSequence.${emailKey}.title`)}</p>
                    <p className="text-sm font-medium text-white"><span className="text-white/60">{t("campaign.emailSequence.subj")}</span>{t(`campaign.emailSequence.${emailKey}.subject`)}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80 flex-1 whitespace-pre-wrap">
                    {t(`campaign.emailSequence.${emailKey}.body`)}
                  </p>
                </GlassContainer>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
