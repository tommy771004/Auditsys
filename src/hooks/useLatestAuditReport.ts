import { useEffect, useState } from "react";
import type { AuditIntelligenceResult } from "../Server/Services/auditPipelineTypes";
import { AUDIT_REPORT_STORAGE_EVENT, loadLatestAuditReport } from "../services/auditReportStore";

export function useLatestAuditReport(): AuditIntelligenceResult | null {
  const [report, setReport] = useState<AuditIntelligenceResult | null>(() => loadLatestAuditReport());

  useEffect(() => {
    const syncReport = () => {
      setReport(loadLatestAuditReport());
    };

    window.addEventListener(AUDIT_REPORT_STORAGE_EVENT, syncReport as EventListener);
    window.addEventListener("storage", syncReport);

    return () => {
      window.removeEventListener(AUDIT_REPORT_STORAGE_EVENT, syncReport as EventListener);
      window.removeEventListener("storage", syncReport);
    };
  }, []);

  return report;
}