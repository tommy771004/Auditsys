import type { ReactNode } from "react";

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: ReactNode;
}

export default function PageIntro({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  titleClassName,
  descriptionClassName,
  children,
}: PageIntroProps) {
  const alignmentClassName = align === "center" ? "text-center" : "text-left";

  return (
    <div className={["space-y-5", alignmentClassName, className].filter(Boolean).join(" ")}>
      <p className="inline-flex rounded-full border border-[var(--border)] bg-black/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan backdrop-blur-xl">
        {eyebrow}
      </p>
      <div className="space-y-6">
        <h1 className={["text-[44px] font-bold leading-[1.05] tracking-tight text-[var(--text)] lg:text-[64px] font-grotesk drop-shadow-xl", titleClassName].filter(Boolean).join(" ")}>
          {title}
        </h1>
        <p className={["text-lg leading-relaxed text-brand-muted/90 font-medium sm:text-xl", descriptionClassName].filter(Boolean).join(" ")}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
