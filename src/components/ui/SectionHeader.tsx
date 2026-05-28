interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
}

export default function SectionHeader({ eyebrow, title, description, className, titleClassName, descriptionClassName }: SectionHeaderProps) {
  return (
    <div className={["space-y-4", className].filter(Boolean).join(" ")}>
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">{eyebrow}</p>
      <h2 className={["text-[28px] font-semibold leading-[1.2] tracking-[-0.03em] text-brand-text lg:text-[36px]", titleClassName].filter(Boolean).join(" ")}>{title}</h2>
      <p className={["text-base leading-8 text-brand-muted", descriptionClassName].filter(Boolean).join(" ")}>{description}</p>
    </div>
  );
}
