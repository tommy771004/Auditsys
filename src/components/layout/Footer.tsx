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
    id: "report",
    route: "report",
    labelKey: "footer.report",
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
              <p className="text-lg font-semibold tracking-tight text-white">{t("brand.name")}</p>
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
                      currentRoute === item.route ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.08] hover:text-white",
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
