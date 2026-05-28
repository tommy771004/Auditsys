export interface WebwrightTaskArtifact {
  id?: string;
  instruction?: string;
  startUrl?: string;
}

export interface WebwrightReportSection {
  id?: string;
  title?: string;
  summary?: string;
  steps: string[];
}

export interface WebwrightReportSource {
  url?: string;
  title?: string;
  screenshotPath?: string;
  notes: string[];
}

export interface WebwrightReportArtifact {
  generatedAt?: string;
  sections: WebwrightReportSection[];
  sources: WebwrightReportSource[];
}

export interface WebwrightTrajectoryStep {
  action?: string;
  target?: string;
  url?: string;
  status?: string;
}

export interface WebwrightTrajectoryArtifact {
  steps: WebwrightTrajectoryStep[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function getArrayCandidate(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

export function parseWebwrightTaskArtifact(value: unknown): WebwrightTaskArtifact | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = asTrimmedString(value.id) ?? asTrimmedString(value.task_id) ?? asTrimmedString(value.taskId);
  const instruction = asTrimmedString(value.instruction) ?? asTrimmedString(value.task) ?? asTrimmedString(value.prompt) ?? asTrimmedString(value.title);
  const startUrl = asTrimmedString(value.start_url) ?? asTrimmedString(value.startUrl) ?? asTrimmedString(value.url);

  if (!id && !instruction && !startUrl) {
    return null;
  }

  return {
    id,
    instruction,
    startUrl,
  };
}

export function parseWebwrightReportArtifact(value: unknown): WebwrightReportArtifact | null {
  if (!isRecord(value)) {
    return null;
  }

  const sections = getArrayCandidate(value, ["sections", "result_sections", "results", "items"])
    .filter((section): section is Record<string, unknown> => isRecord(section))
    .map((section) => ({
      id: asTrimmedString(section.id) ?? asTrimmedString(section.key),
      title: asTrimmedString(section.title) ?? asTrimmedString(section.heading) ?? asTrimmedString(section.label),
      summary: asTrimmedString(section.summary) ?? asTrimmedString(section.description) ?? asTrimmedString(section.result) ?? asTrimmedString(section.text),
      steps: toStringArray(section.steps),
    }));

  const sources = getArrayCandidate(value, ["sources", "pages"])
    .filter((source): source is Record<string, unknown> => isRecord(source))
    .map((source) => ({
      url: asTrimmedString(source.url) ?? asTrimmedString(source.href),
      title: asTrimmedString(source.title) ?? asTrimmedString(source.label) ?? asTrimmedString(source.name),
      screenshotPath: asTrimmedString(source.screenshot) ?? asTrimmedString(source.screenshot_path),
      notes: toStringArray(source.notes),
    }));

  const generatedAt = asTrimmedString(value.generated_at) ?? asTrimmedString(value.generatedAt);

  if (!generatedAt && sections.length === 0 && sources.length === 0) {
    return null;
  }

  return {
    generatedAt,
    sections,
    sources,
  };
}

export function parseWebwrightTrajectoryArtifact(value: unknown): WebwrightTrajectoryArtifact | null {
  if (!isRecord(value)) {
    return null;
  }

  const steps = getArrayCandidate(value, ["steps", "events", "timeline"])
    .filter((step): step is Record<string, unknown> => isRecord(step))
    .map((step) => ({
      action: asTrimmedString(step.action) ?? asTrimmedString(step.type) ?? asTrimmedString(step.name),
      target: asTrimmedString(step.target) ?? asTrimmedString(step.selector),
      url: asTrimmedString(step.url) ?? asTrimmedString(step.href),
      status: asTrimmedString(step.status) ?? asTrimmedString(step.result),
    }));

  if (steps.length === 0) {
    return null;
  }

  return {
    steps,
  };
}