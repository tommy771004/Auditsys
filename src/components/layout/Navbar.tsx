import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Home, Sparkles, Terminal, Tag, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppRoute, NavLinkItem, NavigateTo } from "../../types/home";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import GlowingButton from "../ui/GlowingButton";
import MenuBar, { type GlowMenuItem } from "../ui/GlowMenu";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import PageContainer from "./PageContainer";

const navigationItems: NavLinkItem[] = [
  {
    id: "overview",
    route: "home",
    section: "overview",
    labelKey: "navbar.overview",
  },
  {
    id: "features",
    route: "home",
    section: "features",
    labelKey: "navbar.features",
  },
  {
    id: "console",
    route: "console",
    labelKey: "navbar.console",
  },
  {
    id: "pricing",
    route: "pricing",
    labelKey: "navbar.pricing",
  },
];

// Per-item icon + radial glow + active icon color for the GlowMenu desktop nav.
// Color literals are present here so Tailwind's content scanner emits them.
const navItemMeta: Record<string, { icon: LucideIcon; gradient: string; iconColor: string }> = {
  overview: {
    icon: Home,
    gradient: "radial-gradient(circle, rgba(58,214,195,0.18) 0%, rgba(34,197,194,0.06) 50%, rgba(20,128,120,0) 100%)",
    iconColor: "text-cyan-300",
  },
  features: {
    icon: Sparkles,
    gradient: "radial-gradient(circle, rgba(157,139,255,0.18) 0%, rgba(139,92,246,0.06) 50%, rgba(91,33,182,0) 100%)",
    iconColor: "text-violet-300",
  },
  console: {
    icon: Terminal,
    gradient: "radial-gradient(circle, rgba(255,179,71,0.18) 0%, rgba(234,179,8,0.06) 50%, rgba(180,83,9,0) 100%)",
    iconColor: "text-amber-300",
  },
  pricing: {
    icon: Tag,
    gradient: "radial-gradient(circle, rgba(96,165,250,0.18) 0%, rgba(59,130,246,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-300",
  },
};

interface NavbarProps {
  currentRoute: AppRoute;
  currentSection: string | null;
  onNavigate: NavigateTo;
}

export default function Navbar({ currentRoute, currentSection, onNavigate }: NavbarProps) {
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const handleNavigation = (route: AppRoute, section?: string) => {
    onNavigate(route, section);
    setIsMenuOpen(false);
  };

  const isActiveItem = (item: NavLinkItem) => {
    if (item.route !== currentRoute) {
      return false;
    }

    if (item.route !== "home") {
      return true;
    }

    const resolvedSection = currentSection ?? "overview";
    return item.section === resolvedSection;
  };

  const { user } = useCurrentUser();
  const hasToken = !!localStorage.getItem("auth_token");

  const dashboardLabel = user?.isAdmin ? "Admin" : "Console";
  const dashboardRoute: AppRoute = user?.isAdmin ? "admin" : "console";

  const handleAuthAction = async () => {
    if (hasToken) {
      localStorage.removeItem("auth_token");
      await fetch("/api/auth/logout", { method: "POST" });
      onNavigate("login");
      setIsMenuOpen(false);
    } else {
      handleNavigation("login");
    }
  };

  const menuItems: GlowMenuItem[] = navigationItems.map((item) => ({
    icon: navItemMeta[item.id].icon,
    label: t(item.labelKey),
    gradient: navItemMeta[item.id].gradient,
    iconColor: navItemMeta[item.id].iconColor,
  }));
  const activeNavItem = navigationItems.find(isActiveItem);
  const activeMenuLabel = activeNavItem ? t(activeNavItem.labelKey) : undefined;
  const handleMenuClick = (label: string) => {
    const target = navigationItems.find((navItem) => t(navItem.labelKey) === label);
    if (target) {
      handleNavigation(target.route, target.section);
    }
  };

  return (
    <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="fixed inset-x-0 top-0 z-50 pt-4">
      <PageContainer>
        <div className={`glass-panel px-4 py-3 sm:px-5 transition-all duration-300 ${isMenuOpen ? "rounded-3xl" : "rounded-full"}`}>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="flex items-center gap-3 text-[1.08rem] font-bold font-grotesk tracking-tight text-white transition-opacity hover:opacity-80 focus-visible:outline-none rounded-lg"
              onClick={() => {
                handleNavigation("home", "overview");
              }}
            >
              <span className="grid place-items-center w-8 h-8 rounded-[9px] bg-brand-gradient text-[#1a1205] shadow-[0_4px_16px_-4px_rgba(255,179,71,0.6)]">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>
              </span>
              <span>Audit<span className="text-brand-amber ml-0.5">Sys</span></span>
            </button>

            <MenuBar
              className="hidden lg:block"
              items={menuItems}
              activeItem={activeMenuLabel}
              onItemClick={handleMenuClick}
            />

            <div className="hidden items-center gap-3 lg:flex">
              <LanguageSwitcher />
              <button
                onClick={hasToken ? () => handleNavigation(dashboardRoute) : handleAuthAction}
                className="text-sm font-medium text-white/70 hover:text-white transition px-2 py-1 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none rounded-md"
              >
                {hasToken ? dashboardLabel : "Login"}
              </button>
              {hasToken && (
                <button
                  onClick={handleAuthAction}
                  className="text-sm font-medium text-white/70 hover:text-brand-danger transition px-2 py-1 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none rounded-md"
                >
                  Logout
                </button>
              )}
              <GlowingButton
                className="px-5 py-2.5"
                loadingLabel={t("hero.loading")}
                onClick={() => {
                  handleNavigation("intake");
                }}
              >
                {t("navbar.startScan")}
              </GlowingButton>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <LanguageSwitcher />
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/30 text-white/80 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none"
                onClick={() => {
                  setIsMenuOpen((currentValue) => !currentValue);
                }}
                aria-label={isMenuOpen ? t("navbar.closeMenu") : t("navbar.openMenu")}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuOpen ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden lg:hidden"
              >
                <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        "flex w-full items-center min-h-[44px] rounded-2xl px-4 py-3 text-left text-sm font-medium transition active:scale-[0.98]",
                        isActiveItem(item) ? "bg-brand-amber/10 text-brand-amber" : "text-brand-muted hover:bg-white/5 hover:text-white",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => {
                        handleNavigation(item.route, item.section);
                      }}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="flex w-full items-center min-h-[44px] rounded-2xl px-4 py-3 text-left text-sm font-medium transition text-white/80 hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
                    onClick={hasToken ? () => handleNavigation(dashboardRoute) : handleAuthAction}
                  >
                    {hasToken ? dashboardLabel : "Login"}
                  </button>
                  {hasToken && (
                    <button
                      type="button"
                      className="flex w-full items-center min-h-[44px] rounded-2xl px-4 py-3 text-left text-sm font-medium transition text-brand-danger hover:bg-brand-danger/10 active:scale-[0.98]"
                      onClick={handleAuthAction}
                    >
                      Logout
                    </button>
                  )}
                  <GlowingButton
                    className="mt-2 w-full justify-center"
                    loadingLabel={t("hero.loading")}
                    onClick={() => {
                      handleNavigation("intake");
                    }}
                  >
                    {t("navbar.startScan")}
                  </GlowingButton>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </PageContainer>
    </motion.header>
  );
}
