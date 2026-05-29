import type { DOMIssueType, LiveDOMIssue } from "../../types/liveAudit.types";

interface BuildDomIssuePatchInput {
  elementId: string;
  issueType: DOMIssueType;
  originalSnippet: string;
  finalUrl: string;
}

const ISSUE_DESCRIPTIONS: Record<DOMIssueType, string> = {
  missing_alt: "此圖片缺少 alt 替代文字，搜尋引擎與螢幕閱讀器無法理解圖片內容，會削弱圖片 SEO 與無障礙體驗。",
  multiple_h1: "頁面出現多個 H1，會稀釋主要主題訊號並破壞輔助科技使用者理解頁面結構的標題階層。",
  invalid_canonical: "Canonical 標籤缺少有效 href 或格式不正確，搜尋引擎無法穩定判斷此頁的正規網址。",
  render_blocking: "此資源在文件前段同步載入，可能阻塞首次繪製並影響 FCP、LCP 等 Core Web Vitals 指標。",
};

const FALLBACK_DIFF_EXPLANATIONS: Record<DOMIssueType, string> = {
  missing_alt: "新增具描述性的 zh-TW alt 文字，讓圖片內容能被搜尋引擎與輔助科技正確理解。",
  multiple_h1: "將重複的 H1 調整為 H2，保留原 Tailwind class，同時恢復單一主標題結構。",
  invalid_canonical: "補上有效 canonical href，讓搜尋引擎能以最終掃描網址作為此頁正規網址。",
  render_blocking: "替同步 script 加上 defer，讓瀏覽器先解析 HTML 並降低首屏渲染阻塞。",
};

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function getAttribute(tag: string, name: string): string | null {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i");
  const match = tag.match(pattern);
  if (!match) {
    return null;
  }
  return match[1].replace(/^["']|["']$/g, "");
}

function hasAttribute(tag: string, name: string): boolean {
  return new RegExp(`\\b${name}(?:\\s*=|\\b)`, "i").test(tag);
}

function insertAttribute(tag: string, serializedAttribute: string): string {
  return tag.replace(/\s*(\/?)>$/, (_match, slash: string) => ` ${serializedAttribute}${slash ? " /" : ""}>`);
}

function setAttribute(tag: string, name: string, value: string): string {
  const serialized = `${name}="${escapeAttribute(value)}"`;
  const valuedPattern = new RegExp(`\\b${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i");

  if (valuedPattern.test(tag)) {
    return tag.replace(valuedPattern, serialized);
  }

  return insertAttribute(tag, serialized);
}

function setBooleanAttribute(tag: string, name: string): string {
  if (hasAttribute(tag, name)) {
    return tag;
  }
  return insertAttribute(tag, name);
}

function normalizeKeywordSource(value: string): string {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

function inferAltText(imgTag: string): string {
  const sourceText = [
    getAttribute(imgTag, "src"),
    getAttribute(imgTag, "class"),
    getAttribute(imgTag, "id"),
    getAttribute(imgTag, "title"),
    getAttribute(imgTag, "aria-label"),
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeKeywordSource)
    .join(" ");

  if (/(logo|brand|mark)/i.test(sourceText)) {
    return "Auditsys 品牌標誌";
  }
  if (/(dashboard|report|audit|seo|analytics|analysis|insight)/i.test(sourceText)) {
    return "Auditsys SEO 稽核報告與效能分析介面";
  }
  if (/(chart|graph|metric|score|vital)/i.test(sourceText)) {
    return "Auditsys SEO 數據分析圖表";
  }
  if (/(team|avatar|profile|person|user)/i.test(sourceText)) {
    return "Auditsys 使用者或團隊成員照片";
  }
  if (/(hero|banner|cover|lcp|above fold|visual)/i.test(sourceText)) {
    return "Auditsys 即時 SEO 稽核平台主視覺";
  }

  return "Auditsys 網站內容圖片";
}

function isHeroImage(imgTag: string): boolean {
  const sourceText = [
    getAttribute(imgTag, "src"),
    getAttribute(imgTag, "class"),
    getAttribute(imgTag, "id"),
    getAttribute(imgTag, "data-testid"),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .toLowerCase();

  return /(hero|banner|cover|lcp|above[-_\s]?fold|visual|masthead)/i.test(sourceText);
}

function fixMissingAlt(originalSnippet: string): { fixedSnippet: string; diffExplanation: string } {
  const imgTag = originalSnippet.match(/<img\b[^>]*>/i)?.[0];
  if (!imgTag) {
    return {
      fixedSnippet: originalSnippet,
      diffExplanation: FALLBACK_DIFF_EXPLANATIONS.missing_alt,
    };
  }

  let fixedTag = setAttribute(imgTag, "alt", inferAltText(imgTag));
  if (isHeroImage(imgTag)) {
    fixedTag = setAttribute(fixedTag, "fetchpriority", "high");
    fixedTag = setAttribute(fixedTag, "loading", "eager");
    return {
      fixedSnippet: originalSnippet.replace(imgTag, fixedTag),
      diffExplanation:
        "新增 zh-TW alt 文字，並加入 fetchpriority='high' 與 loading='eager'，提示瀏覽器優先載入首屏 hero 圖片。",
    };
  }

  if (!hasAttribute(fixedTag, "loading")) {
    fixedTag = setAttribute(fixedTag, "loading", "lazy");
  }

  return {
    fixedSnippet: originalSnippet.replace(imgTag, fixedTag),
    diffExplanation: FALLBACK_DIFF_EXPLANATIONS.missing_alt,
  };
}

function fixMultipleH1(originalSnippet: string): { fixedSnippet: string; diffExplanation: string } {
  const h1Count = [...originalSnippet.matchAll(/<h1\b/gi)].length;
  if (h1Count === 0) {
    return {
      fixedSnippet: originalSnippet,
      diffExplanation: FALLBACK_DIFF_EXPLANATIONS.multiple_h1,
    };
  }

  const keepFirstH1 = h1Count > 1;
  let openingCount = 0;
  let closingCount = 0;
  const fixedSnippet = originalSnippet
    .replace(/<h1\b/gi, () => {
      openingCount += 1;
      return keepFirstH1 && openingCount === 1 ? "<h1" : "<h2";
    })
    .replace(/<\/h1>/gi, () => {
      closingCount += 1;
      return keepFirstH1 && closingCount === 1 ? "</h1>" : "</h2>";
    });

  return {
    fixedSnippet,
    diffExplanation: FALLBACK_DIFF_EXPLANATIONS.multiple_h1,
  };
}

function fixInvalidCanonical(originalSnippet: string, finalUrl: string): { fixedSnippet: string; diffExplanation: string } {
  const canonicalTag = originalSnippet.match(/<link\b[^>]*>/i)?.[0];
  if (!canonicalTag) {
    return {
      fixedSnippet: `<link rel="canonical" href="${escapeAttribute(finalUrl)}">`,
      diffExplanation: FALLBACK_DIFF_EXPLANATIONS.invalid_canonical,
    };
  }

  const fixedTag = setAttribute(canonicalTag, "href", finalUrl);
  return {
    fixedSnippet: originalSnippet.replace(canonicalTag, fixedTag),
    diffExplanation: FALLBACK_DIFF_EXPLANATIONS.invalid_canonical,
  };
}

function fixRenderBlocking(originalSnippet: string): { fixedSnippet: string; diffExplanation: string } {
  const scriptTag = originalSnippet.match(/<script\b[^>]*>/i)?.[0];
  if (scriptTag && getAttribute(scriptTag, "src")) {
    const type = getAttribute(scriptTag, "type")?.toLowerCase();
    const fixedTag = type === "module" || hasAttribute(scriptTag, "async") || hasAttribute(scriptTag, "defer")
      ? scriptTag
      : setBooleanAttribute(scriptTag, "defer");

    return {
      fixedSnippet: originalSnippet.replace(scriptTag, fixedTag),
      diffExplanation: FALLBACK_DIFF_EXPLANATIONS.render_blocking,
    };
  }

  const stylesheetTag = originalSnippet.match(/<link\b[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/i)?.[0];
  if (stylesheetTag) {
    let fixedTag = setAttribute(stylesheetTag, "media", "print");
    fixedTag = setAttribute(fixedTag, "onload", "this.media='all'");
    return {
      fixedSnippet: originalSnippet.replace(stylesheetTag, fixedTag),
      diffExplanation: "將非關鍵 stylesheet 延後套用，避免阻塞首屏渲染；若此 CSS 是 critical CSS，應改為抽取並 inline critical rules。",
    };
  }

  return {
    fixedSnippet: originalSnippet,
    diffExplanation: FALLBACK_DIFF_EXPLANATIONS.render_blocking,
  };
}

export function buildDomIssuePatch(input: BuildDomIssuePatchInput): LiveDOMIssue {
  const { elementId, issueType, originalSnippet, finalUrl } = input;
  const patch =
    issueType === "missing_alt"
      ? fixMissingAlt(originalSnippet)
      : issueType === "multiple_h1"
        ? fixMultipleH1(originalSnippet)
        : issueType === "invalid_canonical"
          ? fixInvalidCanonical(originalSnippet, finalUrl)
          : fixRenderBlocking(originalSnippet);

  return {
    elementId,
    issueType,
    description: ISSUE_DESCRIPTIONS[issueType],
    originalSnippet,
    fixedSnippet: patch.fixedSnippet,
    diffExplanation: patch.diffExplanation,
  };
}
