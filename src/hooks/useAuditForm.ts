import { useState } from "react";
import { postAuditRequest } from "../services/auditApi";
import { saveLatestAuditReport } from "../services/auditReportStore";

interface UseAuditFormResult {
  url: string;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  errorKey: string | null;
  updateUrl: (value: string) => void;
  submitAudit: () => Promise<void>;
}

function isValidUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function useAuditForm(): UseAuditFormResult {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const updateUrl = (value: string) => {
    setUrl(value);
    setIsError(false);
    setIsSuccess(false);
    setErrorKey(null);
  };

  const submitAudit = async () => {
    const normalizedUrl = url.trim();

    setIsError(false);
    setIsSuccess(false);
    setErrorKey(null);

    if (!normalizedUrl) {
      setIsError(true);
      setErrorKey("validation.requiredUrl");
      return;
    }

    if (!isValidUrl(normalizedUrl)) {
      setIsError(true);
      setErrorKey("validation.invalidUrl");
      return;
    }

    setIsLoading(true);

    try {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 1400);
      });

      const responseData = await postAuditRequest({
        endpoint: import.meta.env.VITE_AUDIT_ENDPOINT,
        defaultEndpoint: "/api/audit",
        payload: {
          url: normalizedUrl,
        },
        fallbackPayload: {
          queued: true,
          provider: "fallback",
          url: normalizedUrl,
        },
      });

      saveLatestAuditReport(responseData);

      setIsSuccess(true);
    } catch (error: any) {
      if (error && error.message === "unauthorized") {
        setIsError(true);
        setErrorKey("validation.unauthorized");
      } else {
        setIsError(true);
        setErrorKey("validation.submitFailed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    url,
    isLoading,
    isError,
    isSuccess,
    errorKey,
    updateUrl,
    submitAudit,
  };
}
