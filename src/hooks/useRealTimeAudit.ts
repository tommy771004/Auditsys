import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ExecutionState,
  ExecutionStatus,
  LiveDOMIssue,
  LiveScanSummary,
  SSELog,
  UseRealTimeAuditResult,
} from "../types/liveAudit.types";

// Base URL for the backend. Empty string keeps requests on the same origin
// (the Express server proxies Vite in dev), so EventSource and fetch both work.
const API_BASE: string = import.meta.env.VITE_API_URL ?? "";

const PHASE_STATUSES: ReadonlySet<ExecutionStatus> = new Set<ExecutionStatus>([
  "connecting",
  "scanning",
  "analyzing",
  "complete",
  "error",
]);

function isExecutionStatus(value: unknown): value is ExecutionStatus {
  return typeof value === "string" && PHASE_STATUSES.has(value as ExecutionStatus);
}

function isSSELog(value: unknown): value is SSELog {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.message === "string" &&
    (candidate.level === "info" ||
      candidate.level === "warn" ||
      candidate.level === "error" ||
      candidate.level === "success")
  );
}

function isLiveScanSummary(value: unknown): value is LiveScanSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const scores = candidate.scores as Record<string, unknown> | undefined;
  return (
    typeof candidate.finalUrl === "string" &&
    typeof scores === "object" &&
    scores !== null &&
    typeof scores.overall === "number" &&
    Array.isArray(candidate.routes)
  );
}

function isLiveDOMIssueArray(value: unknown): value is LiveDOMIssue[] {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }
      const candidate = item as Record<string, unknown>;
      return typeof candidate.element === "string" && typeof candidate.snippet === "string";
    })
  );
}

/**
 * Owns every real network interaction for a live audit run:
 *  1. Opens a real `EventSource` to stream `SSELog` frames.
 *  2. Tracks the server-driven `ExecutionState`.
 *  3. Fetches the parsed `LiveDOMIssue[]` from the backend once the stream completes.
 *
 * There are deliberately no `setInterval`/`setTimeout` timers or mock generators —
 * all motion in the UI is driven by genuine server events.
 */
