import type { AuditScores } from "../../shared/auditScores";

interface AuditScoreBoardProps {
  scores: AuditScores;
  labels: Record<keyof AuditScores, string>;
}

function scoreTone(value: number): { stroke: string; text: string } {
  if (value >= 90) return { stroke: "#0f766e", text: "text-teal-800" };
  if (value >= 50) return { stroke: "#a16207", text: "text-amber-800" };
  return { stroke: "#be123c", text: "text-rose-800" };
}

function Score({ value, label }: { value: number; label: string }) {
  const radius = 31;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(value);
  const offset = circumference * (1 - Math.max(0, Math.min(100, value)) / 100);

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="relative h-20 w-20">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="currentColor" className="text-black/10" strokeWidth="5" />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={tone.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-semibold ${tone.text}`}>{value}</span>
      </div>
      <span className="text-xs font-medium text-brand-muted">{label}</span>
    </div>
  );
}

export default function AuditScoreBoard({ scores, labels }: AuditScoreBoardProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4" aria-label="Audit scores">
      <Score value={scores.overall} label={labels.overall} />
      <Score value={scores.performance} label={labels.performance} />
      <Score value={scores.seo} label={labels.seo} />
      <Score value={scores.architecture} label={labels.architecture} />
    </div>
  );
}
