import { Router } from "express";
import { UNSAFE_AUDIT_TARGET_ERROR } from "../Services/securityPolicies";
import { collectUrlEvidence, type UrlEvidence } from "../Services/urlEvidence";
import { resolveProviderCredentials, callLlmProvider } from "../Services/llmProvider";
import {
  buildMeasuredPromptContext,
  buildPresentationMeasuredEvidence,
  buildPresentationPrompt,
  extractJsonPayload,
  generateSmartPresentationFallback,
  looksLikeHttpUrl,
} from "../Services/presentationGenerator";
import { authenticateToken } from "../Middleware/authMiddleware";
import { requirePlanLimits } from "../Middleware/planMiddleware";
import { mapErrorToResponse } from "../Middleware/errorMiddleware";

export const presentationRouter = Router();

// POST /api/audit/presentation
presentationRouter.post("/", authenticateToken, requirePlanLimits, async (req, res) => {
  const { url, techStack, knownIssues, auditSummary, language } = req.body as {
    url?: string;
    techStack?: string;
    knownIssues?: string;
    auditSummary?: string;
    language?: string;
  };

  if (!url) {
    return res.status(400).json({ error: "missing_url" });
  }

  const normalizedTechStack = techStack || "React 前端, Node.js BFF, Azure App Service";
  const normalizedIssues = knownIssues || "首頁載入較慢、API 延遲不穩定";
  const providedSummary = auditSummary ? `\n          - 真實稽核掃描數據: ${auditSummary}` : "";

  // Gather real measurements before the LLM call.
  let evidence: UrlEvidence | null = null;
  if (looksLikeHttpUrl(url)) {
    try {
      evidence = await collectUrlEvidence(url);
    } catch (evidenceError: unknown) {
      const msg = evidenceError instanceof Error ? evidenceError.message : "";
      if (msg === UNSAFE_AUDIT_TARGET_ERROR) {
        const mapped = mapErrorToResponse(evidenceError);
        return res.status(mapped.status).json(mapped.body);
      }
      if (process.env.NODE_ENV !== "production") {
        console.error("Presentation evidence collection failed:", msg);
      }
    }
  }

  const measuredEvidence = buildPresentationMeasuredEvidence(evidence);
  const credentials = resolveProviderCredentials(req.auditConfig ?? undefined);

  if (credentials.apiKey) {
    try {
      const prompt = buildPresentationPrompt({
        url,
        techStack: normalizedTechStack,
        knownIssues: normalizedIssues,
        providedSummary,
        language,
        measuredContext: buildMeasuredPromptContext(evidence),
      });

      const response = await callLlmProvider(credentials, prompt);
      if (response.text) {
        const parsed = extractJsonPayload(response.text);
        if (parsed) {
          parsed.modelUsed = response.model;
          parsed.measuredEvidence = measuredEvidence;
          return res.json(parsed);
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to parse JSON from AI response:", response.text);
        }
      }
    } catch (providerError: unknown) {
      if (process.env.NODE_ENV !== "production") {
        console.error("LLM provider call failed, falling back to smart generator:", providerError);
      }
    }
  }

  // Offline fallback — uses real measurements where available.
  const fallbackData = generateSmartPresentationFallback(url, normalizedTechStack, normalizedIssues, evidence, measuredEvidence);
  return res.json(fallbackData);
});
