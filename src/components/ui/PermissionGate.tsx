import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import GlowingButton from "./GlowingButton";

interface PermissionGateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel?: string;
  onRequestPermission: () => void;
  className?: string;
}

export default function PermissionGate({
  icon: Icon,
  title,
  description,
  buttonLabel = "繼續",
  onRequestPermission,
  className = "",
}: PermissionGateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl ${className}`}
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-brand-cyan/20 to-violet-500/20 border border-white/10 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        <Icon className="h-10 w-10 text-cyan-300" strokeWidth={1.5} />
      </div>
      
      <h3 className="mb-3 text-xl font-bold text-white tracking-tight">{title}</h3>
      <p className="mb-8 max-w-sm text-sm leading-relaxed text-white/60">
        {description}
      </p>

      <GlowingButton 
        onClick={onRequestPermission} 
        className="min-w-[180px]"
        loadingLabel="處理中..."
      >
        {buttonLabel}
      </GlowingButton>
    </motion.div>
  );
}
