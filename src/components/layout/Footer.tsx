import { useTranslation } from "react-i18next";
import type { AppRoute, NavigateTo } from "../../types/home";
import PageContainer from "./PageContainer";

interface FooterProps {
  currentRoute: AppRoute;
  onNavigate: NavigateTo;
}

interface FooterLinkItem {
  id: string;
  route: AppRoute;
  labelKey: string;
}

const footerLinks: FooterLinkItem[] = [
  {
    id: "home",
    route: "home",
    labelKey: "footer.home",
  },
  {
    id: "console",
    route: "console",
    labelKey: "footer.console",
  },
  {
    id: "pricing",
    route: "pricing",
    labelKey: "footer.pricing",
  },
  {
    id: "intake",
    route: "intake",
    labelKey: "footer.startScan",
  },
];

export default function Footer({ currentRoute, onNavigate }: FooterProps) {
  const { t } = useTranslation();

  return (
    <footer className="relative z-10 pb-10 pt-4">
      <PageContainer>
        <div className="glass-panel rounded-[32px] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="flex items-center gap-3 text-[1.08rem] font-bold font-grotesk tracking-tight text-white">
                <span className="grid place-items-center w-8 h-8 rounded-[9px] bg-brand-gradient text-[#1a1205] shadow-[0_4px_16px_-4px_rgba(255,179,71,0.6)]">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>
                </span>
                <span>Audit<span className="text-brand-amber ml-0.5">Sys</span></span>
              </p>
              <p className="text-sm leading-7 text-brand-muted">{t("footer.summary")}</p>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <div className="flex flex-wrap gap-2">
                {footerLinks.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={[
                      "rounded-full px-4 py-2 text-sm font-medium transition",
                      currentRoute === item.route ? "bg-brand-amber/10 text-brand-amber" : "text-brand-muted hover:bg-white/5 hover:text-white",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      onNavigate(item.route, item.route === "home" ? "overview" : undefined);
                    }}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/60">{t("footer.rights", { year: new Date().getFullYear() })}</p>
            </div>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
