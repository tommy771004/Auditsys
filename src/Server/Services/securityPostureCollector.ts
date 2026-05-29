/**
 * Security Posture Collector
 *
 * Evaluates the four critical HTTP security response headers:
 *  - Content-Security-Policy (CSP)
 *  - Strict-Transport-Security (HSTS)
 *  - X-Frame-Options
 *  - X-Content-Type-Options
 *
 * Returns a structured SecurityPostureResult with per-finding severity,
 * a 0-100 weighted score, an A-F grade, detected platform stack, and
 * platform-specific remediation code snippets.
 *
 * All functions are pure / side-effect-free for hermetic unit testing.
 */

import type {
  DetectedStack,
  SecurityHeaderFinding,
  SecurityPostureResult,
  SecurityRemediationSnippets,
} from "./auditPipelineTypes";

// ── Scoring weights (deducted from 100) ──────────────────────────────────────

const PENALTIES = {
  csp_missing: 40,
  csp_unsafe_inline_no_nonce: 20,
  csp_unsafe_eval: 15,
  csp_wildcard: 15,
  csp_no_frame_ancestors: 5,
  hsts_missing: 25,
  hsts_max_age_too_short: 10,
  hsts_no_include_subdomains: 5,
  xfo_missing_no_csp_frame_ancestors: 25,
  xfo_missing_has_csp_frame_ancestors: 5,
  xfo_invalid_value: 10,
  xcto_missing: 10,
  xcto_invalid_value: 8,
} as const;

// ── Platform detection ────────────────────────────────────────────────────────

function detectStack(headers: Headers): DetectedStack {
  const server = (headers.get("server") ?? "").toLowerCase();
  const via = (headers.get("via") ?? "").toLowerCase();
  const cfRay = headers.get("cf-ray");
  const vercelId = headers.get("x-vercel-id");

  if (cfRay || server.includes("cloudflare") || via.includes("cloudflare")) {
    return "cloudflare";
  }
  if (vercelId || server.includes("vercel")) {
    return "vercel";
  }
  if (server.includes("nginx")) {
    return "nginx";
  }
  if (server.includes("kestrel") || server.includes("microsoft-httpapi") || headers.get("x-aspnet-version")) {
    return "aspnet";
  }
  return "unknown";
}

// ── Individual header evaluators ─────────────────────────────────────────────

function evaluateCsp(value: string | null): { finding: SecurityHeaderFinding; penalties: number } {
  if (!value) {
    return {
      finding: {
        header: "Content-Security-Policy",
        present: false,
        value: null,
        severity: "critical",
        remediationHint:
          "CSP 完全缺失。攻擊者可透過 XSS 執行任意腳本，竊取 Session Token、localStorage 資料，並偽造使用者操作。",
      },
      penalties: PENALTIES.csp_missing,
    };
  }

  const misconfigs: string[] = [];
  let totalPenalty = 0;

  // Check for unsafe-inline without nonce/hash
  const hasUnsafeInline = value.includes("'unsafe-inline'");
  const hasNonce = /['"]nonce-[^'"]+['"]/.test(value);
  const hasHash = /['"]sha(256|384|512)-[^'"]+['"]/.test(value);
  if (hasUnsafeInline && !hasNonce && !hasHash) {
    misconfigs.push("script-src 含 'unsafe-inline' 且無 nonce/hash，XSS 保護形同虛設");
    totalPenalty += PENALTIES.csp_unsafe_inline_no_nonce;
  }

  // Check for unsafe-eval
  if (value.includes("'unsafe-eval'")) {
    misconfigs.push("'unsafe-eval' 允許動態 eval()，攻擊者可利用資料注入觸發任意程式碼執行");
    totalPenalty += PENALTIES.csp_unsafe_eval;
  }

  // Check for wildcard in script-src / default-src
  if (/(?:default|script)-src\s[^;]*\*/.test(value)) {
    misconfigs.push("萬用字元 (*) 在 script-src 或 default-src 中允許任意來源，CSP 防護失效");
    totalPenalty += PENALTIES.csp_wildcard;
  }

  // Check for frame-ancestors
  if (!value.includes("frame-ancestors")) {
    misconfigs.push("缺少 frame-ancestors 指令，Clickjacking 防護不完整（X-Frame-Options 作為後備）");
    totalPenalty += PENALTIES.csp_no_frame_ancestors;
  }

  const severity = totalPenalty >= 20 ? "high" : totalPenalty > 0 ? "medium" : "pass";

  return {
    finding: {
      header: "Content-Security-Policy",
      present: true,
      value,
      severity,
      misconfiguration: misconfigs.length > 0 ? misconfigs.join("；") : undefined,
      remediationHint:
        misconfigs.length > 0
          ? `CSP 存在但有 ${misconfigs.length} 處誤設：${misconfigs[0]}`
          : "CSP 設定正確，無明顯誤設",
    },
    penalties: totalPenalty,
  };
}

