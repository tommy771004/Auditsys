import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface GlowingButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  loadingLabel: string;
  isLoading?: boolean;
  variant?: "primary" | "ghost";
}

export default function GlowingButton({
  children,
  className,
  disabled,
  isLoading = false,
  loadingLabel,
  type,
  variant = "primary",
  ...props
}: GlowingButtonProps) {
  const variantClassName =
    variant === "ghost"
      ? "border border-white/15 bg-white/[0.06] text-white/90 hover:bg-white/[0.12]"
      : "bg-brand-gradient text-brand-text shadow-[0_0_30px_rgba(139,92,246,0.35)] hover:shadow-[0_0_45px_rgba(6,182,212,0.3)]";

  return (
    <motion.button
      type={type ?? "button"}
      whileHover={{ y: -2, scale: variant === "ghost" ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 min-h-[44px] text-sm font-semibold transition duration-300 outline-none",
        "backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
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
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      <span>{isLoading ? loadingLabel : children}</span>
    </motion.button>
  );
}
