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
      ? "border border-black bg-white text-black hover:bg-black hover:text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px]"
      : variant === "tertiary"
      ? "bg-transparent text-black border-b border-black rounded-none px-0 min-h-0 hover:border-b-2"
      : variant === "ghost"
      ? "bg-transparent text-black border border-transparent hover:border-black hover:bg-black hover:text-white rounded-sm drop-shadow-none"
      : "border border-black bg-black text-white hover:bg-white hover:text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none translate-y-0 hover:translate-y-[2px] hover:translate-x-[2px]";

  return (
    <motion.button
      type={type ?? "button"}
      whileTap={{ scale: variant === "tertiary" ? 1 : 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={[
        "relative inline-flex items-center justify-center gap-2 px-6 py-3 font-medium transition-all duration-200 outline-none ease-out",
        variant !== "tertiary" ? "rounded-sm min-h-[48px]" : "py-1 pb-1",
        "focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
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
