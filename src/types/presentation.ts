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

export interface AuditPresentationResult {
  url: string;
  techStack: string;
  knownIssues: string;
  generatedAt: string;
  overallScore: number;
  slides: AuditSlide[];
  modelUsed?: string;
}
