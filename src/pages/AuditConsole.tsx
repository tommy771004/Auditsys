import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageContainer from "../components/layout/PageContainer";
import ConsoleTabs from "../components/ui/ConsoleTabs";
import AuditCharts from "../components/report/AuditCharts";
import AuditFindings from "../components/report/AuditFindings";
import AuditScoreBoard from "../components/report/AuditScoreBoard";
import { buildAuditReportViewModel } from "../services/auditReport";
import { useAuditAgent } from "../hooks/useAuditAgent";
import type { NavigateTo } from "../types/home";

interface AuditConsoleProps {
  onNavigate: NavigateTo;
}

const phaseTone = {
  idle: "text-brand-muted",
  running: "text-amber-800",
  complete: "text-teal-800",
  error: "text-rose-800",
} as const;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function formatDate(value: string, language: string): string {
  try {
    return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AuditConsole({ onNavigate }: AuditConsoleProps) {
  const { t, i18n } = useTranslation();
  const [urlInput, setUrlInput] = useState("");
  const [validationKey, setValidationKey] = useState<string | null>(null);
  const { phase, isRunning, latestAuditResult, errorKey, startAudit, reset } = useAuditAgent();
  const report = latestAuditResult ? buildAuditReportViewModel(latestAuditResult) : null;
  const harness = latestAuditResult?.harness;

  useEffect(() => {
    if (!localStorage.getItem("auth_token")) {
      onNavigate("login");
      return;
    }

    const intakeUrl = localStorage.getItem("intake_submitted_url");
    const intakeData = localStorage.getItem("intake_submitted_data");
    if (intakeUrl) {
      setUrlInput(intakeUrl);
      localStorage.removeItem("intake_submitted_url");
      localStorage.removeItem("intake_submitted_data");
      let parsedData: Record<string, unknown> | undefined;
      if (intakeData) {
        try {
          parsedData = JSON.parse(intakeData) as Record<string, unknown>;
        } catch {
          parsedData = undefined;
        }
      }
      void startAudit(intakeUrl, parsedData);
    }
  }, [onNavigate, startAudit]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedUrl = urlInput.trim();
    if (!normalizedUrl) {
      setValidationKey("validation.requiredUrl");
      return;
    }
    if (!isHttpUrl(normalizedUrl)) {
      setValidationKey("validation.invalidUrl");
      return;
    }
    setValidationKey(null);
    void startAudit(normalizedUrl);
  };

  const handleReset = () => {
    reset();
    setValidationKey(null);
  };

  return (
    <main className="pb-24 pt-28">
      <PageContainer>
        <ConsoleTabs currentRoute="console" onNavigate={onNavigate} />

        <div className="mx-auto max-w-5xl space-y-8">
          <header className="grid gap-6 border-b border-black/10 pb-8 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-teal-800">{t("auditConsole.real.badge")}</p>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-[var(--text)] sm:text-5xl">{t("auditConsole.real.title")}</h1>
              <p className="max-w-2xl text-base leading-7 text-brand-muted">{t("auditConsole.real.description")}</p>
            </div>
            <div className={`flex items-center gap-2 text-sm font-semibold ${phaseTone[phase]}`} aria-live="polite">
              {phase === "complete" ? <CheckCircle2 className="h-4 w-4" /> : phase === "error" ? <AlertTriangle className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              {t(`auditConsole.real.phase.${phase}`)}
            </div>
          </header>

          <form onSubmit={handleSubmit} className="grid gap-3 border-b border-black/10 pb-8 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label htmlFor="audit-console-url" className="mb-2 block text-sm font-medium text-[var(--text)]">{t("auditConsole.real.targetLabel")}</label>
              <input
                id="audit-console-url"
                value={urlInput}
                onChange={(event) => {
                  setUrlInput(event.target.value);
                  setValidationKey(null);
                }}
                placeholder={t("auditConsole.real.targetPlaceholder")}
                disabled={isRunning}
                className="min-h-12 w-full border-b-2 border-black/20 bg-transparent px-1 text-base text-[var(--text)] outline-none transition-colors placeholder:text-black/30 focus:border-teal-700"
              />
              {validationKey ? <p className="mt-2 text-sm text-rose-800">{t(validationKey)}</p> : null}
            </div>
            <button type="submit" disabled={isRunning} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60">
              <Search className="h-4 w-4" />
              {isRunning ? t("auditConsole.real.running") : t("auditConsole.real.submit")}
            </button>
          </form>

          {phase === "error" ? (
            <section className="border-l-4 border-rose-700 bg-rose-50 px-5 py-4" role="alert">
              <h2 className="font-semibold text-rose-900">{t("auditConsole.real.errorTitle")}</h2>
              <p className="mt-1 text-sm leading-6 text-rose-900/80">{t("auditConsole.real.errorDescription")}</p>
              <p className="mt-2 text-xs text-rose-900/70">{errorKey ? t(errorKey) : t("validation.submitFailed")}</p>
            </section>
          ) : null}

          {report ? (
            <section className="space-y-8" aria-labelledby="audit-console-result-title">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 id="audit-console-result-title" className="text-2xl font-semibold text-[var(--text)]">{t("auditConsole.real.resultTitle")}</h2>
                  <p className="mt-1 text-sm text-brand-muted">{formatDate(report.generatedAt, i18n.language)}</p>
                </div>
                <button type="button" onClick={handleReset} className="inline-flex min-h-10 items-center gap-2 rounded-sm px-3 text-sm font-semibold text-brand-muted transition-colors hover:bg-black/5 hover:text-[var(--text)]">
                  <RotateCcw className="h-4 w-4" />
                  {t("auditConsole.real.reset")}
                </button>
              </div>

              <dl className="grid gap-4 border-y border-black/10 py-5 sm:grid-cols-2 lg:grid-cols-4">
                <div><dt className="text-xs text-brand-muted">{t("auditConsole.real.target")}</dt><dd className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{report.target.host}</dd></div>
                <div><dt className="text-xs text-brand-muted">{t("auditConsole.real.provider")}</dt><dd className="mt-1 truncate text-sm font-semibold text-[var(--text)]">{report.provider}</dd></div>
                <div><dt className="text-xs text-brand-muted">{t("auditConsole.real.deterministic")}</dt><dd className="mt-1 text-sm font-semibold text-[var(--text)]">{report.evidence.deterministic.statusCode ?? "-"} · {report.evidence.deterministic.responseTimeMs ?? "-"} ms</dd></div>
                <div><dt className="text-xs text-brand-muted">{t("auditConsole.real.browser")}</dt><dd className="mt-1 text-sm font-semibold text-[var(--text)]">{report.evidence.browser.status} · {report.evidence.browser.mode}</dd></div>
              </dl>

              <AuditScoreBoard scores={report.scores} labels={{ overall: t("auditReport.scores.overall"), performance: t("auditReport.scores.performance"), seo: t("auditReport.scores.seo"), architecture: t("auditReport.scores.architecture") }} />
              <AuditCharts viewModel={report} t={t} />

              <section className="border-t border-black/10 pt-6">
                <h3 className="text-sm font-semibold text-[var(--text)]">{t("report.sections.actions")}</h3>
                <AuditFindings findings={report.findings} t={t} />
              </section>

              <section className="grid gap-6 border-t border-black/10 pt-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{t("auditConsole.real.summaryTitle")}</h3>
                  {report.summary ? <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-sm leading-6 text-brand-muted">{report.summary}</pre> : <p className="mt-3 text-sm leading-6 text-brand-muted">{t("auditConsole.real.summaryEmpty")}</p>}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{t("auditConsole.real.harnessTitle")}</h3>
                  {harness ? (
                    <div className="mt-3 space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><p className="text-xs text-brand-muted">{t("auditConsole.real.harnessStatus")}</p><p className="mt-1 font-semibold text-[var(--text)]">{harness.status}</p></div>
                        <div><p className="text-xs text-brand-muted">{t("auditConsole.real.harnessAttempts")}</p><p className="mt-1 font-semibold text-[var(--text)]">{harness.attempts.length}/{harness.governance.maxAttempts}</p></div>
                        <div><p className="text-xs text-brand-muted">{t("auditConsole.real.harnessPivots")}</p><p className="mt-1 font-semibold text-[var(--text)]">{harness.pivots.length}</p></div>
                        <div><p className="text-xs text-brand-muted">{t("auditConsole.real.harnessDuration")}</p><p className="mt-1 font-semibold text-[var(--text)]">{(harness.durationMs / 1000).toFixed(1)}s</p></div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-brand-muted">{t("auditConsole.real.harnessChecks")}</p>
                        <ul className="mt-2 space-y-2 text-sm text-brand-muted">
                          {harness.qualityGate.checks.slice(0, 5).map((check) => <li key={check.id} className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />{check.label}: {check.details}</li>)}
                        </ul>
                      </div>
                    </div>
                  ) : <p className="mt-3 text-sm leading-6 text-brand-muted">{t("auditConsole.real.noHarness")}</p>}
                </div>
              </section>
            </section>
          ) : phase === "idle" ? (
            <p className="border-y border-black/10 py-10 text-center text-sm text-brand-muted">{t("auditConsole.real.description")}</p>
          ) : null}
        </div>
      </PageContainer>
    </main>
  );
}
