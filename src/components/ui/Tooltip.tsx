import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  content: string;
  children?: ReactNode;
  showIcon?: boolean;
}

export default function Tooltip({ content, children, showIcon = true }: TooltipProps) {
  return (
    <div className="group relative inline-flex items-center gap-1.5 cursor-help w-full h-full">
      {children}
      {showIcon && <HelpCircle className="h-3.5 w-3.5 text-brand-muted transition-colors group-hover:text-brand-cyan" />}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 w-max max-w-xs opacity-0 transition-all duration-200 group-hover:opacity-100 group-hover:-translate-y-1">
        <div className="rounded-sm border border-black bg-neutral-100/90 px-3 py-2 text-xs text-brand-text shadow-xl backdrop-blur-xl text-left font-sans">
          {content}
        </div>
      </div>
    </div>
  );
}
