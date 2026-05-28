import type { AuditIntelligenceResult } from "../Server/Services/auditPipelineTypes";

const STORAGE_KEY = "auditlens.latest-report";
export const AUDIT_REPORT_STORAGE_EVENT = "auditlens:latest-report-updated";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAuditIntelligenceResult(value: unknown): value is AuditIntelligenceResult {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.generatedAt !== "string") {
    return false;
  }

  if (!isRecord(value.request) || typeof value.request.url !== "string") {
    return false;
  }

  if (!isRecord(value.evidence)) {
    return false;
  }

  const deterministic = value.evidence.deterministic;
  const browser = value.evidence.browser;

  if (!isRecord(deterministic) || deterministic.stage !== "deterministic" || !Array.isArray(deterministic.notes) || !Array.isArray(deterministic.warnings)) {
    return false;
  }

  if (!isRecord(browser) || browser.stage !== "browser" || !Array.isArray(browser.observations) || !Array.isArray(browser.warnings)) {
    return false;
  }

  return true;
}

export function saveLatestAuditReport(value: unknown): AuditIntelligenceResult | null {
  if (typeof window === "undefined" || !isAuditIntelligenceResult(value)) {
    return null;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(AUDIT_REPORT_STORAGE_EVENT));

  return value;
}

export function loadLatestAuditReport(): AuditIntelligenceResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;
    return isAuditIntelligenceResult(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}