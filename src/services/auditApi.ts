interface PostAuditRequestOptions<Payload extends Record<string, unknown>> {
  endpoint?: string;
  defaultEndpoint: string;
  payload: Payload;
}

async function readJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getAuditRequestTimeoutMs(): number {
  const rawValue = import.meta.env.VITE_AUDIT_REQUEST_TIMEOUT_MS;
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.round(parsedValue) : 60000;
}

export async function postAuditRequest<Payload extends Record<string, unknown>>({
  endpoint,
  defaultEndpoint,
  payload,
}: PostAuditRequestOptions<Payload>): Promise<unknown> {
  const token = localStorage.getItem("auth_token");
  
  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload),
  };

  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, getAuditRequestTimeoutMs());

    const response = await fetch(endpoint ?? defaultEndpoint, {
      ...requestInit,
      signal: controller.signal,
    }).finally(() => {
      window.clearTimeout(timeoutId);
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("unauthorized");
      }
      throw new Error(`request_failed:${response.status}`);
    }

    return await readJsonResponse(response);
  } catch (error) {
    throw error;
  }
}
