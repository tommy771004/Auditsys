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
      whileHover={isInteractive ? { y: -2, x: -2, boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)" } : undefined}
      whileTap={isInteractive ? { y: 0, x: 0, boxShadow: "0px 0px 0px 0px rgba(0,0,0,1)" } : undefined}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={[
        "relative rounded-sm bg-white text-black border border-black shadow-[4px_4px_0_rgba(0,0,0,1)] transition-all duration-200 ease-out",
        isInteractive ? "hover:bg-black hover:text-white" : "",
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
