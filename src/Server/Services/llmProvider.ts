import {
  fetchAgentRouter,
  fetchNvidia,
  fetchOpenRouterWithFallback,
  type OpenRouterFallbackResult,
} from "./openrouterHelper";

/**
 * The single place where a caller's plan config (or its absence) is turned into
 * "which provider, which key, which models". Every audit generator must resolve
 * credentials through here — hand-rolled copies of this lookup have already
 * diverged once (the presentation route silently dropped nvidia support).
 */

export type LlmProviderName = "openrouter" | "agentrouter" | "nvidia";

export interface LlmProviderConfig {
  aiProvider?: string | null;
  agentRouterApiKey?: string | null;
  openRouterApiKey?: string | null;
  nvidiaApiKey?: string | null;
  /** Legacy alias for openRouterApiKey kept for older call sites. */
  apiKey?: string | null;
  allowedModels?: string[];
}

export interface ResolvedProviderCredentials {
  provider: LlmProviderName;
  apiKey: string | undefined;
  allowedModels: string[] | undefined;
}

export const DEFAULT_AGENTROUTER_MODEL = "gpt-4o";
export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

export function resolveProviderCredentials(
  config?: LlmProviderConfig,
  env: NodeJS.ProcessEnv = process.env,
): ResolvedProviderCredentials {
  const provider: LlmProviderName =
    config?.aiProvider === "agentrouter" ? "agentrouter" : config?.aiProvider === "nvidia" ? "nvidia" : "openrouter";

  const apiKey =
    provider === "agentrouter"
      ? config?.agentRouterApiKey || env.AGENT_ROUTER_TOKEN || undefined
      : provider === "nvidia"
        ? config?.nvidiaApiKey || env.NVIDIA_API_KEY || undefined
        : config?.openRouterApiKey || config?.apiKey || env.OPENROUTER_API_KEY || undefined;

  return { provider, apiKey, allowedModels: config?.allowedModels };
}

export interface LlmProviderFetchers {
  fetchAgentRouter: typeof fetchAgentRouter;
  fetchNvidia: typeof fetchNvidia;
  fetchOpenRouterWithFallback: typeof fetchOpenRouterWithFallback;
}

/** Dispatches a prompt to the resolved provider. Callers must check `apiKey` first. */
export async function callLlmProvider(
  credentials: ResolvedProviderCredentials,
  prompt: string,
  fetchers: LlmProviderFetchers = { fetchAgentRouter, fetchNvidia, fetchOpenRouterWithFallback },
): Promise<OpenRouterFallbackResult> {
  if (!credentials.apiKey) {
    throw new Error("missing_api_key");
  }
  switch (credentials.provider) {
    case "agentrouter":
      return fetchers.fetchAgentRouter(credentials.apiKey, prompt, credentials.allowedModels?.[0] || DEFAULT_AGENTROUTER_MODEL);
    case "nvidia":
      return fetchers.fetchNvidia(credentials.apiKey, prompt, credentials.allowedModels?.[0] || DEFAULT_NVIDIA_MODEL);
    default:
      return fetchers.fetchOpenRouterWithFallback(credentials.apiKey, prompt, credentials.allowedModels);
  }
}
