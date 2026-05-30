import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface GlassContainerProps extends HTMLMotionProps<"section"> {
  children: ReactNode;
  accent?: "violet" | "cyan" | "blue";
}

const accentClassNames: Record<NonNullable<GlassContainerProps["accent"]>, string> = {
  violet: "shadow-[0_24px_80px_rgba(76,29,149,0.28)]",
  cyan: "shadow-[0_24px_80px_rgba(8,145,178,0.24)]",
  blue: "shadow-[0_24px_80px_rgba(29,78,216,0.22)]",
};

export default function GlassContainer({ children, className, accent = "violet", ...props }: GlassContainerProps) {
  return (
    <motion.section
      layout
      className={[
        "relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/50 p-5 backdrop-blur-xl sm:p-8",
        "before:pointer-events-none before:absolute before:inset-x-10 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/65 before:to-transparent",
        accentClassNames[accent],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_48%)]" />
      <div className="relative">{children}</div>
    </motion.section>
  );
}
