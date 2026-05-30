import { useTranslation } from "react-i18next";

interface Logo {
  id: string;
  description: string;
  image: string;
  className?: string;
}

interface Logos3Props {
  heading?: string;
  logos?: Logo[];
  className?: string;
}

// Honest framing: these are web stacks AuditLens analyses — NOT "trusted by"
// customer endorsements. Monochrome wordmarks, forced white for the dark theme.
const DEFAULT_LOGOS: Logo[] = [
  {
    id: "nextjs",
    description: "Next.js",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/nextjs-wordmark.svg",
    className: "h-6 w-auto",
  },
  {
    id: "react",
    description: "React",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/react-wordmark.svg",
    className: "h-6 w-auto",
  },
  {
    id: "astro",
    description: "Astro",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/astro-wordmark.svg",
    className: "h-6 w-auto",
  },
  {
    id: "tailwind",
    description: "Tailwind CSS",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/tailwind-wordmark.svg",
    className: "h-4 w-auto",
  },
  {
    id: "vercel",
    description: "Vercel",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/vercel-wordmark.svg",
    className: "h-6 w-auto",
  },
  {
    id: "supabase",
    description: "Supabase",
    image: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/supabase-wordmark.svg",
    className: "h-6 w-auto",
  },
];

/**
 * Auto-scrolling logo marquee. Pure CSS (Tailwind `animate-marquee` keyframe) —
 * no embla / carousel deps. The list is rendered twice so the -50% keyframe loops
 * seamlessly; the duplicate half is aria-hidden. Pauses on hover. Edge fades use
 * the real page background (`--bg`).
 */
export function Logos3({ heading, logos = DEFAULT_LOGOS, className }: Logos3Props) {
  const { t } = useTranslation();
  const resolvedHeading = heading ?? t("auditStacks.heading");
  const loop = [...logos, ...logos];

  return (
    <section className={["w-full", className].filter(Boolean).join(" ")}>
      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">{resolvedHeading}</p>
      </div>

      <div className="group relative mx-auto mt-8 flex max-w-6xl items-center overflow-hidden">
        <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused] motion-reduce:animate-none">
          {loop.map((logo, index) => (
            <div key={`${logo.id}-${index}`} className="mx-10 flex shrink-0 items-center justify-center">
              <img
                src={logo.image}
                alt={index < logos.length ? logo.description : ""}
                aria-hidden={index >= logos.length}
                loading="lazy"
                className={[
                  logo.className ?? "h-6 w-auto",
                  "opacity-60 brightness-0 invert transition duration-300 hover:opacity-100",
                ].join(" ")}
              />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--bg)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--bg)] to-transparent" />
      </div>
    </section>
  );
}

export default Logos3;
