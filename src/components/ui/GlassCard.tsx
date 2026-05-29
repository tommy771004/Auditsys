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

const HOVER_SPRING = { type: "spring", stiffness: 260, damping: 22 };
const TAP_SPRING = { type: "spring", stiffness: 500, damping: 30 };

export default function GlassCard({ children, className, glow = "none", onClick, onKeyDown, ...props }: GlassCardProps) {
  const isInteractive = onClick !== undefined;
  
  return (
    <motion.div
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick(e as any);
        }
        if (onKeyDown) onKeyDown(e);
      }}
      whileHover={isInteractive ? {
        y: -6,
        scale: 1.015,
        boxShadow: "0 24px 60px -8px rgba(255,255,255,0.08), 0 8px 20px -4px rgba(255,255,255,0.04)",
        transition: HOVER_SPRING
      } : undefined}
      whileTap={isInteractive ? {
        scale: 0.97,
        y: -2,
        transition: TAP_SPRING
      } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "glass-panel relative overflow-hidden rounded-[24px] bg-white/[0.02] backdrop-blur-[40px] backdrop-saturate-[150%] ring-1 ring-white/10 shadow-2xl shadow-black/50 transition-all duration-300 outline-none",
        isInteractive ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950" : "",
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
