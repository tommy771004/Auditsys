import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLatestAuditReport } from "../hooks/useLatestAuditReport";
import { useTranslation } from "react-i18next";
import {
  Monitor,
  Activity,
  Layers,
  Network,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Sliders,
  DollarSign,
  PieChart as LucidePieChart,
} from "lucide-react";
import type { AuditPresentationResult, AuditSlide } from "../types/presentation";
import type { NavigateTo } from "../types/home";
import ConsoleTabs from "../components/ui/ConsoleTabs";
import { Reveal } from "../components/ui/Reveal";
import AuditCharts from "../components/report/AuditCharts";
import AuditFindings from "../components/report/AuditFindings";
import AuditScoreBoard from "../components/report/AuditScoreBoard";
import { buildAuditReportViewModel } from "../services/auditReport";
import { PresentationChart } from "../components/report/PresentationCharts";

// Chart palette aligned to brand/semantic tokens (see tailwind.config.ts).
import { CHART_COLORS } from "../lib/chartColors";

interface AuditPresentationProps {
  onNavigate: NavigateTo;
}

export default function AuditPresentation({ onNavigate }: AuditPresentationProps) {
  const { i18n, t } = useTranslation();
  const latestReport = useLatestAuditReport();
  const [url, setUrl] = useState<string>("");
  const [techStack, setTechStack] = useState<string>("");
  const [knownIssues, setKnownIssues] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [deckData, setDeckData] = useState<AuditPresentationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const auditReport = latestReport && (!url || latestReport.request.url === url) ? buildAuditReportViewModel(latestReport) : null;

  useEffect(() => {
    if (latestReport?.request?.url && !url) {
      setUrl(latestReport.request.url);
    }
  }, [latestReport, url]);

  // Auto-scroll to slide viewport when changing slide
  const handleSlideSelect = (index: number) => {
    setActiveSlideIndex(index);
    const element = document.getElementById("slide-window-viewport");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  const generatePresentation = async () => {
    if (!url) {
      setError("請填寫網站 URL 或 系統名稱");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("auth_token");
      const intakeData = {
        url,
        techStack,
        knownIssues,
        auditSummary: latestReport?.summary || undefined,
      };

      const lang = i18n.resolvedLanguage || i18n.language;
      const response = await fetch("/api/audit/presentation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...intakeData, language: lang }),
      });

      if (!response.ok) {
        throw new Error("伺服器產生簡報失敗，可能原因為網路超時或驗證過期");
      }

      const result: AuditPresentationResult = await response.json();
      setDeckData(result);
      setActiveSlideIndex(0);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "產生簡報時發生錯誤，請檢查您的登入狀態與輸入格式。");
    } finally {
      setLoading(false);
    }
  };

  // Build Markdown slide content for copy
  const getDeckMarkdown = () => {
    if (!deckData) return "";
    let md = `# ${deckData.url} 網頁效能與速度稽核簡報資料\n`;
    md += `技術棧: ${deckData.techStack}\n`;
    md += `產生時間: ${new Date(deckData.generatedAt).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })}\n`;
    md += `系統效能評比健康度得分: ${auditReport?.scores.overall ?? deckData.overallScore} / 100\n\n`;
    md += `=========================================\n\n`;

    deckData.slides.forEach((slide) => {
      md += `## 投影片 ${slide.slideId}: ${slide.title}\n`;
      md += `副標題: ${slide.subtitle}\n`;
      md += `健康狀態分級: ${slide.healthStatus.toUpperCase()}\n\n`;
      md += `### 【商業與技術核心重點 bullet】\n`;
      slide.bullets.forEach((b) => {
        md += `* **${b}**\n`;
      });
      md += `\n### 【高階主管口述說法與深度說明 (Explanations)】\n`;
      slide.explanations.forEach((e) => {
        md += `* ${e}\n`;
      });
      md += `\n### 【關鍵效能計量指標 (Metrics)】\n`;
      slide.metrics.forEach((m) => {
        md += `* ${m.label}: **${m.value} ${m.unit || ""}** (${m.comparison || "標準對照"})\n`;
      });
      md += `\n### 【技術層面架構洞察 (Technical Insight)】\n`;
      md += `> ${slide.technicalInsight}\n\n`;
      md += `### 【高階主管商業價值結論 (Business Takeaway)】\n`;
      md += `> ${slide.businessTakeaway}\n`;
      md += `\n-----------------------------------------\n\n`;
    });

    return md;
  };

  const handleCopyMarkdown = (index: number) => {
    navigator.clipboard.writeText(getDeckMarkdown());
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const currentSlide = deckData?.slides[activeSlideIndex];
  const slidesViewModel = deckData ? { slides: deckData.slides } : { slides: [] };

  return (
    <main className="relative z-10 pb-20 pt-24 text-brand-text">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ConsoleTabs currentRoute="presentation" onNavigate={onNavigate} />

        {/* Header Title Block */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-black/[0.06] pb-6 md:flex-row md:items-end">
          <Reveal>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-cyan/10 px-3 py-1 text-xs font-medium text-brand-cyan">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              智能簡報架構分析
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">
              網頁效能與速度 ── 稽核簡報大師
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              將深層網頁性能指標，轉譯為具備極高商业說服力的 PowerPoint/Keynote 分級投影片與高階講稿。
            </p>
          </Reveal>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCopyMarkdown(99)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-black/5 border border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--text)] hover:bg-black/5 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60"
            >
              {copiedIndex === 99 ? (
                <>
                  <Check className="h-3.5 w-3.5 text-brand-cyan" />
                  已複製 Markdown
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  複製簡報 Markdown 講稿
                </>
              )}
            </button>
          </div>
        </div>

        {/* Audit Inputs Setup Panel */}
        <div className="mb-10 rounded-sm border border-[var(--border)] bg-black/10 p-5 backdrop-blur-xl md:p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-black/[0.06] pb-3">
            <div className="rounded-sm bg-black/5 p-1.5 text-brand-cyan">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)]">設定稽核環境背景</h2>
              <p className="text-xs text-slate-400">輸入目標環境資料來由 AI 分析，能無縫整合現有系統不生影響。</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="target-url" className="text-xs font-medium text-slate-300 block mb-1">
                目標網站名稱或 URL
              </label>
              <input
                id="target-url"
                type="text"
                placeholder="例如: https://roamjelly-travel.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] placeholder-white/30 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
              />
            </div>

            <div>
              <label htmlFor="tech-stack" className="text-xs font-medium text-slate-300 block mb-1">
                目前技術棧 (Tech Stack)
              </label>
              <input
                id="tech-stack"
                type="text"
                placeholder="例如: React + .NET 8 Web API + PostgreSQL"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] placeholder-white/30 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
              />
            </div>

            <div>
              <label htmlFor="known-issue" className="text-xs font-medium text-slate-300 block mb-1">
                主要已知效能痛點
              </label>
              <input
                id="known-issue"
                type="text"
                placeholder="例如: 熱門景點搜尋超過 5 秒、API 延遲很高"
                value={knownIssues}
                onChange={(e) => setKnownIssues(e.target.value)}
                className="w-full rounded-sm border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs text-[var(--text)] placeholder-white/30 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-sm border border-red-500/[0.15] bg-red-500/[0.05] px-4 py-3 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={generatePresentation}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-sm bg-gradient-to-r from-brand-cyan to-brand-green px-6 py-3 text-xs font-bold text-slate-950 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition shadow-lg shadow-brand-cyan/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  AI 架構師正在深度稽核效能數據...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  生成專屬稽核簡報投影片
                </>
              )}
            </button>
          </div>
        </div>

        {auditReport ? (
          <section className="mb-10 space-y-8 border-y border-black/10 py-7" aria-label="Shared audit report data">
            <AuditScoreBoard
              scores={auditReport.scores}
              labels={{
                overall: t("auditReport.scores.overall"),
                performance: t("auditReport.scores.performance"),
                seo: t("auditReport.scores.seo"),
                architecture: t("auditReport.scores.architecture"),
              }}
            />
            <AuditCharts viewModel={auditReport} t={t} />
            <AuditFindings findings={auditReport.findings} t={t} />
          </section>
        ) : null}

        {/* Interactive Deck Layout */}
        {(deckData && currentSlide) ? (
          <div id="slide-window-viewport" className="grid gap-6 lg:grid-cols-4">
            {/* Data-source disclosure: which numbers are measured vs modeled */}
            {deckData.measuredEvidence && (
              <div className={`lg:col-span-4 rounded-sm border p-4 ${
                deckData.measuredEvidence.source === "crux"
                  ? "border-brand-cyan/20 bg-brand-cyan/[0.04]"
                  : "border-amber-400/20 bg-amber-400/[0.04]"
              }`}>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    deckData.measuredEvidence.source === "crux"
                      ? "bg-brand-cyan/15 text-brand-cyan"
                      : "bg-amber-400/15 text-amber-300"
                  }`}>
                    {deckData.measuredEvidence.source === "crux" ? (
                      <><CheckCircle className="h-3 w-3" />真實使用者數據 (CrUX)</>
                    ) : (
                      <><AlertTriangle className="h-3 w-3" />模型推估示意</>
                    )}
                  </span>
                  <p className="flex-1 min-w-[240px] text-[11px] leading-relaxed text-slate-300">
                    {deckData.measuredEvidence.note}
                  </p>
                </div>
                {deckData.measuredEvidence.source === "crux" && deckData.measuredEvidence.crux && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {([
                      { id: "lcp", label: "LCP", m: deckData.measuredEvidence.crux.lcp, fmt: (v: number) => `${(v / 1000).toFixed(2)}s` },
                      { id: "inp", label: "INP", m: deckData.measuredEvidence.crux.inp, fmt: (v: number) => `${Math.round(v)}ms` },
                      { id: "cls", label: "CLS", m: deckData.measuredEvidence.crux.cls, fmt: (v: number) => v.toFixed(3) },
                    ] as const).map(({ id, label, m, fmt }) => (
                      <div key={id} className="rounded-sm bg-black/5 border border-black/[0.05] p-2">
                        <div className="text-[10px] text-slate-400">{label}</div>
                        <div className={`text-sm font-bold mt-0.5 ${
                          m.rating === "good" ? "text-[#05FFC4]" : m.rating === "needs-improvement" ? "text-amber-300" : m.rating === "poor" ? "text-brand-danger" : "text-slate-400"
                        }`}>
                          {m.p75 != null ? fmt(m.p75) : "無數據"}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{m.rating ?? "—"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sidebar Navigation: Slide Toggles */}
            <div className="lg:col-span-1 space-y-3">
              <div className="rounded-sm bg-black/10 border border-[var(--border)] p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  簡報投影片目錄
                </h3>

                <div className="space-y-2.5">
                  {deckData.slides.map((slide, index) => {
                    const isActive = activeSlideIndex === index;
                    return (
                      <button
                        key={slide.slideId}
                        onClick={() => handleSlideSelect(index)}
                        className={`w-full rounded-sm border p-3 text-left transition relative overflow-hidden group ${
                          isActive
                            ? "bg-brand-cyan/[0.06] border-brand-cyan/50 shadow-md"
                            : "bg-black/5 border-black/[0.04] hover:bg-black/5 hover:border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            aria-hidden="true"
                            className={`mt-0.5 rounded-full h-2 w-2 shrink-0 ${
                            slide.healthStatus === "red"
                              ? "bg-brand-danger animate-pulse"
                              : slide.healthStatus === "yellow"
                              ? "bg-amber-400"
                              : "bg-brand-green"
                        }`}
                          />
                          <span className="sr-only">
                            {slide.healthStatus === "red" ? "高衝擊" : slide.healthStatus === "yellow" ? "中衝擊" : "低衝擊"}
                          </span>
                          <div>
                            <div className={`text-[10px] font-medium tracking-wide uppercase transition ${
                              isActive ? "text-brand-cyan" : "text-slate-400 group-hover:text-slate-300"
                            }`}>
                              Slide {slide.slideId}
                            </div>
                            <div className={`text-xs font-semibold mt-0.5 transition truncate max-w-[180px] ${
                              isActive ? "text-[var(--text)]" : "text-slate-300 group-hover:text-[var(--text)]"
                            }`}>
                              {slide.title}
                            </div>
                          </div>
                        </div>

                        {isActive && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-cyan" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Score badge under selector */}
                <div className="mt-5 border-t border-black/[0.06] pt-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">整體效能健康度得分</div>
                    <div className="text-2xl font-bold text-[var(--text)] mt-0.5">{deckData.overallScore} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
                  </div>
                  <div className={`rounded-sm px-2.5 py-1.5 text-xs font-bold text-slate-950 ${
                    deckData.overallScore < 60
                      ? "bg-brand-danger/90 text-[var(--text)]"
                      : deckData.overallScore < 80
                      ? "bg-amber-400"
                      : "bg-brand-green"
                  }`}>
                    {deckData.overallScore < 60 ? "紅色預警" : deckData.overallScore < 80 ? "中度警告" : "安全良好"}
                  </div>
                </div>
              </div>

              {/* Quick Context details card */}
              <div className="p-4 rounded-sm bg-black/5 border border-black/[0.05]">
                <h4 className="text-xs font-semibold text-[var(--text)] mb-2">當前稽核環境</h4>
                <div className="space-y-2 text-[11px] text-slate-400">
                  <div>
                    <span className="text-slate-500 font-medium block">網站:</span>
                    <span className="text-slate-300 block truncate">{deckData.url}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">系統架構:</span>
                    <span className="text-slate-300 block leading-relaxed">{deckData.techStack}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium block">稽核模組:</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-brand-cyan" />
                      <span>{deckData.modelUsed || "無數據"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Slide Canvas */}
            <div className="lg:col-span-3 space-y-6">
              {/* The Physical Slide Component Canvas */}
              <div className="rounded-sm border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                <div className="absolute top-0 right-0 h-[200px] w-[200px] bg-brand-cyan/5 rounded-full blur-3xl -z-10" />

                {/* Slide Meta Top Bar */}
                <div className="mb-6 flex items-center justify-between border-b border-black/[0.06] pb-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-black/5 px-3 py-1 text-[11px] font-bold text-brand-cyan">
                      投影片 {currentSlide.slideId} / 5
                    </div>
                    <span className="text-xs text-slate-500 font-mono">
                      Audit Presentation Projector
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      衝擊等級:
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      currentSlide.healthStatus === "red"
                        ? "bg-red-500/10 text-brand-danger"
                        : currentSlide.healthStatus === "yellow"
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-brand-green/10 text-brand-green"
                    }`}>
                      {currentSlide.healthStatus === "red" ? "高 (紅色預警)" : currentSlide.healthStatus === "yellow" ? "中 (黃色警告)" : "低 (安全指標)"}
                    </span>
                  </div>
                </div>

                {/* Grid split: Left bullet textual details, right visualization */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Left side: Core bullet lists */}
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">
                        {currentSlide.title}
                      </h2>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    {/* Bullet points mapping */}
                    <div className="space-y-3">
                      {currentSlide.bullets.map((bullet, idx) => (
                        <div key={idx} className="flex gap-2.5 items-start">
                          <div className="mt-1 rounded bg-[var(--surface)] p-1 text-brand-cyan shrink-0">
                            <Activity className="h-3 w-3" />
                          </div>
                          <div className="text-xs font-semibold leading-relaxed text-slate-200">
                            {bullet}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-black/[0.06] pt-4 space-y-3">
                      {/* Technical insight details badge */}
                      <div className="rounded-sm bg-black/5 border border-black/[0.04] p-3 text-left">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="h-3 w-3 text-brand-cyan" />
                          技術層架構稽核剖析 (Technical Insight)
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                          {currentSlide.technicalInsight}
                        </p>
                      </div>

                      {/* Business value takeaway badge */}
                      <div className="rounded-sm bg-brand-cyan/[0.03] border border-brand-cyan/15 p-3 text-left">
                        <div className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-brand-cyan" />
                          高階主管商業價值 (Business Takeaway)
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed mt-1 font-medium">
                          {currentSlide.businessTakeaway}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right side: Recharts Visualization Chart Box */}
                  <div className="flex flex-col rounded-sm border border-[var(--border)] bg-[var(--surface)] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-[var(--text)]">
                        即時數據化關聯圖表
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currentSlide.chartType.toUpperCase()} CHART
                      </span>
                    </div>

                    {/* Visual container block. Decorative for SR users — the metric
                        table below is the accessible data alternative. */}
                    <div
                      role="img"
                      aria-label={`${currentSlide.title} — ${currentSlide.chartType.toUpperCase()} 圖表。完整數值見下方「數據指標明細」表格。`}
                      className="h-[210px] w-full shrink-0"
                    >
                      <PresentationChart slide={slidesViewModel.slides[activeSlideIndex] ?? currentSlide} />
                    </div>

                    {/* Extra Data Table: mobile optimization - ensures high mobile visibility */}
                    <div className="mt-4 border-t border-black/[0.06] pt-3">
                      <div className="text-[11px] font-bold text-slate-300 mb-2">數據指標明細 (手機端完整適配)</div>
                      <div className="grid gap-2 grid-cols-3">
                        {currentSlide.metrics.map((metric, mIdx) => (
                          <div key={mIdx} className="rounded-sm bg-black/5 p-2 border border-black/[0.03]">
                            <div className="text-[10px] text-slate-400 truncate">{metric.label}</div>
                            <div className="text-sm font-extrabold text-[var(--text)] mt-0.5">
                              {metric.value} <span className="text-[10px] font-medium text-slate-400">{metric.unit}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5 truncate">{metric.comparison}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Lower Switch Slides Buttons */}
                <div className="mt-8 flex items-center justify-between border-t border-black/[0.06] pt-4">
                  <button
                    type="button"
                    disabled={activeSlideIndex === 0}
                    onClick={() => handleSlideSelect(activeSlideIndex - 1)}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-sm px-2 text-xs text-slate-400 hover:text-[var(--text)] disabled:opacity-30 disabled:hover:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    上一頁投影片
                  </button>

                  <div className="flex gap-0.5">
                    {deckData.slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSlideSelect(idx)}
                        className="inline-flex h-11 min-w-[28px] items-center justify-center rounded-full px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60"
                        aria-label={`切換至投影片 ${idx + 1}`}
                        aria-current={activeSlideIndex === idx ? "true" : undefined}
                      >
                        <span
                          aria-hidden="true"
                          className={`block h-1.5 rounded-full transition-all duration-300 ${
                            activeSlideIndex === idx ? "w-6 bg-brand-cyan" : "w-1.5 bg-slate-700 hover:bg-slate-500"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={activeSlideIndex === deckData.slides.length - 1}
                    onClick={() => handleSlideSelect(activeSlideIndex + 1)}
                    className="inline-flex min-h-[44px] items-center gap-1 rounded-sm px-2 text-xs text-slate-400 hover:text-[var(--text)] disabled:opacity-30 disabled:hover:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60"
                  >
                    下一頁投影片
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

              </div>

              {/* Speaking Talktracks / Speaker Notes for C-level Reporting */}
              <div className="rounded-sm border border-black/[0.06] bg-[var(--surface)] p-5">
                <div className="flex items-center gap-2 mb-3 border-b border-black/[0.06] pb-2">
                  <div className="rounded p-1 bg-brand-green/10 text-brand-green">
                    <Monitor className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    投影片講師口述說辭 (C-Level Presenter Talk-Tracks)
                  </h3>
                </div>

                <div className="space-y-3.5">
                  {currentSlide.explanations.map((para, idx) => (
                    <p key={idx} className="text-xs leading-relaxed text-slate-300">
                      <span className="font-bold text-brand-cyan mr-1.5">講稿路徑段落 {idx + 1}:</span>
                      {para}
                    </p>
                  ))}
                </div>

                <div className="mt-4 rounded-sm border border-brand-cyan/10 bg-brand-cyan/[0.02] p-3 text-xs leading-relaxed text-brand-cyan/80">
                  <strong>💡 報告實戰提示:</strong> 行向主管報告此投影片時，請先點出右側「數據化圖表」的落差（例如 LCP 或 轉換率損耗），直接銜接「商業價值利益（Business Takeaway）」說明，隨後引用「技術層洞察（Technical Insight）」作為科學研發團隊承接改造的具體修復背書。
                </div>
              </div>

              {/* Mobile Adaptive Data View (Always displayed nicely for extra dense mobile grids) */}
              <div className="rounded-sm border border-[var(--border)] p-5 bg-black/5 block md:hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="h-4 w-4 text-brand-cyan" />
                  <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
                    手機端多維效能明細表格 (Mobile Data Grid)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  以下列出完整 5 張投影片最底層量化指標與時間預測對照表，確保您在手機操作時不漏空任何硬核細節。
                </p>

                <div className="space-y-4">
                  {deckData.slides.map((s) => (
                    <div key={s.slideId} className="border-b border-black/[0.06] pb-3 last:border-b-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text)]">{s.slideId}. {s.title}</span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                            {s.healthStatus === "red" ? "高" : s.healthStatus === "yellow" ? "中" : "低"}
                          </span>
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${
                              s.healthStatus === "red" ? "bg-red-500" : s.healthStatus === "yellow" ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                          />
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {s.metrics.map((m, mIdx) => (
                          <div key={mIdx} className="bg-black/5 p-1.5 rounded border border-black/[0.04]">
                            <span className="text-slate-500 block">{m.label}</span>
                            <span className="text-slate-200 block font-semibold mt-0.5">{m.value} {m.unit}</span>
                            <span className="text-slate-500 text-[8px] block">{m.comparison}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center flex-1 justify-center rounded-sm border border-[var(--border)] bg-black/10 p-12 text-center">
            <Monitor className="mb-4 h-12 w-12 text-slate-500 opacity-50" />
            <h3 className="text-lg font-semibold text-[var(--text)]">尚未生成簡報</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              請填寫上方的環境資料，並點擊「生成專屬稽核簡報投影片」，AI 將為您即時產生深度分析簡報與高階講稿。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}