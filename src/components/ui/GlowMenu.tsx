import * as React from "react";
import { motion, type Variants, type Transition, type HTMLMotionProps } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// Local class joiner — project convention (no cn/@/lib/utils, no clsx).
const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export interface GlowMenuItem {
  icon: LucideIcon | React.FC<{ className?: string }>;
  label: string;
  href?: string;
  /** CSS radial-gradient string used for the active/hover glow. */
  gradient: string;
  /** Tailwind text-color class for the active icon (use 400-level for the dark theme). */
  iconColor: string;
}

interface MenuBarProps extends HTMLMotionProps<"nav"> {
  items: GlowMenuItem[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
}

const itemVariants: Variants = {
  initial: { rotateX: 0, opacity: 1 },
  hover: { rotateX: -90, opacity: 0 },
};

const backVariants: Variants = {
  initial: { rotateX: 90, opacity: 0 },
  hover: { rotateX: 0, opacity: 1 },
};

const glowVariants: Variants = {
  initial: { opacity: 0, scale: 0.8 },
  hover: {
    opacity: 1,
    scale: 2,
    transition: {
      opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
      scale: { duration: 0.5, type: "spring", stiffness: 300, damping: 25 },
    },
  },
};

const navGlowVariants: Variants = {
  initial: { opacity: 0 },
  hover: { opacity: 1, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } },
};

const sharedTransition: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  duration: 0.5,
};

// Always-dark Liquid Glass theme — no next-themes. Radial nav glow inline
// (Tailwind has no built-in `bg-gradient-radial` utility in v3).
const NAV_GLOW =
  "radial-gradient(circle, transparent 0%, rgba(96,165,250,0.30) 30%, rgba(192,132,252,0.30) 60%, rgba(248,113,113,0.30) 90%, transparent 100%)";

export const MenuBar = React.forwardRef<HTMLElement, MenuBarProps>(
  ({ className, items, activeItem, onItemClick, ...props }, ref) => {
    return (
      <motion.nav
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/70 to-slate-950/30 p-1.5 backdrop-blur-lg",
          className,
        )}
        initial="initial"
        whileHover="hover"
        {...props}
      >
        <motion.div
          className="pointer-events-none absolute -inset-2 z-0 rounded-3xl"
          style={{ background: NAV_GLOW }}
          variants={navGlowVariants}
        />
        <ul className="relative z-10 flex items-center gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeItem;

            return (
              <motion.li key={item.label} className="relative">
                <button
                  type="button"
                  onClick={() => onItemClick?.(item.label)}
                  className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60 rounded-xl"
                >
                  <motion.div
                    className="group relative block overflow-visible rounded-xl"
                    style={{ perspective: "600px" }}
                    whileHover="hover"
                    initial="initial"
                  >
                    <motion.div
                      className="pointer-events-none absolute inset-0 z-0"
                      variants={glowVariants}
                      animate={isActive ? "hover" : "initial"}
                      style={{ background: item.gradient, opacity: isActive ? 1 : 0, borderRadius: "16px" }}
                    />
                    <motion.div
                      className={cn(
                        "relative z-10 flex items-center gap-2 rounded-xl bg-transparent px-4 py-2 text-sm font-medium transition-colors",
                        isActive ? "text-white" : "text-brand-muted group-hover:text-white",
                      )}
                      variants={itemVariants}
                      transition={sharedTransition}
                      style={{ transformStyle: "preserve-3d", transformOrigin: "center bottom" }}
                    >
                      <span className={cn("transition-colors duration-300", isActive ? item.iconColor : "text-white")}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>{item.label}</span>
                    </motion.div>
                    <motion.div
                      className={cn(
                        "absolute inset-0 z-10 flex items-center gap-2 rounded-xl bg-transparent px-4 py-2 text-sm font-medium transition-colors",
                        isActive ? "text-white" : "text-brand-muted group-hover:text-white",
                      )}
                      variants={backVariants}
                      transition={sharedTransition}
                      style={{ transformStyle: "preserve-3d", transformOrigin: "center top", rotateX: 90 }}
                    >
                      <span className={cn("transition-colors duration-300", isActive ? item.iconColor : "text-white")}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>{item.label}</span>
                    </motion.div>
                  </motion.div>
                </button>
              </motion.li>
            );
          })}
        </ul>
      </motion.nav>
    );
  },
);

MenuBar.displayName = "MenuBar";

export default MenuBar;
