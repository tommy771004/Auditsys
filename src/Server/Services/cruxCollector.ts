import type { CruxHistorySeries, CruxMetric, CruxRating, CruxResult } from "../../types/liveAudit.types";

const CRUX_RECORD_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const CRUX_HISTORY_ENDPOINT = "https://chromeuxreport.googleapis.com/v1/records:queryHistoryRecord";

// CrUX metric keys → our short ids.
const METRIC_KEYS = {
  largest_contentful_paint: "lcp",
  interaction_to_next_paint: "inp",
  cumulative_layout_shift: "cls",
  first_contentful_paint: "fcp",
} as const;

const REQUESTED_METRICS = Object.keys(METRIC_KEYS);

// "Good" upper bound and "poor" lower bound per metric (ms, except CLS unitless).
const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  lcp: { good: 2500, poor: 4000 },
  inp: { good: 200, poor: 500 },
  cls: { good: 0.1, poor: 0.25 },
  fcp: { good: 1800, poor: 3000 },
};

function emptyResult(reason: string): CruxResult {
  const emptyMetric: CruxMetric = { p75: null, rating: null };
  const emptyHistory: CruxHistorySeries = { p75s: [] };
  return {
    hasData: false,
    reason,
    metrics: { lcp: { ...emptyMetric }, inp: { ...emptyMetric }, cls: { ...emptyMetric }, fcp: { ...emptyMetric } },
    history: { lcp: { ...emptyHistory }, inp: { ...emptyHistory }, cls: { ...emptyHistory } },
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function rateMetric(metricId: string, p75: number | null): CruxRating | null {
  if (p75 === null) {
    return null;
  }
  const threshold = THRESHOLDS[metricId];
  if (!threshold) {
    return null;
  }
  if (p75 <= threshold.good) {
    return "good";
  }
  if (p75 > threshold.poor) {
    return "poor";
  }
  return "needs-improvement";
}

function parseDistribution(histogram: unknown): [number, number, number] | undefined {
  if (!Array.isArray(histogram) || histogram.length < 3) {
    return undefined;
  }
  const densities = histogram.slice(0, 3).map((bin) => toNumber((bin as { density?: unknown })?.density) ?? 0);
  return [densities[0], densities[1], densities[2]];
}

function parseMetric(metricId: string, metricRecord: unknown): CruxMetric {
  const record = metricRecord as { percentiles?: { p75?: unknown }; histogram?: unknown } | undefined;
  const p75 = toNumber(record?.percentiles?.p75);
  return {
    p75,
    rating: rateMetric(metricId, p75),
    distribution: parseDistribution(record?.histogram),
  };
}

function formatCollectionPeriod(record: unknown): string | undefined {
  const period = (record as { collectionPeriod?: { firstDate?: any; lastDate?: any } })?.collectionPeriod;
  const toIso = (date: any): string | undefined =>
    date && typeof date.year === "number"
      ? `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
      : undefined;
  const first = toIso(period?.firstDate);
  const last = toIso(period?.lastDate);
  return first && last ? `${first} → ${last}` : last ?? first;
}

async function postCrux(endpoint: string, body: Record<string, unknown>, apiKey: string): Promise<{ status: number; json: any }> {
  const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

function parseHistorySeries(metricRecord: unknown): CruxHistorySeries {
  const p75s = (metricRecord as { percentilesTimeseries?: { p75s?: unknown[] } })?.percentilesTimeseries?.p75s;
  if (!Array.isArray(p75s)) {
    return { p75s: [] };
  }
  return { p75s: p75s.map((value) => toNumber(value)) };
}

/**
 * Fetches real-user Core Web Vitals + 6-month history from the Chrome UX Report.
 * Tries page-level (`url`) data first, then falls back to site-wide (`origin`)
 * which has far better coverage. Returns `hasData: false` (never throws) when the
 * key is missing or CrUX has no field data for the target.
 */
export async function fetchCruxReport(targetUrl: string): Promise<CruxResult> {
  const apiKey = process.env.CRUX_API_KEY?.trim();
  if (!apiKey) {
    return emptyResult("crux_not_configured");
  }

  let origin: string;
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return emptyResult("invalid_url");
    }
    origin = parsed.origin;
  } catch {
    return emptyResult("invalid_url");
  }

  try {
    // Page-level first, then origin-level.
    const scopes: Array<{ scope: "url" | "origin"; key: "url" | "origin"; value: string }> = [
      { scope: "url", key: "url", value: targetUrl },
      { scope: "origin", key: "origin", value: origin },
    ];

    for (const { scope, key, value } of scopes) {
      const current = await postCrux(CRUX_RECORD_ENDPOINT, { [key]: value, metrics: REQUESTED_METRICS }, apiKey);

      if (current.status === 404) {
        continue; // No field data at this scope — try the next.
      }
      if (current.status !== 200) {
        return emptyResult("error");
      }

      const record = current.json?.record;
      const metricsRecord = record?.metrics ?? {};

      const metrics = {
        lcp: parseMetric("lcp", metricsRecord.largest_contentful_paint),
        inp: parseMetric("inp", metricsRecord.interaction_to_next_paint),
        cls: parseMetric("cls", metricsRecord.cumulative_layout_shift),
        fcp: parseMetric("fcp", metricsRecord.first_contentful_paint),
      };

      // History is best-effort; an empty series is fine.
      let history: CruxResult["history"] = {
        lcp: { p75s: [] },
        inp: { p75s: [] },
        cls: { p75s: [] },
      };
      try {
        const historyResponse = await postCrux(CRUX_HISTORY_ENDPOINT, { [key]: value, metrics: REQUESTED_METRICS }, apiKey);
        if (historyResponse.status === 200) {
          const historyMetrics = historyResponse.json?.record?.metrics ?? {};
          history = {
            lcp: parseHistorySeries(historyMetrics.largest_contentful_paint),
            inp: parseHistorySeries(historyMetrics.interaction_to_next_paint),
            cls: parseHistorySeries(historyMetrics.cumulative_layout_shift),
          };
        }
      } catch {
        // keep empty history
      }

      return {
        hasData: true,
        scope,
        collectionPeriod: formatCollectionPeriod(record),
        metrics,
        history,
      };
    }

    return emptyResult("no_field_data");
  } catch {
    return emptyResult("error");
  }
}
