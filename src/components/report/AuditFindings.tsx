import type { TFunction } from "i18next";
import type { AuditReportFinding } from "../../services/auditReport";

interface AuditFindingsProps {
  findings: AuditReportFinding[];
  t: TFunction;
  emptyLabel?: string;
}

const severityLabelKey = {
  high: "auditReport.severity.high",
  medium: "auditReport.severity.medium",
  low: "auditReport.severity.low",
} as const;

export default function AuditFindings({ findings, t, emptyLabel }: AuditFindingsProps) {
  if (findings.length === 0) {
    return <p className="text-sm text-brand-muted">{emptyLabel ?? t("auditReport.findings.empty")}</p>;
  }

  return (
    <div className="divide-y divide-black/10">
      {findings.map((finding) => (
        <article key={finding.id} className="grid gap-2 py-4 sm:grid-cols-[8rem_1fr] sm:gap-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted">
            {t(severityLabelKey[finding.severity])}
          </p>
          <div>
            <h3 className="font-semibold text-[var(--text)]">{t(finding.titleKey, { value: finding.value, defaultValue: finding.id })}</h3>
            <p className="mt-1 text-sm leading-6 text-brand-muted">{t(finding.detailKey, { value: finding.value, defaultValue: "" })}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
