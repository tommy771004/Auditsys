export interface SlideMetric {
  label: string;
  value: string;
  unit?: string;
  comparison?: string;
}

export interface SlideChartData {
  name: string;
  [key: string]: any;
}

export interface AuditSlide {
  slideId: number;
  title: string;
  subtitle: string;
  healthStatus: "red" | "yellow" | "green";
  bullets: string[];
  explanations: string[];
  chartType: "conversion" | "cvw" | "backend" | "network" | "action";
  chartData: SlideChartData[];
  metrics: SlideMetric[];
  technicalInsight: string;
  businessTakeaway: string;
}

export interface PresentationMeasuredMetric {
  /** 75th-percentile field value: ms for LCP/INP, unitless for CLS. null = not measured. */
  p75: number | null;
  rating: "good" | "needs-improvement" | "poor" | null;
}

/**
 * Real measurements gathered server-side for the deck target (CrUX field data +
 * a deterministic HTTP probe). Lets the UI label which deck numbers are measured
 * vs. modeled/estimated, instead of presenting fabricated figures as fact.
 */
export interface PresentationMeasuredEvidence {
  /** "crux" = real-user CWV present; "modeled" = no field data, deck is estimated. */
  source: "crux" | "modeled";
  crux: {
    hasData: boolean;
    scope?: "url" | "origin";
    collectionPeriod?: string;
    lcp: PresentationMeasuredMetric;
    inp: PresentationMeasuredMetric;
    cls: PresentationMeasuredMetric;
  } | null;
  responseTimeMs?: number | null;
  server?: string | null;
  /** zh-TW human summary of the data basis, shown in the deck banner. */
  note: string;
}

export interface AuditPresentationResult {
  url: string;
  techStack: string;
  knownIssues: string;
  generatedAt: string;
  overallScore: number;
  slides: AuditSlide[];
  modelUsed?: string;
  measuredEvidence?: PresentationMeasuredEvidence;
}