function evaluateHsts(value: string | null): { finding: SecurityHeaderFinding; penalties: number } {
  if (!value) {
    return {
      finding: {
        header: "Strict-Transport-Security",
        present: false,
        value: null,
        severity: "high",
        remediationHint:
          "HSTS 缺失。在公共 WiFi 或中間人攻擊場景下，HTTP 降級（SSL Stripping）無防護，Cookie 可能以明文傳送。",
      },
      penalties: PENALTIES.hsts_missing,
    };
  }

  const misconfigs: string[] = [];
  let totalPenalty = 0;

  const maxAgeMatch = value.match(/max-age\s*=\s*(\d+)/i);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 0;

  if (maxAge < 31536000) {
    misconfigs.push(
      `max-age=${maxAge} 過短（< 1 年），瀏覽器記住 HTTPS 的時間不足，建議至少 31536000，推薦 63072000（2 年）`,
    );
    totalPenalty += PENALTIES.hsts_max_age_too_short;
  }

  if (!value.toLowerCase().includes("includesubdomains")) {
    misconfigs.push("缺少 includeSubDomains，子網域仍可遭受 SSL Stripping 攻擊");
    totalPenalty += PENALTIES.hsts_no_include_subdomains;
  }

  const severity = totalPenalty >= 10 ? "medium" : totalPenalty > 0 ? "low" : "pass";

  return {
    finding: {
      header: "Strict-Transport-Security",
      present: true,
      value,
      severity,
      misconfiguration: misconfigs.length > 0 ? misconfigs.join("；") : undefined,
      remediationHint:
        misconfigs.length > 0
          ? `HSTS 存在但有誤設：${misconfigs[0]}`
          : "HSTS 設定正確",
    },
    penalties: totalPenalty,
  };
}

function evaluateXFrameOptions(
  value: string | null,
  cspValue: string | null,
): { finding: SecurityHeaderFinding; penalties: number } {
  const hasCspFrameAncestors = Boolean(cspValue?.includes("frame-ancestors"));

  if (!value) {
    if (hasCspFrameAncestors) {
      return {
        finding: {
          header: "X-Frame-Options",
          present: false,
          value: null,
          severity: "low",
          remediationHint:
            "CSP frame-ancestors 已提供 Clickjacking 保護。建議同時保留 X-Frame-Options 作為舊版瀏覽器的後備防護。",
        },
        penalties: PENALTIES.xfo_missing_has_csp_frame_ancestors,
      };
    }

    return {
      finding: {
        header: "X-Frame-Options",
        present: false,
        value: null,
        severity: "high",
        remediationHint:
          "Clickjacking 防護完全缺失。攻擊者可將您的頁面嵌入透明 iframe，誘使使用者在不知情下點擊惡意操作。請設為 DENY。",
      },
      penalties: PENALTIES.xfo_missing_no_csp_frame_ancestors,
    };
  }

  const normalized = value.trim().toUpperCase();
  const isValidValue =
    normalized === "DENY" ||
    normalized === "SAMEORIGIN" ||
    normalized.startsWith("ALLOW-FROM");

  if (!isValidValue) {
    return {
      finding: {
        header: "X-Frame-Options",
        present: true,
        value,
        severity: "medium",
        misconfiguration: `值 "${value}" 無效，應為 DENY 或 SAMEORIGIN`,
        remediationHint: `X-Frame-Options 值 "${value}" 無效，瀏覽器將忽略此 header，請改為 DENY。`,
      },
      penalties: PENALTIES.xfo_invalid_value,
    };
  }

  return {
    finding: {
      header: "X-Frame-Options",
      present: true,
      value,
      severity: "pass",
      remediationHint: "X-Frame-Options 設定正確",
    },
    penalties: 0,
  };
}

function evaluateXContentTypeOptions(value: string | null): { finding: SecurityHeaderFinding; penalties: number } {
  if (!value) {
    return {
      finding: {
        header: "X-Content-Type-Options",
        present: false,
        value: null,
        severity: "medium",
        remediationHint:
          "缺少 nosniff。舊版瀏覽器可能將上傳的惡意檔案（如偽裝成圖片的 HTML）自動辨識並以 text/html 執行，導致 XSS。請設為 nosniff。",
      },
      penalties: PENALTIES.xcto_missing,
    };
  }

  if (value.trim().toLowerCase() !== "nosniff") {
    return {
      finding: {
        header: "X-Content-Type-Options",
        present: true,
        value,
        severity: "medium",
        misconfiguration: `值應為 "nosniff"，目前為 "${value}"`,
        remediationHint: `值 "${value}" 無效，唯一合法值為 nosniff。`,
      },
      penalties: PENALTIES.xcto_invalid_value,
    };
  }

  return {
    finding: {
      header: "X-Content-Type-Options",
      present: true,
      value,
      severity: "pass",
      remediationHint: "X-Content-Type-Options 設定正確",
    },
    penalties: 0,
  };
}

