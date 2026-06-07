import { useState, useEffect } from "react";
import { AnimatePresence, motion, useScroll, useMotionValueEvent } from "framer-motion";
import { Menu, X, Home, Sparkles, Terminal, Tag, Sun, Moon, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppRoute, NavLinkItem, NavigateTo } from "../../types/home";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import SolidButton from "../ui/SolidButton";
import MenuBar, { type GlowMenuItem } from "../ui/GlowMenu";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useLocalStorage } from "../../hooks/useLocalStorage";
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

const navItemMeta: Record<string, { icon: LucideIcon; gradient: string; iconColor: string }> = {
  overview: {
    icon: Home,
    gradient: "radial-gradient(circle, rgba(58,214,195,0.2) 0%, rgba(34,197,194,0.08) 50%, rgba(20,128,120,0) 100%)",
    iconColor: "text-cyan-300",
  },
  features: {
    icon: Sparkles,
    gradient: "radial-gradient(circle, rgba(157,139,255,0.2) 0%, rgba(139,92,246,0.08) 50%, rgba(91,33,182,0) 100%)",
    iconColor: "text-violet-300",
  },
  console: {
    icon: Terminal,
    gradient: "radial-gradient(circle, rgba(255,179,71,0.2) 0%, rgba(234,179,8,0.08) 50%, rgba(180,83,9,0) 100%)",
    iconColor: "text-amber-300",
  },
  pricing: {
    icon: Tag,
    gradient: "radial-gradient(circle, rgba(96,165,250,0.2) 0%, rgba(59,130,246,0.08) 50%, rgba(29,78,216,0) 100%)",
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
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const [theme, setTheme] = useLocalStorage('theme', 'light');

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 20);
  });

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

  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiStatus, setApiStatus] = useState<"red" | "yellow" | "green" | "gray">("gray");

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const start = Date.now();
        const res = await fetch("/api/health");
        if (mounted && res.ok) {
          const lat = Date.now() - start;
          setApiLatency(lat);
          setApiStatus(lat < 200 ? "green" : lat < 500 ? "yellow" : "red");
        } else if (mounted) {
          setApiStatus("red");
        }
      } catch (err) {
        if (mounted) setApiStatus("red");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.header 
      initial={{ y: -40, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} 
      className="fixed inset-x-0 top-0 z-50 pt-4"
    >
      <PageContainer>
        <motion.div 
          animate={{
            backgroundColor: "#ffffff",
            backdropFilter: "none",
            borderColor: "#000000",
            boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)"
          }}
          transition={{ duration: 0.3 }}
          className={`border transition-all px-4 py-3 sm:px-5 ${isMenuOpen ? "rounded-sm bg-[var(--surface)]" : "rounded-sm bg-[var(--surface)]"}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                id="navbar-home-logo"
                type="button"
                className="flex items-center gap-3 text-[1.15rem] font-bold font-grotesk tracking-tight text-[var(--text)] transition-all hover:opacity-90 focus-visible:outline-none rounded-sm group"
                onClick={() => handleNavigation("home", "overview")}
              >
                <span className="grid place-items-center w-8 h-8 rounded-sm bg-black/5 text-[var(--text)] border border-[var(--border)] transition-colors duration-300 group-hover:bg-black/10">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>
                </span>
                <span className="hidden sm:flex items-center">{t("brand.name")}</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 ml-2 mr-2" title={apiLatency ? `API Latency: ${apiLatency}ms` : 'Checking backend status...'}>
                <div className={`h-2 w-2 rounded-full ${apiStatus === 'green' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : apiStatus === 'yellow' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : apiStatus === 'red' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]' : 'bg-slate-300'}`} />
              </div>

              {currentRoute !== "home" && (
                <div className="hidden sm:flex items-center gap-2 text-sm font-medium">
                  <span className="text-brand-faint">/</span>
                  <span className="text-brand-muted capitalize">
                    {t(`navbar.${currentRoute}`, { defaultValue: currentRoute.replace('-', ' ') })}
                  </span>
                </div>
              )}
            </div>

            <MenuBar
              className="hidden lg:block scale-95 origin-center"
              items={menuItems}
              activeItem={activeMenuLabel}
              onItemClick={handleMenuClick}
            />

            <div className="hidden items-center gap-1.5 lg:flex">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-sm border border-transparent hover:border-[var(--border)] hover:bg-black/5 transition-colors focus-visible:outline-none"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <LanguageSwitcher />
              <button
                onClick={hasToken ? () => handleNavigation(dashboardRoute) : handleAuthAction}
                className="text-sm font-semibold text-[var(--text)] transition-all duration-200 ease-out px-3 py-2 rounded-sm border border-transparent hover:border-[var(--border)] hover:bg-black hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px]"
              >
                {hasToken ? dashboardLabel : "Login"}
              </button>
              {hasToken && (
                <button
                  onClick={handleAuthAction}
                  className="text-sm font-semibold text-rose-600 transition-all duration-200 ease-out px-3 py-2 rounded-sm border border-transparent hover:border-rose-600 hover:bg-rose-600 hover:text-white hover:shadow-[2px_2px_0px_0px_rgba(225,29,72,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px]"
                >
                  Logout
                </button>
              )}
              <SolidButton
                className="px-6 py-2.5 ml-2 text-sm scale-95"
                loadingLabel={t("hero.loading")}
                onClick={() => handleNavigation("intake")}
              >
                {t("navbar.startScan")}
              </SolidButton>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-sm border border-transparent hover:border-[var(--border)] hover:bg-black/5 transition-colors focus-visible:outline-none"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <LanguageSwitcher />
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-colors duration-200 ease-out hover:bg-black hover:text-white focus-visible:ring-2 focus-visible:ring-black shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px]"
                onClick={() => setIsMenuOpen((v) => !v)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
                exit={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden lg:hidden"
              >
                <div className="mt-4 space-y-1.5 border-t border-[var(--border)] pt-4 pb-2">
                  {navigationItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={[
                        "flex w-full items-center h-12 rounded-sm px-5 text-left text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98]",
                        isActiveItem(item) ? "bg-black text-white border border-[var(--border)] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "text-[var(--text)] hover:bg-black hover:text-white border border-transparent",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => handleNavigation(item.route, item.section)}
                    >
                      {t(item.labelKey)}
                    </button>
                  ))}
                  <div className="h-px w-full bg-black my-2" />
                  <button
                    type="button"
                    className="flex w-full items-center h-12 rounded-sm px-5 text-left text-sm font-semibold transition-all duration-200 ease-out text-[var(--text)] hover:bg-black hover:text-white border border-transparent active:scale-[0.98]"
                    onClick={hasToken ? () => handleNavigation(dashboardRoute) : handleAuthAction}
                  >
                    {hasToken ? dashboardLabel : "Login"}
                  </button>
                  {hasToken && (
                    <button
                      type="button"
                      className="flex w-full items-center h-12 rounded-sm px-5 text-left text-sm font-semibold transition-all duration-200 ease-out text-rose-600/80 hover:bg-rose-600 hover:text-white border border-transparent active:scale-[0.98]"
                      onClick={handleAuthAction}
                    >
                      Logout
                    </button>
                  )}
                  <div className="pt-2">
                    <SolidButton
                      className="w-full justify-center"
                      loadingLabel={t("hero.loading")}
                      onClick={() => handleNavigation("intake")}
                    >
                      {t("navbar.startScan")}
                    </SolidButton>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </PageContainer>
    </motion.header>
  );
}
