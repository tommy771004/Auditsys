import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  Menu, 
  X, 
  ChevronRight, 
  Compass, 
  Sparkles, 
  Terminal, 
  CreditCard, 
  Award, 
  LogIn, 
  LogOut, 
  UserCheck 
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppRoute, NavLinkItem, NavigateTo } from "../../types/home";
import LanguageSwitcher from "../ui/LanguageSwitcher";
import GlowingButton from "../ui/GlowingButton";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import PageContainer from "./PageContainer";

const itemIcons: Record<string, any> = {
  overview: Compass,
  features: Sparkles,
  console: Terminal,
  pricing: CreditCard,
  campaign: Award,
};

const menuContainerVariants = {
  hidden: { opacity: 0, height: 0, scale: 0.99 },
  visible: {
    opacity: 1,
    height: "auto",
    scale: 1,
    transition: {
      height: { type: "spring", stiffness: 240, damping: 26 },
      opacity: { duration: 0.2 },
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    scale: 0.99,
    transition: {
      height: { duration: 0.2, ease: "easeInOut" },
      opacity: { duration: 0.15 },
      staggerChildren: 0.04,
      staggerDirection: -1,
    },
  },
};

const menuItemVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 300, damping: 22 },
  },
  exit: {
    opacity: 0,
    y: -10,
    filter: "blur(4px)",
    transition: { duration: 0.12 },
  },
};

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
  {
    id: "campaign",
    route: "campaign",
    labelKey: "navbar.campaign",
  },
];

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

  return (
    <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="fixed inset-x-0 top-0 z-50 pt-4">
      <PageContainer>
        <div className={`relative px-4 py-3 sm:px-5 transition-all duration-500 overflow-hidden ${
          isMenuOpen 
            ? "rounded-[28px] bg-slate-950/80 border-white/15 shadow-[0_25px_50px_-12px_rgba(168,85,247,0.25)] backdrop-blur-[36px] border border-white/15" 
            : "rounded-full glass-panel border border-white/10"
        }`}>
          {/* Top specular highlight line for high-depth glass look */}
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-60" />
          <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-white/10 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
          
          {/* Ambient liquid background glow */}
          <div className={`pointer-events-none absolute -inset-2 -z-10 bg-gradient-to-r from-[#ddb7ff]/10 via-[#5de6ff]/10 to-blue-600/10 rounded-[inherit] blur-2xl transition-all duration-500 ${isMenuOpen ? "opacity-100 scale-102" : "opacity-30 scale-100"}`} />

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              className="flex items-center gap-2 text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none rounded-lg"
              onClick={() => {
                handleNavigation("home", "overview");
              }}
            >
              {t("brand.name")}
            </button>

            <nav className="hidden items-center gap-2 lg:flex">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none",
                    isActiveItem(item) ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/[0.08] hover:text-white",
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
            </nav>

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

            <div className="flex items-center gap-2.5 lg:hidden">
              <LanguageSwitcher />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.03] text-white/95 backdrop-blur-2xl transition shadow-inner hover:border-white/25 hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:outline-none"
                onClick={() => {
                  setIsMenuOpen((currentValue) => !currentValue);
                }}
                aria-label={isMenuOpen ? t("navbar.closeMenu") : t("navbar.openMenu")}
                aria-expanded={isMenuOpen}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isMenuOpen ? "close" : "menu"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 20 }}
                  >
                    {isMenuOpen ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white/90" />}
                  </motion.div>
                </AnimatePresence>
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {isMenuOpen ? (
              <motion.div
                variants={menuContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="overflow-hidden lg:hidden"
              >
                <div className="mt-4 space-y-2.5 border-t border-white/10 pt-5 pb-2">
                  {navigationItems.map((item) => {
                    const Icon = itemIcons[item.id] || Compass;
                    const active = isActiveItem(item);
                    return (
                      <motion.div key={item.id} variants={menuItemVariants}>
                        <button
                          type="button"
                          className={[
                            "group/item flex w-full items-center justify-between min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-300 relative overflow-hidden",
                            "border border-white/[0.03] backdrop-blur-md shadow-sm",
                            active 
                              ? "bg-gradient-to-r from-white/[0.09] to-white/[0.03] text-white border-white/15" 
                              : "bg-white/[0.01] text-white/80 hover:bg-white/[0.05] hover:text-white hover:border-white/10 hover:translate-x-[2px]",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => {
                            handleNavigation(item.route, item.section);
                          }}
                        >
                          {/* Active Background Glow Pill */}
                          {active && (
                            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-gradient-to-b from-[#ddb7ff] to-[#5de6ff] rounded-r" />
                          )}
                          
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg transition-transform duration-300 group-hover/item:scale-110 ${
                              active ? "bg-white/10 text-[#5de6ff]" : "bg-white/[0.02] text-white/50 group-hover/item:text-[#ddb7ff]"
                            }`}>
                              <Icon className="h-4.5 w-4.5" />
                            </div>
                            <span className="tracking-wide">{t(item.labelKey)}</span>
                          </div>

                          <ChevronRight className={`h-4 w-4 text-white/30 transition-all duration-300 ${
                            active ? "text-[#5de6ff]/80 translate-x-0" : "group-hover/item:text-white/60 group-hover/item:translate-x-1"
                          }`} />
                        </button>
                      </motion.div>
                    );
                  })}

                  {/* Secondary Auth / Command Section in a cohesive Glass Row */}
                  <motion.div variants={menuItemVariants} className="pt-2 border-t border-white/[0.06] space-y-2.5">
                    <button
                      type="button"
                      className="group/item flex w-full items-center justify-between min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-300 border border-white/[0.03] bg-white/[0.01] text-white/80 hover:bg-white/[0.05] hover:text-white hover:border-white/10 hover:translate-x-[2px]"
                      onClick={hasToken ? () => handleNavigation(dashboardRoute) : handleAuthAction}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-white/[0.02] text-white/50 group-hover/item:text-[#5de6ff] group-hover/item:scale-110 transition-all duration-300">
                          <UserCheck className="h-4.5 w-4.5" />
                        </div>
                        <span className="tracking-wide">{hasToken ? dashboardLabel : "Login"}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-white/30 transition-transform duration-300 group-hover/item:translate-x-1 group-hover/item:text-white/60" />
                    </button>

                    {hasToken && (
                      <button
                        type="button"
                        className="group/item flex w-full items-center justify-between min-h-[48px] rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-300 border border-white/[0.03] bg-red-950/10 text-red-500 hover:bg-red-950/20 hover:text-red-300 hover:border-red-900/30 active:scale-[0.98]"
                        onClick={handleAuthAction}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-red-950/20 text-red-400 group-hover/item:scale-110 transition-transform duration-300">
                            <LogOut className="h-4.5 w-4.5" />
                          </div>
                          <span className="tracking-wide">Logout</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-red-500/40" />
                      </button>
                    )}
                  </motion.div>

                  {/* Main Action Callout */}
                  <motion.div variants={menuItemVariants} className="pt-2">
                    <GlowingButton
                      className="w-full justify-center min-h-[48px] rounded-2xl shadow-[0_12px_24px_rgba(168,85,247,0.25)] hover:shadow-[0_12px_32px_rgba(168,85,247,0.4)] active:scale-[0.98] transition-all"
                      loadingLabel={t("hero.loading")}
                      onClick={() => {
                        handleNavigation("intake");
                      }}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Sparkles className="h-4 w-4 text-white animate-pulse" />
                        <span>{t("navbar.startScan")}</span>
                      </div>
                    </GlowingButton>
                  </motion.div>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </PageContainer>
    </motion.header>
  );
}
