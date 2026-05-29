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
      activeColor: "text-violet-300 bg-violet-400/10 border-violet-400/20",
    },
    {
      id: "live",
      label: "Live Execution",
      icon: Radio,
      route: "live" as AppRoute,
      activeColor: "text-brand-cyan bg-brand-cyan/10 border-brand-cyan/20",
    },
    {
      id: "report",
      label: "Standard Report",
      icon: BarChart3,
      route: "report" as AppRoute,
      activeColor: "text-emerald-300 bg-emerald-400/10 border-emerald-400/20",
    },
    {
      id: "presentation",
      label: "Presentation Deck",
      icon: Presentation,
      route: "presentation" as AppRoute,
      activeColor: "text-amber-300 bg-amber-400/10 border-amber-400/20",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl mb-8 flex flex-wrap items-center justify-center gap-2 lg:gap-4 border-b border-white/10 pb-4">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentRoute === tab.route;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.route)}
            className={[
              "inline-flex items-center gap-2 rounded-2xl border px-5 py-2.5 text-sm font-semibold transition-all duration-300",
              isActive
                ? tab.activeColor
                : "border-transparent text-white/60 hover:bg-white/[0.04] hover:text-white/90",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
