import type { AuditRequestPayload, DeterministicCollectorResult, DeterministicDocumentEvidence } from "./auditPipelineTypes";
import { AUDIT_TARGET_REDIRECT_LIMIT_ERROR, assertSafeAuditTargetUrl } from "./securityPolicies";
import { collectSecurityPosture } from "./securityPostureCollector";

const REQUEST_HEADERS = {
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
};

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function fetchAuditTarget(targetUrl: string): Promise<Response> {
  let currentUrl = targetUrl;

  for (let redirectCount = 0; redirectCount <= 5; redirectCount += 1) {
    await assertSafeAuditTargetUrl(currentUrl);

    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: REQUEST_HEADERS,
    });

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    const location = response.headers.get("location");

    if (!location) {
      return response;
    }

    currentUrl = new URL(location, currentUrl).toString();
  }

  throw new Error(AUDIT_TARGET_REDIRECT_LIMIT_ERROR);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function stripHtml(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function matchContent(pattern: RegExp, source: string): string | null {
  const match = source.match(pattern);
  return match?.[1] ? stripHtml(match[1]) : null;
}

function matchAttribute(pattern: RegExp, source: string): string | null {
  const match = source.match(pattern);
  return match?.[1] ? decodeHtml(match[1].trim()) : null;
}

function countMatches(pattern: RegExp, source: string): number {
  return source.match(pattern)?.length ?? 0;
}

function countLinksByOrigin(html: string, finalUrl: string): { internalLinks: number; externalLinks: number } {
  const baseUrl = new URL(finalUrl);
  const hrefMatches = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)];

  let internalLinks = 0;
  let externalLinks = 0;

  for (const match of hrefMatches) {
    const href = match[1]?.trim();

    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      continue;
    }

    try {
      const resolvedUrl = new URL(href, baseUrl);

      if (resolvedUrl.origin === baseUrl.origin) {
        internalLinks += 1;
      } else {
        externalLinks += 1;
      }
    } catch {
      continue;
    }
  }

  return {
    internalLinks,
    externalLinks,
  };
}

