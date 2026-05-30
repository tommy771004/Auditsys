import type { HTMLAttributes } from "react";
import type { LucideIcon } from "lucide-react";

export type StatusBadgeStatus = "success" | "error" | "default";

interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: StatusBadgeStatus;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  leftLabel: string;
  rightLabel: string;
}

/**
 * Split status pill: emphasised left segment (label + status-coloured icon),
 * divider, muted right segment. Adapted to the Liquid Glass design tokens
 * (brand-text / brand-muted / semantic-success / brand-danger) — no tremor/shadcn
 * tokens, no cva, no extra deps.
 */
export function StatusBadge({
  className,
  status = "default",
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  leftLabel,
  rightLabel,
  ...props
}: StatusBadgeProps) {
  const leftIconClassName =
    status === "success"
      ? "text-semantic-success"
      : status === "error"
        ? "text-brand-danger"
        : "text-brand-muted";

  return (
    <span
      className={[
        "inline-flex items-center gap-x-2.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs backdrop-blur-xl",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span className="inline-flex items-center gap-1.5 font-medium text-brand-text">
        {LeftIcon ? (
          <LeftIcon
            className={["-ml-0.5 size-4 shrink-0", leftIconClassName].join(" ")}
            aria-hidden={true}
          />
        ) : null}
        {leftLabel}
      </span>
      <span className="h-4 w-px bg-white/15" />
      <span className="inline-flex items-center gap-1.5 text-brand-muted">
        {RightIcon ? (
          <RightIcon className="-ml-0.5 size-4 shrink-0" aria-hidden={true} />
        ) : null}
        {rightLabel}
      </span>
    </span>
  );
}

export default StatusBadge;
