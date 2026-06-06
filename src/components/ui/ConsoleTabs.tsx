import { motion } from "framer-motion";
import { LayoutDashboard, Radio, MonitorPlay, BarChart3, Presentation } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AppRoute, NavigateTo } from "../../types/home";

interface ConsoleTabsProps {
  currentRoute: AppRoute;
  onNavigate: NavigateTo;
}

export default function ConsoleTabs({ currentRoute, onNavigate }: ConsoleTabsProps) {
  const { t } = useTranslation();

  const tabs = [
    {
      id: "console",
      label: "Mission Control",
      icon: LayoutDashboard,
      route: "console" as AppRoute,
      activeColor: "text-violet-300",
      pillColor: "bg-violet-400/10 border-violet-400/20",
    },
    {
      id: "live",
      label: "Live Execution",
      icon: Radio,
      route: "live" as AppRoute,
      activeColor: "text-brand-cyan",
      pillColor: "bg-brand-cyan/10 border-brand-cyan/20",
    },
    {
      id: "presentation",
      label: "Presentation Deck",
      icon: Presentation,
      route: "presentation" as AppRoute,
      activeColor: "text-amber-300",
      pillColor: "bg-amber-400/10 border-amber-400/20",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl mb-8 flex flex-wrap items-center justify-center gap-2 lg:gap-4 border-b border-black pb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentRoute === tab.route;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.route)}
            className={[
              "relative inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold transition-colors duration-300",
              isActive ? tab.activeColor : "text-black/60 hover:text-black/90",
            ].join(" ")}
          >
            {isActive && (
              <motion.div
                layoutId="activeTabPill"
                className={`absolute inset-0 rounded-sm border ${tab.pillColor}`}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {tab.label}
            </div>
            {!isActive && (
              <div className="absolute inset-0 rounded-sm border border-transparent transition-colors hover:bg-black/10" />
            )}
          </button>
        );
      })}
    </div>
  );
}
