import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveProviderCredentials,
  callLlmProvider,
  DEFAULT_NVIDIA_MODEL,
  type LlmProviderFetchers,
} from "../src/Server/Services/llmProvider.ts";
import { collectUrlEvidence } from "../src/Server/Services/urlEvidence.ts";
import { mapErrorToResponse } from "../src/Server/Middleware/errorMiddleware.ts";
import {
  UNSAFE_AUDIT_TARGET_ERROR,
  AUDIT_TARGET_REDIRECT_LIMIT_ERROR,
} from "../src/Server/Services/securityPolicies.ts";

const emptyEnv = {} as NodeJS.ProcessEnv;

// ---------------------------------------------------------------------------
// resolveProviderCredentials — the single lookup all three generators share.
// Regression: the presentation route used to hand-roll this and silently
// dropped nvidia support.
// ---------------------------------------------------------------------------

test("nvidia plan config resolves the nvidia key for every generator", () => {
  const planConfig = {
    aiProvider: "nvidia",
    nvidiaApiKey: "nvapi-secret",
    agentRouterApiKey: null,
    openRouterApiKey: "sk-or-should-not-win",
    allowedModels: ["nvidia/custom-model"],
  };

  const credentials = resolveProviderCredentials(planConfig, emptyEnv);
  assert.equal(credentials.provider, "nvidia");
  assert.equal(credentials.apiKey, "nvapi-secret");
  assert.deepEqual(credentials.allowedModels, ["nvidia/custom-model"]);
});

test("nvidia provider falls back to env key when the plan row has none", () => {
  const credentials = resolveProviderCredentials(
    { aiProvider: "nvidia", nvidiaApiKey: null },
    { NVIDIA_API_KEY: "nvapi-env" } as NodeJS.ProcessEnv,
  );
  assert.equal(credentials.apiKey, "nvapi-env");
});

test("openrouter is the default provider and honors the legacy apiKey alias", () => {
  const credentials = resolveProviderCredentials({ apiKey: "sk-or-legacy" }, emptyEnv);
  assert.equal(credentials.provider, "openrouter");
  assert.equal(credentials.apiKey, "sk-or-legacy");

  const missing = resolveProviderCredentials(undefined, emptyEnv);
  assert.equal(missing.provider, "openrouter");
  assert.equal(missing.apiKey, undefined);
});

test("agentrouter resolves its own key, never the openrouter one", () => {
  const credentials = resolveProviderCredentials(
    { aiProvider: "agentrouter", agentRouterApiKey: "ar-key", openRouterApiKey: "sk-or" },
    emptyEnv,
  );
  assert.equal(credentials.provider, "agentrouter");
  assert.equal(credentials.apiKey, "ar-key");
});

// ---------------------------------------------------------------------------
// callLlmProvider — dispatch goes to the matching fetcher with the right model.
// ---------------------------------------------------------------------------

function makeFetchers(calls: string[]): LlmProviderFetchers {
  return {
    fetchAgentRouter: async (_key, _prompt, model) => {
      calls.push(`agentrouter:${model}`);
      return { text: "{}", model };
    },
    fetchNvidia: async (_key, _prompt, model) => {
      calls.push(`nvidia:${model}`);
      return { text: "{}", model };
    },
    fetchOpenRouterWithFallback: async (_key, _prompt, models) => {
      calls.push(`openrouter:${models?.join(",") ?? "default-list"}`);
      return { text: "{}", model: "openrouter-model" };
    },
  };
}

test("callLlmProvider dispatches nvidia to the nvidia fetcher with the default model", async () => {
  const calls: string[] = [];
  await callLlmProvider({ provider: "nvidia", apiKey: "k", allowedModels: undefined }, "p", makeFetchers(calls));
  assert.deepEqual(calls, [`nvidia:${DEFAULT_NVIDIA_MODEL}`]);
});

test("callLlmProvider rejects when the api key is missing", async () => {
  await assert.rejects(
    () => callLlmProvider({ provider: "openrouter", apiKey: undefined, allowedModels: undefined }, "p"),
    /missing_api_key/,
  );
});

// ---------------------------------------------------------------------------
// collectUrlEvidence — SSRF guard is fail-closed: collectors never run when
// the guard rejects.
// ---------------------------------------------------------------------------

test("collectUrlEvidence never touches collectors when the SSRF guard rejects", async () => {
  let collectorCalls = 0;
  await assert.rejects(
    () =>
      collectUrlEvidence("http://127.0.0.1/admin", {
        assertSafeAuditTargetUrl: async () => {
          throw new Error(UNSAFE_AUDIT_TARGET_ERROR);
        },
        collectDeterministicEvidence: async () => {
          collectorCalls += 1;
          throw new Error("should_not_run");
        },
        fetchCruxReport: async () => {
          collectorCalls += 1;
          throw new Error("should_not_run");
        },
      }),
    new RegExp(UNSAFE_AUDIT_TARGET_ERROR),
  );
  assert.equal(collectorCalls, 0);
});

test("collectUrlEvidence degrades individual collector failures to null", async () => {
  const evidence = await collectUrlEvidence("https://example.com", {
    assertSafeAuditTargetUrl: async (rawUrl: string) => ({ safeUrl: rawUrl, originalHost: "example.com" }),
    collectDeterministicEvidence: async () => {
      throw new Error("network_down");
    },
    fetchCruxReport: async () => {
      throw new Error("crux_down");
    },
  });
  assert.deepEqual(evidence, { deterministic: null, crux: null });
});

// ---------------------------------------------------------------------------
// mapErrorToResponse — one mapping for all routers. Regression: the
// redirect-limit constant ("AUDIT_TARGET_REDIRECT_LIMIT_EXCEEDED") used to be
// hand-copied as "AUDIT_TARGET_REDIRECT_LIMIT" and mapped to 502.
// ---------------------------------------------------------------------------

test("client-caused codes map to 400, unknown faults to 502", () => {
  assert.equal(mapErrorToResponse(new Error(UNSAFE_AUDIT_TARGET_ERROR)).status, 400);
  assert.equal(mapErrorToResponse(new Error(AUDIT_TARGET_REDIRECT_LIMIT_ERROR)).status, 400);
  assert.equal(mapErrorToResponse(new Error("INVALID_AUDIT_PAYLOAD")).status, 400);

  const upstream = mapErrorToResponse(new Error("socket hang up"));
  assert.equal(upstream.status, 502);
  assert.equal(upstream.body.error.code, "server_error");
});