// ── Score / Grade computation ─────────────────────────────────────────────────

function computeGrade(score: number): SecurityPostureResult["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

// ── Remediation snippet builders ─────────────────────────────────────────────

/**
 * Generates the recommended CSP value based on typical SaaS/analytics needs.
 * Uses 'unsafe-inline' as a pragmatic starting point for SPA frameworks;
 * teams should graduate to nonce-based CSP in a subsequent sprint.
 */
function buildCspValue(): string {
  return (
    "default-src 'self'; " +
    "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; " +
    "connect-src 'self' https://www.google-analytics.com https://analytics.google.com https://region1.google-analytics.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "upgrade-insecure-requests; " +
    "block-all-mixed-content;"
  );
}

function buildVercelSnippet(): string {
  return JSON.stringify(
    {
      headers: [
        {
          source: "/(.*)",
          headers: [
            { key: "Content-Security-Policy", value: buildCspValue() },
            { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ],
        },
      ],
    },
    null,
    2,
  );
}

function buildNginxSnippet(): string {
  const csp = buildCspValue();
  return [
    "# 加入到你的 server {} 區塊（注意：sub-location 需重新宣告 headers）",
    `add_header Content-Security-Policy "${csp}" always;`,
    `add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;`,
    `add_header X-Frame-Options "DENY" always;`,
    `add_header X-Content-Type-Options "nosniff" always;`,
    `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`,
    `add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;`,
    "server_tokens off;  # 隱藏 Nginx 版本",
  ].join("\n");
}

function buildAspNetSnippet(): string {
  const csp = buildCspValue();
  return [
    "// Program.cs — ASP.NET Core 8+ 安全 Headers 中介層",
    "app.Use(async (context, next) => {",
    "    var headers = context.Response.Headers;",
    `    headers["Content-Security-Policy"] = "${csp}";`,
    `    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";`,
    `    headers["X-Frame-Options"] = "DENY";`,
    `    headers["X-Content-Type-Options"] = "nosniff";`,
    `    headers["Referrer-Policy"] = "strict-origin-when-cross-origin";`,
    `    headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()";`,
    `    headers.Remove("X-Powered-By");`,
    `    headers.Remove("Server");`,
    "    await next();",
    "});",
    "app.UseHsts();  // appsettings.json: Hsts.MaxAge=63072000, IncludeSubDomains=true",
  ].join("\n");
}

function buildRemediationSnippets(): SecurityRemediationSnippets {
  return {
    vercel: buildVercelSnippet(),
    nginx: buildNginxSnippet(),
    aspnet: buildAspNetSnippet(),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Evaluates HTTP response headers for security posture.
 *
 * Design: pure function — takes a Headers object, returns a structured result.
 * Never throws; worst case returns grade F with all findings present.
 */
export function collectSecurityPosture(headers: Headers): SecurityPostureResult {
  const cspValue = headers.get("content-security-policy");
  const hstsValue = headers.get("strict-transport-security");
  const xfoValue = headers.get("x-frame-options");
  const xctoValue = headers.get("x-content-type-options");

  const cspResult = evaluateCsp(cspValue);
  const hstsResult = evaluateHsts(hstsValue);
  const xfoResult = evaluateXFrameOptions(xfoValue, cspValue);
  const xctoResult = evaluateXContentTypeOptions(xctoValue);

  const findings: SecurityHeaderFinding[] = [
    cspResult.finding,
    hstsResult.finding,
    xfoResult.finding,
    xctoResult.finding,
  ];

  const totalPenalty =
    cspResult.penalties + hstsResult.penalties + xfoResult.penalties + xctoResult.penalties;
  const score = Math.max(0, Math.min(100, Math.round(100 - totalPenalty)));
  const grade = computeGrade(score);
  const detectedStack = detectStack(headers);
  const remediationSnippets = buildRemediationSnippets();

  return { score, grade, findings, detectedStack, remediationSnippets };
}

/**
 * Formats a brief one-line summary of the security posture for SSE log output.
 * Example: "Security grade: C (58/100) — CSP missing, HSTS missing"
 */
export function formatSecurityPostureLog(result: SecurityPostureResult): string {
  const issues = result.findings
    .filter((f) => f.severity !== "pass")
    .map((f) => {
      const label = f.header.replace(/^(Content-Security-Policy)$/, "CSP")
        .replace(/^(Strict-Transport-Security)$/, "HSTS");
      return f.present ? `${label} misconfigured` : `${label} missing`;
    });

  const issueText = issues.length > 0 ? ` — ${issues.join(", ")}` : "";
  return `Security grade: ${result.grade} (${result.score}/100)${issueText}`;
}
