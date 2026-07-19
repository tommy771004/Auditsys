import type { TFunction } from "i18next";
import type { AuditReportViewModel } from "../../services/auditReport";

interface AuditChartsProps {
  viewModel: AuditReportViewModel;
  t: TFunction;
}

const scoreLabelKeys = {
  overall: "auditReport.scores.overall",
  performance: "auditReport.scores.performance",
  seo: "auditReport.scores.seo",
  architecture: "auditReport.scores.architecture",
} as const;

const assetLabelKeys = {
  scripts: "auditReport.assets.scripts",
  stylesheets: "auditReport.assets.stylesheets",
  images: "auditReport.assets.images",
  imagesMissingAlt: "auditReport.assets.imagesMissingAlt",
} as const;

export default function AuditCharts({ viewModel, t }: AuditChartsProps) {
  const maxAssetValue = Math.max(1, ...viewModel.charts.assets.map((item) => item.value));

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section aria-labelledby="audit-score-chart-title">
        <h3 id="audit-score-chart-title" className="text-sm font-semibold text-[var(--text)]">{t("auditReport.charts.scoreTitle")}</h3>
        <div className="mt-4 space-y-3">
          {viewModel.charts.scores.map((item) => (
            <div key={item.id}>
              <div className="mb-1 flex items-center justify-between gap-4 text-xs text-brand-muted">
                <span>{t(scoreLabelKeys[item.id])}</span>
                <span className="font-semibold text-[var(--text)]">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-black/10" role="meter" aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={100} aria-label={t(scoreLabelKeys[item.id])}>
                <div className="h-full rounded-full bg-teal-700" style={{ width: `${item.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="audit-assets-chart-title">
        <h3 id="audit-assets-chart-title" className="text-sm font-semibold text-[var(--text)]">{t("auditReport.charts.assetsTitle")}</h3>
        <div className="mt-4 space-y-3">
          {viewModel.charts.assets.map((item) => (
            <div key={item.id} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-3 text-xs">
              <span className="truncate text-brand-muted">{t(assetLabelKeys[item.id])}</span>
              <div className="h-2 rounded-full bg-black/10">
                <div className="h-full rounded-full bg-slate-700" style={{ width: `${(item.value / maxAssetValue) * 100}%` }} />
              </div>
              <span className="text-right font-semibold text-[var(--text)]">{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      {viewModel.charts.routes.length > 0 ? (
        <section className="lg:col-span-2" aria-labelledby="audit-route-chart-title">
          <h3 id="audit-route-chart-title" className="text-sm font-semibold text-[var(--text)]">{t("auditReport.charts.routesTitle")}</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="text-xs text-brand-muted">
                <tr>
                  <th className="pb-2 pr-4 font-medium">{t("auditReport.charts.route")}</th>
                  <th className="pb-2 pr-4 font-medium">{t("auditReport.charts.status")}</th>
                  <th className="pb-2 font-medium">{t("auditReport.charts.responseTime")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {viewModel.charts.routes.map((route) => (
                  <tr key={route.url}>
                    <td className="max-w-[24rem] truncate py-2 pr-4 text-[var(--text)]">{route.url}</td>
                    <td className={route.ok ? "py-2 pr-4 text-teal-800" : "py-2 pr-4 text-rose-800"}>{route.status ?? "-"}</td>
                    <td className="py-2 text-brand-muted">{route.responseTimeMs === null ? "-" : `${route.responseTimeMs} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
