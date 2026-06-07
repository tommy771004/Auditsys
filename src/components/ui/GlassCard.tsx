import React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  glow?: "purple" | "cyan" | "blue" | "none";
}

export default function GlassCard({ children, className, glow = "none", ...props }: GlassCardProps) {
  const isInteractive = props.onClick !== undefined;

  return (
    <motion.div
      whileHover={isInteractive ? { y: -2, boxShadow: "0px 30px 60px rgba(0,0,0,0.5)" } : undefined}
      whileTap={isInteractive ? { y: 0, scale: 0.98, boxShadow: "0px 10px 20px rgba(0,0,0,0.4)" } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "relative rounded-sm bg-white/[0.02] text-[var(--text)] border border-[var(--border)] shadow-[var(--shadow)] backdrop-blur-[40px] backdrop-saturate-[150%] transition-colors duration-200 ease-out",
        "before:absolute before:inset-0 before:rounded-sm before:border before:border-white/10 before:[mask-image:linear-gradient(to_bottom,white,transparent)] before:pointer-events-none",
        isInteractive ? "cursor-pointer hover:bg-white/[0.05]" : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      <div className="relative z-20">
        {children}
      </div>
    </motion.div>
  );
}
