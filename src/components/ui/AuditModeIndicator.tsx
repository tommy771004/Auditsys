import { useTranslation } from "react-i18next";
import { BadgeCheck, Radio, Presentation, Zap, Shield, Database, BrainCircuit } from "lucide-react";

type AuditMode = "console" | "live" | "presentation";

interface AuditModeIndicatorProps {
  mode: AuditMode;
  className?: string;
}

const modeDescriptions: Record<AuditMode, {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  features: string[];
  badgeText: string;
  badgeColor: string;
}> = {
  console: {
    label: "auditMode.console.label",
    description: "auditMode.console.description",
    icon: LayoutDashboardIcon,
    accent: "violet",
    features: [
      "auditMode.console.feature1",
      "auditMode.console.feature2",
      "auditMode.console.feature3",
    ],
    badgeText: "auditMode.console.badge",
    badgeColor: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  },
  live: {
    label: "auditMode.live.label",
    description: "auditMode.live.description",
    icon: RadioIcon,
    accent: "cyan",
    features: [
      "auditMode.live.feature1",
      "auditMode.live.feature2",
      "auditMode.live.feature3",
    ],
    badgeText: "auditMode.live.badge",
    badgeColor: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  },
  presentation: {
    label: "auditMode.presentation.label",
    description: "auditMode.presentation.description",
    icon: PresentationIcon,
    accent: "amber",
    features: [
      "auditMode.presentation.feature1",
      "auditMode.presentation.feature2",
      "auditMode.presentation.feature3",
    ],
    badgeText: "auditMode.presentation.badge",
    badgeColor: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
};

function LayoutDashboardIcon({ className }: { className?: string }) {
  return <LayoutDashboard className={className} />;
}

function RadioIcon({ className }: { className?: string }) {
  return <Radio className={className} />;
}

function PresentationIcon({ className }: { className?: string }) {
  return <Presentation className={className} />;
}

import { LayoutDashboard } from "lucide-react";

export default function AuditModeIndicator({ mode, className = "" }: AuditModeIndicatorProps) {
  const { t } = useTranslation();
  const config = modeDescriptions[mode];

  return (
    <div className={`rounded-sm border p-4 transition-all duration-300 ${className} ${config.accent === "violet" ? "border-violet-500/20 bg-violet-500/5" : config.accent === "cyan" ? "border-cyan-500/20 bg-cyan-500/5" : "border-amber-500/20 bg-amber-500/5"}`}>
      <div className="flex items-start gap-3">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-sm ${config.accent === "violet" ? "bg-violet-500/10 text-violet-700" : config.accent === "cyan" ? "bg-cyan-500/10 text-cyan-700" : "bg-amber-500/10 text-amber-700"}`}>
          <config.icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badgeColor}`}>
              <BadgeCheck className="h-3 w-3" />
              {t(config.badgeText)}
            </span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-[var(--text)]">{t(config.label)}</h3>
          <p className="mt-1 text-sm text-brand-muted">{t(config.description)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {config.features.map((feature, index) => (
              <span key={index} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${config.accent === "violet" ? "bg-violet-500/10 text-violet-700" : config.accent === "cyan" ? "bg-cyan-500/10 text-cyan-700" : "bg-amber-500/10 text-amber-700"}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {t(feature)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}