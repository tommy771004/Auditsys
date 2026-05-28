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
      <p className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan backdrop-blur-xl">
        {eyebrow}
      </p>
      <div className="space-y-4">
        <h1 className={["text-[40px] font-semibold leading-[1.1] tracking-[-0.04em] text-brand-text lg:text-[56px]", titleClassName].filter(Boolean).join(" ")}>
          {title}
        </h1>
        <p className={["text-base leading-8 text-brand-muted sm:text-lg", descriptionClassName].filter(Boolean).join(" ")}>
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}