function extractDocumentEvidence(html: string, finalUrl: string): DeterministicDocumentEvidence {
  const linkCounts = countLinksByOrigin(html, finalUrl);

  return {
    title: matchContent(/<title[^>]*>([\s\S]*?)<\/title>/i, html),
    metaDescription: matchAttribute(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i, html),
    canonical: matchAttribute(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i, html),
    robots: matchAttribute(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i, html),
    lang: matchAttribute(/<html\b[^>]*lang=["']([^"']*)["'][^>]*>/i, html),
    viewport: matchAttribute(/<meta\b[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["'][^>]*>/i, html),
    counts: {
      scripts: countMatches(/<script\b/gi, html),
      stylesheets: countMatches(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi, html),
      images: countMatches(/<img\b/gi, html),
      imagesMissingAlt: countMatches(/<img\b(?![^>]*\balt=)[^>]*>/gi, html),
      structuredDataBlocks: countMatches(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi, html),
      headings: countMatches(/<h[1-6]\b/gi, html),
      h1: countMatches(/<h1\b/gi, html),
      internalLinks: linkCounts.internalLinks,
      externalLinks: linkCounts.externalLinks,
      openGraphTags: countMatches(/<meta\b[^>]*property=["']og:[^"']*["'][^>]*>/gi, html),
      preconnectHints: countMatches(/<link\b[^>]*rel=["'](?:preconnect|dns-prefetch)["'][^>]*>/gi, html),
    },
  };
}

function buildWarnings(document: DeterministicDocumentEvidence, responseTimeMs: number, statusCode: number): string[] {
  const warnings: string[] = [];

  if (statusCode >= 400) {
    warnings.push(`Target responded with status ${statusCode}.`);
  }

  if (!document.title) {
    warnings.push("Document title is missing.");
  }

  if (!document.metaDescription) {
    warnings.push("Meta description is missing.");
  }

  if (!document.canonical) {
    warnings.push("Canonical link is missing.");
  }

  if (document.counts.images > 0 && document.counts.imagesMissingAlt > 0) {
    warnings.push(`${document.counts.imagesMissingAlt} images are missing alt text.`);
  }

  if (document.counts.structuredDataBlocks === 0) {
    warnings.push("No structured data blocks were detected.");
  }

  if (document.counts.h1 === 0) {
    warnings.push("No H1 heading was found in the initial HTML.");
  } else if (document.counts.h1 > 1) {
    warnings.push(`Multiple H1 headings were found (${document.counts.h1}), which dilutes heading semantics.`);
  }

  if (!document.viewport) {
    warnings.push("No responsive viewport meta tag was detected.");
  }

  if (document.counts.openGraphTags === 0) {
    warnings.push("No Open Graph tags were found, weakening social sharing previews.");
  }

  if (document.counts.scripts > 0 && document.counts.preconnectHints === 0) {
    warnings.push("No preconnect/dns-prefetch hints were found despite external scripts.");
  }

  if (responseTimeMs > 1800) {
    warnings.push(`Initial HTML response was slow (${responseTimeMs} ms).`);
  }

  return warnings;
}

function buildNotes(payload: AuditRequestPayload, finalUrl: string, contentType: string | null): string[] {
  const url = new URL(finalUrl);
  const notes = [
    `Resolved host: ${url.hostname}`,
    `Resolved path depth: ${url.pathname.split("/").filter(Boolean).length}`,
    `Content type: ${contentType ?? "unknown"}`,
  ];

  if (url.search) {
    notes.push("Target includes query parameters, which may imply filter or personalization states.");
  }

  if (payload.goals && payload.goals.length > 0) {
    notes.push(`Requested audit focus: ${payload.goals.join(", ")}`);
  }

  if (payload.stack && payload.stack.length > 0) {
    notes.push(`Reported implementation stack: ${payload.stack.join(", ")}`);
  }

  return notes;
}

export async function collectDeterministicEvidence(payload: AuditRequestPayload): Promise<DeterministicCollectorResult> {
  const startedAt = new Date().toISOString();
  const startedTime = Date.now();

  try {
    const response = await fetchAuditTarget(payload.url);

    const responseTimeMs = Date.now() - startedTime;
    const contentType = response.headers.get("content-type");
    const html = contentType?.includes("text/html") ? await response.text() : "";
    const finalUrl = response.url || payload.url;
    const document = html ? extractDocumentEvidence(html, finalUrl) : undefined;
    const securityPosture = collectSecurityPosture(response.headers);

    return {
      stage: "deterministic",
      status: "completed",
      startedAt,
      completedAt: new Date().toISOString(),
      targetUrl: payload.url,
      finalUrl,
      statusCode: response.status,
      contentType,
      responseTimeMs,
      headers: {
        cacheControl: response.headers.get("cache-control"),
        server: response.headers.get("server"),
        poweredBy: response.headers.get("x-powered-by"),
        contentSecurityPolicy: response.headers.get("content-security-policy"),
        strictTransportSecurity: response.headers.get("strict-transport-security"),
        xFrameOptions: response.headers.get("x-frame-options"),
        xContentTypeOptions: response.headers.get("x-content-type-options"),
      },
      securityPosture,
      document,
      notes: buildNotes(payload, finalUrl, contentType),
      warnings: document ? buildWarnings(document, responseTimeMs, response.status) : ["Target did not return HTML content for deterministic parsing."],
    };
  } catch (error) {
    return {
      stage: "deterministic",
      status: "failed",
      startedAt,
      completedAt: new Date().toISOString(),
      targetUrl: payload.url,
      notes: ["Deterministic collector could not establish a successful HTTP fetch."],
      warnings: [],
      error: error instanceof Error ? error.message : "Unexpected deterministic collector error",
    };
  }
}
