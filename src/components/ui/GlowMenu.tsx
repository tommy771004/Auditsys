import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import type { LucideIcon } from "lucide-react";

// Local class joiner — project convention (no cn/@/lib/utils, no clsx).
const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

export interface GlowMenuItem {
  icon: LucideIcon | React.FC<{ className?: string }>;
  label: string;
  href?: string;
  gradient: string;
  iconColor: string;
}

interface MenuBarProps extends HTMLMotionProps<"nav"> {
  items: GlowMenuItem[];
  activeItem?: string;
  onItemClick?: (label: string) => void;
}

export const MenuBar = React.forwardRef<HTMLElement, MenuBarProps>(
  ({ className, items, activeItem, onItemClick, ...props }, ref) => {
    return (
      <motion.nav
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-sm border border-black bg-white p-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
          className,
        )}
        {...props}
      >
        <ul className="relative z-10 flex items-center gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.label === activeItem;

            return (
              <li key={item.label} className="relative">
                <button
                  type="button"
                  onClick={() => onItemClick?.(item.label)}
                  className={cn(
                    "flex items-center gap-2 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-sm px-4 py-2 text-sm font-bold transition-all duration-200 ease-out",
                    isActive ? "bg-black text-white" : "text-black hover:bg-black hover:text-white"
                  )}
                >
                  <span className="transition-colors duration-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </motion.nav>
    );
  },
);

MenuBar.displayName = "MenuBar";

export default MenuBar;

