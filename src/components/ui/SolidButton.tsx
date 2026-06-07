import React from "react";
import { Loader2 } from "lucide-react";
import { motion, type HTMLMotionProps } from "framer-motion";

interface SolidButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  loadingLabel: string;
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
}

export default function SolidButton({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel,
  type,
  variant = "primary",
  ...props
}: SolidButtonProps) {
  const variantClassName =
    variant === "secondary"
      ? "border border-white/10 bg-white/5 text-[var(--text)] hover:bg-white/10 shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
      : variant === "tertiary"
      ? "bg-transparent text-[var(--text)] border-b border-[var(--border)] rounded-none px-0 min-h-0 hover:border-b-2"
      : variant === "ghost"
      ? "bg-transparent text-[var(--text)] border border-transparent hover:border-white/10 hover:bg-white/5 rounded-sm"
      : "border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20 shadow-[0_0_15px_rgba(58,214,195,0.15)] hover:shadow-[0_0_25px_rgba(58,214,195,0.3)]";

  return (
    <motion.button
      type={type ?? "button"}
      whileTap={{ scale: variant === "tertiary" ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "relative inline-flex items-center justify-center gap-2 px-6 py-3 font-medium transition-all duration-200 outline-none ease-out backdrop-blur-md",
        variant !== "tertiary" ? "rounded-sm min-h-[48px]" : "py-1 pb-1",
        "focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
        variantClassName,
        isLoading || disabled ? "cursor-not-allowed opacity-70" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin -ml-1" /> : null}
      <span className="relative z-10">{isLoading ? loadingLabel : children}</span>
    </motion.button>
  );
}
