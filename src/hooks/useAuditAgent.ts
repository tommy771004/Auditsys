import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AuditIntelligenceResult } from "../shared/types/auditPipelineTypes";
import { postAuditRequest } from "../services/auditApi";
import { saveLatestAuditReport } from "../services/auditReportStore";

export type AuditConsolePhase = "idle" | "running" | "complete" | "error";

export interface UseAuditAgentResult {
  phase: AuditConsolePhase;
  targetUrl: string;
  isRunning: boolean;
  latestAuditResult: AuditIntelligenceResult | null;
  errorKey: string | null;
  startAudit: (url: string, intakeData?: Record<string, unknown>) => Promise<void>;
  reset: () => void;
}

export function useAuditAgent(): UseAuditAgentResult {
  const { i18n } = useTranslation();
  const [phase, setPhase] = useState<AuditConsolePhase>("idle");
  const [targetUrl, setTargetUrl] = useState("");
  const [latestAuditResult, setLatestAuditResult] = useState<AuditIntelligenceResult | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const runTokenRef = useRef(0);

  const reset = useCallback(() => {
    runTokenRef.current += 1;
    setPhase("idle");
    setTargetUrl("");
    setLatestAuditResult(null);
    setErrorKey(null);
  }, []);

  const startAudit = useCallback(async (url: string, intakeData?: Record<string, unknown>) => {
    const normalizedUrl = url.trim();
    const token = runTokenRef.current + 1;
    runTokenRef.current = token;
    setTargetUrl(normalizedUrl);
    setLatestAuditResult(null);
    setErrorKey(null);
    setPhase("running");

    try {
      const language = i18n.resolvedLanguage || i18n.language;
      const responseData = await postAuditRequest({
        endpoint: intakeData ? import.meta.env.VITE_INTAKE_ENDPOINT : import.meta.env.VITE_AUDIT_ENDPOINT,
        defaultEndpoint: intakeData ? "/api/intake" : "/api/audit",
        payload: { ...(intakeData ?? {}), url: normalizedUrl, language },
      });

      if (token !== runTokenRef.current) return;

      const savedReport = saveLatestAuditReport(responseData);
      if (!savedReport) {
        throw new Error("invalid_report_response");
      }

      setLatestAuditResult(savedReport);
      setPhase("complete");
    } catch (error) {
      if (token !== runTokenRef.current) return;
      setErrorKey(error instanceof Error && error.message === "unauthorized" ? "validation.unauthorized" : "validation.serverError");
      setPhase("error");
    }
  }, [i18n]);

  useEffect(() => () => {
    runTokenRef.current += 1;
  }, []);

  return { phase, targetUrl, isRunning: phase === "running", latestAuditResult, errorKey, startAudit, reset };
}
