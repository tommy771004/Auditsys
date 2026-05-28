import { useState } from "react";
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
      // Small delay for UI feedback
      await new Promise((resolve) => window.setTimeout(resolve, 600));
      
      // We no longer call postAuditRequest here to avoid duplicate LLM execution.
      // Instead, we just signal success, and let the AuditConsole handle the actual API call.
      
      setIsSuccess(true);
    } catch (error: any) {
      setIsError(true);
      setErrorKey("validation.submitFailed");
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