export function useRealTimeAudit(): UseRealTimeAuditResult {
  const { i18n } = useTranslation();
  const [state, setState] = useState<ExecutionState>({ status: "idle", targetUrl: "" });
  const [logs, setLogs] = useState<SSELog[]>([]);
  const [domIssues, setDomIssues] = useState<LiveDOMIssue[]>([]);
  const [summary, setSummary] = useState<LiveScanSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sourceRef = useRef<EventSource | null>(null);
  // Monotonic token guards against late events from a previous (cancelled) run.
  const runTokenRef = useRef<number>(0);
  // Set once a run ends gracefully so the socket-close `onerror` is ignored.
  const settledRef = useRef<boolean>(false);

  const closeStream = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  // Fetch the backend-parsed DOM issues. Uses a real Authorization header because
  // a standard `fetch` (unlike EventSource) can carry custom headers.
  const fetchDomIssues = useCallback(async (targetUrl: string, token: number): Promise<void> => {
    try {
      const authToken = localStorage.getItem("auth_token");
      const response = await fetch(`${API_BASE}/api/scan/dom-issues?url=${encodeURIComponent(targetUrl)}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });

      if (token !== runTokenRef.current) {
        return;
      }

      if (!response.ok) {
        throw new Error(`dom_issues_failed:${response.status}`);
      }

      const payload: unknown = await response.json();

      if (token !== runTokenRef.current) {
        return;
      }

      setDomIssues(isLiveDOMIssueArray(payload) ? payload : []);
    } catch {
      // A DOM-issue failure must not abort the whole report — surface an empty set.
      if (token === runTokenRef.current) {
        setDomIssues([]);
      }
    }
  }, []);

  const stopScan = useCallback(() => {
    runTokenRef.current += 1;
    closeStream();
    setState((current) => ({ status: "idle", targetUrl: current.targetUrl }));
  }, [closeStream]);

  const startScan = useCallback(
    (targetUrl: string) => {
      const normalizedUrl = targetUrl.trim();
      if (!normalizedUrl) {
        return;
      }

      const token = runTokenRef.current + 1;
      runTokenRef.current = token;
      settledRef.current = false;

      closeStream();
      setLogs([]);
      setDomIssues([]);
      setSummary(null);
      setErrorMessage(null);
      setState({ status: "connecting", targetUrl: normalizedUrl });

      const authToken = localStorage.getItem("auth_token");
      const currentLanguage = i18n.resolvedLanguage || i18n.language || "en";
      // EventSource cannot set headers, so the token rides as a query parameter.
      const streamUrl =
        `${API_BASE}/api/scan/stream?url=${encodeURIComponent(normalizedUrl)}` +
        `&language=${encodeURIComponent(currentLanguage)}` +
        (authToken ? `&token=${encodeURIComponent(authToken)}` : "");

      const source = new EventSource(streamUrl);
      sourceRef.current = source;

      source.onopen = () => {
        if (token !== runTokenRef.current) {
          return;
        }
        setState((current) => ({ ...current, status: "scanning" }));
      };

      // Default (unnamed) frames carry SSELog payloads.
      source.onmessage = (event: MessageEvent<string>) => {
        if (token !== runTokenRef.current) {
          return;
        }
        try {
          const parsed: unknown = JSON.parse(event.data);
          if (isSSELog(parsed)) {
            setLogs((current) => [...current, parsed]);
          }
        } catch {
          // Ignore malformed frames rather than crashing the stream.
        }
      };

      // Named "phase" frames drive the high-level ExecutionState.status.
      source.addEventListener("phase", (event) => {
        if (token !== runTokenRef.current) {
          return;
        }
        try {
          const parsed: unknown = JSON.parse((event as MessageEvent<string>).data);
          const nextStatus = (parsed as { status?: unknown })?.status;
          if (isExecutionStatus(nextStatus)) {
            setState((current) => ({ ...current, status: nextStatus }));
          }
        } catch {
          // Ignore malformed phase frames.
        }
      });

      // Named "fail" frames are graceful, server-reported errors.
      source.addEventListener("fail", (event) => {
        if (token !== runTokenRef.current) {
          return;
        }
        let message = "scan_failed";
        try {
          const parsed: unknown = JSON.parse((event as MessageEvent<string>).data);
          const reported = (parsed as { message?: unknown })?.message;
          if (typeof reported === "string" && reported.length > 0) {
            message = reported;
          }
        } catch {
          // keep default message
        }
        settledRef.current = true;
        closeStream();
        setErrorMessage(message);
        setState((current) => ({ ...current, status: "error" }));
      });

      // Named "done" frame: the stream finished cleanly. It carries the structured
      // scan summary. Now fetch DOM issues, close the connection, and flip to the
      // final report state.
      source.addEventListener("done", (event) => {
        if (token !== runTokenRef.current) {
          return;
        }
        try {
          const parsed: unknown = JSON.parse((event as MessageEvent<string>).data);
          const reportedSummary = (parsed as { summary?: unknown })?.summary;
          if (isLiveScanSummary(reportedSummary)) {
            setSummary(reportedSummary);
          }
        } catch {
          // A missing/malformed summary must not block completion.
        }
        settledRef.current = true;
        closeStream();
        void fetchDomIssues(normalizedUrl, token).then(() => {
          if (token === runTokenRef.current) {
            setState((current) => ({ ...current, status: "complete" }));
          }
        });
      });

      // Transport-level failure (CORS, dropped connection, 5xx before headers).
      // EventSource auto-reconnects; we treat an unexpected drop as a hard error.
      source.onerror = () => {
        if (token !== runTokenRef.current || settledRef.current) {
          return;
        }
        // A drop after a clean "done"/"fail" is normal — ignore it.
        setState((current) => {
          if (current.status === "complete") {
            return current;
          }
          settledRef.current = true;
          closeStream();
          setErrorMessage((existing) => existing ?? "connection_lost");
          return { ...current, status: "error" };
        });
      };
    },
    [closeStream, fetchDomIssues],
  );

  // Always tear the stream down on unmount.
  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      closeStream();
    };
  }, [closeStream]);

  return {
    state,
    logs,
    domIssues,
    summary,
    errorMessage,
    startScan,
    stopScan,
  };
}
