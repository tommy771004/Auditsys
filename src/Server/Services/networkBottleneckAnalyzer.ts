import type { BottleneckFinding, NetworkEvidence, NetworkResource } from "../../types/networkEvidence.types";

const SLOW_CRITICAL_MS = 1000;
const SLOW_WARNING_MS = 500;
const UNCOMPRESSED_MIN_BYTES = 10 * 1024;
const IMAGE_MIN_BYTES = 100 * 1024;
const COMPRESSIBLE: ReadonlySet<string> = new Set(["script", "stylesheet", "fetch", "document"]);
const LEGACY_IMAGE = /image\/(jpeg|png|gif)/i;

function bytesOf(r: NetworkResource): number {
  return r.encodedBytes ?? r.transferBytes ?? 0;
}

function shortName(url: string): string {
  try {
    const u = new URL(url);
    const file = u.pathname.split("/").filter(Boolean).pop();
    return file ? `${u.hostname}/${file}` : u.hostname;
  } catch {
    return url;
  }
}

export function analyzeNetworkBottlenecks(evidence: NetworkEvidence): BottleneckFinding[] {
  const findings: BottleneckFinding[] = [];

  for (const r of evidence.resources) {
    // Slow resource.
    if (r.durationMs >= SLOW_WARNING_MS) {
      findings.push({
        severity: r.durationMs >= SLOW_CRITICAL_MS ? "critical" : "warning",
        target: shortName(r.url),
        measuredMs: r.durationMs,
        category: "slow-resource",
        diagnosis: `此資源回應耗時 ${r.durationMs}ms，拖慢頁面載入。`,
        resolution: "啟用 HTTP/2 多工、加上邊緣快取 (CDN)，並檢查伺服器處理時間。",
        measured: true,
      });
    }
    // Render-blocking.
    if (r.renderBlocking) {
      findings.push({
        severity: "warning",
        target: shortName(r.url),
        measuredMs: r.durationMs,
        category: "render-blocking",
        diagnosis: `此資源位於 <head> 且為同步載入，會阻塞首次內容繪製 (FCP)。`,
        resolution: r.type === "script"
          ? "為指令碼加上 async 或 defer，或移至 body 末端。"
          : "內聯關鍵 CSS，其餘樣式以非阻塞方式 (media/print onload) 載入。",
        measured: true,
      });
    }
    // Uncompressed.
    if (COMPRESSIBLE.has(r.type) && r.contentEncoding === null && bytesOf(r) >= UNCOMPRESSED_MIN_BYTES) {
      findings.push({
        severity: "warning",
        target: shortName(r.url),
        measuredMs: null,
        category: "uncompressed",
        diagnosis: `此文字資源約 ${Math.round(bytesOf(r) / 1024)}KB 未啟用 gzip/brotli 壓縮。`,
        resolution: "在伺服器或 CDN 啟用 brotli（或 gzip）壓縮回應封包。",
        measured: true,
      });
    }
    // Legacy image format.
    if (r.type === "image" && r.contentType && LEGACY_IMAGE.test(r.contentType) && bytesOf(r) >= IMAGE_MIN_BYTES) {
      findings.push({
        severity: "warning",
        target: shortName(r.url),
        measuredMs: null,
        category: "image-format",
        diagnosis: `此圖片約 ${Math.round(bytesOf(r) / 1024)}KB，使用舊式格式 (${r.contentType})。`,
        resolution: "改用 WebP/AVIF 並提供響應式尺寸 (srcset)。",
        measured: true,
      });
    }
  }

  // Third-party aggregate.
  const thirdParty = evidence.resources.filter((r) => r.isThirdParty);
  if (thirdParty.length > 0) {
    const totalKb = Math.round(thirdParty.reduce((sum, r) => sum + bytesOf(r), 0) / 1024);
    const hasCpu = evidence.page.longTasksMs !== null;
    findings.push({
      severity: thirdParty.length >= 5 ? "warning" : "info",
      target: `${thirdParty.length} 個第三方資源`,
      measuredMs: hasCpu ? evidence.page.longTasksMs : null,
      category: "third-party",
      diagnosis: hasCpu
        ? `第三方資源共 ${totalKb}KB，主執行緒長任務累計 ${evidence.page.longTasksMs}ms。`
        : `第三方資源共 ${totalKb}KB（傳輸量為實測）；主執行緒 CPU 時間需真實瀏覽器量測，本次未量測。`,
      resolution: "延後或移除非必要的追蹤/廣告指令碼，並以 facade 模式延後載入。",
      measured: hasCpu,
    });
  }

  // Waterfall chains — initiator data only exists in the Playwright collector.
  const hasInitiators = evidence.resources.some((r) => r.initiator);
  if (!hasInitiators) {
    findings.push({
      severity: "info",
      target: "瀑布鏈分析",
      measuredMs: null,
      category: "waterfall",
      diagnosis: "JavaScript 觸發的序列請求鏈需真實瀏覽器的 initiator 追蹤，本次未量測。",
      resolution: "啟用 Playwright 收集器 (BROWSER_COLLECTOR_MODE=playwright-real) 以分析瀑布鏈。",
      measured: false,
    });
  }

  return findings;
}
