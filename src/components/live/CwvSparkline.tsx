interface CwvSparklineProps {
  /** p75 series, oldest → newest. Nulls (gaps) are dropped. */
  values: (number | null)[];
  /** Tailwind stroke colour class, e.g. "stroke-emerald-400". */
  strokeClass: string;
}

const WIDTH = 100;
const HEIGHT = 28;

/**
 * Dependency-free inline SVG sparkline for a Core Web Vital's history series.
 * Normalises to the series min/max so the shape is visible regardless of scale.
 */
export default function CwvSparkline({ values, strokeClass }: CwvSparklineProps) {
  const points = values.filter((value): value is number => typeof value === "number");

  if (points.length < 2) {
    return null;
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * WIDTH;
    // Invert Y so higher values sit higher; pad 3px top/bottom.
    const y = HEIGHT - 3 - ((value - min) / span) * (HEIGHT - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      role="img"
      aria-hidden="true"
    >
      <polyline
        points={coords.join(" ")}
        className={`fill-none ${strokeClass}`}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
