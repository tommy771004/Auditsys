import type { HTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  glow?: "purple" | "cyan" | "blue" | "none";
}

const glowClasses: Record<NonNullable<GlassCardProps["glow"]>, string> = {
  purple: "shadow-violet",
  cyan: "shadow-cyan",
  blue: "shadow-[0_0_40px_rgba(29,78,216,0.22)]",
  none: "",
};

export default function GlassCard({ children, className, glow = "none", ...props }: GlassCardProps) {
  const isInteractive = props.onClick !== undefined;
  
  return (
    <motion.div
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "glass-panel relative overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-[40px] backdrop-saturate-[150%] ring-1 ring-white/10 shadow-2xl shadow-black/50 transition-all duration-300",
        glowClasses[glow],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[24px] border border-white/10 [mask-image:linear-gradient(to_bottom,white,transparent)]" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />
      {children}
    </motion.div>
  );
}
