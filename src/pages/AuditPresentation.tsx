import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLatestAuditReport } from "../hooks/useLatestAuditReport";
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
  PieChart as LucidePieChart
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import type { AuditPresentationResult, AuditSlide, SlideChartData, SlideMetric } from "../types/presentation";
import type { NavigateTo } from "../types/home";
import ConsoleTabs from "../components/ui/ConsoleTabs";

const CHART_COLORS = ["#00F2FE", "#05FFC4", "#FF2255", "#FFBB28", "#8884d8"];

interface AuditPresentationProps {
  onNavigate: NavigateTo;
}

export default function AuditPresentation({ onNavigate }: AuditPresentationProps) {
  const latestReport = useLatestAuditReport();
  const [url, setUrl] = useState<string>("");
  const [techStack, setTechStack] = useState<string>("");
  const [knownIssues, setKnownIssues] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [deckData, setDeckData] = useState<AuditPresentationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      const requestBody = {
        url,
        techStack,
        knownIssues,
        auditSummary: latestReport?.summary || undefined
      };

      const response = await fetch("/api/audit/presentation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
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
    md += `系統效能評比健康度得分: ${deckData.overallScore} / 100\n\n`;
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

  // Helper to render Recharts custom components based on slide chartType
  const renderSlideChart = (slide: AuditSlide) => {
    switch (slide.chartType) {
      case "conversion":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={slide.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22334F" />
              <XAxis dataKey="speed" stroke="#94A3B8" style={{ fontSize: 11 }} />
              <YAxis yAxisId="left" orientation="left" stroke="#00F2FE" label={{ value: "轉換率 (%)", angle: -90, position: "insideLeft", fill: "#00F2FE", style: { fontSize: 11, textAnchor: 'middle' } }} />
              <YAxis yAxisId="right" orientation="right" stroke="#FF2255" label={{ value: "跳出率 (%)", angle: 90, position: "insideRight", fill: "#FF2255", style: { fontSize: 11, textAnchor: 'middle' } }} />
              <Tooltip contentStyle={{ backgroundColor: "#0A192F", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="conversion" name="訂單轉換率" stroke="#00F2FE" strokeWidth={2.5} activeDot={{ r: 8 }} />
              <Line yAxisId="right" type="monotone" dataKey="bounce" name="行動端跳出率" stroke="#FF2255" strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        );
      case "cvw":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slide.chartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22334F" />
              <XAxis type="number" stroke="#94A3B8" style={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="#94A3B8" style={{ fontSize: 11, width: 120 }} width={120} />
              <Tooltip contentStyle={{ backgroundColor: "#0A192F", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="current" name="當前系統實測" fill="#FFBB28">
                {slide.chartData.map((entry, index) => (
                  <Cell key={`cell-curr-${index}`} fill={entry.current > entry.good ? "#FF2255" : "#05FFC4"} />
                ))}
              </Bar>
              <Bar dataKey="good" name="Google 綠色標準臨界值" fill="#05FFC4" stroke="#00F0FF" strokeDasharray="2" />
            </BarChart>
          </ResponsiveContainer>
        );
      case "backend":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slide.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22334F" />
              <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
              <YAxis stroke="#94A3B8" label={{ value: "延遲時間 (毫秒)", angle: -90, position: "insideLeft", stroke: "#94A3B8", style: { fontSize: 11 } }} style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0A192F", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="current" name="優化前" fill="#FF2255" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" name="優化後目標" fill="#05FFC4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      case "network":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, bottom: 10 }}>
              <Pie
                data={slide.chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {slide.chartData.map((entry, index) => (
                  <Cell key={`cell-pie-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#0A192F", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 12 }} />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        );
      case "action":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slide.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#22334F" />
              <XAxis dataKey="name" stroke="#94A3B8" style={{ fontSize: 10 }} />
              <YAxis stroke="#94A3B8" domain={[0, 100]} style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: "#0A192F", border: "1px solid #1E293B", borderRadius: "8px", fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Bar dataKey="impact" name="優化效益 (0-100)" fill="#05FFC4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="effort" name="開發難度 (0-100)" fill="#FF2255" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b15] text-slate-100 pb-20 pt-24">
      {/* Mesh Background */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[500px] bg-gradient-to-b from-[#0a142c] to-transparent opacity-40" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <ConsoleTabs currentRoute="presentation" onNavigate={onNavigate} />

        {/* Header Title Block */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/[0.06] pb-6 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-cyan/10 px-3 py-1 text-xs font-medium text-brand-cyan">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              智能簡報架構分析
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
              網頁效能與速度 ── 稽核簡報大師
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              將深層網頁性能指標，轉譯為具備極高商业說服力的 PowerPoint/Keynote 分級投影片與高階講稿。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCopyMarkdown(99)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/[0.08] active:scale-95 transition"
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
        <div className="mb-10 rounded-2xl border border-white/[0.06] bg-[#0c1328]/35 p-5 backdrop-blur-xl md:p-6">
          <div className="mb-4 flex items-center gap-2.5 border-b border-white/[0.06] pb-3">
            <div className="rounded-lg bg-white/[0.05] p-1.5 text-brand-cyan">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">設定稽核環境背景</h2>
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
                className="w-full rounded-xl border border-white/10 bg-[#091024]/80 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
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
                className="w-full rounded-xl border border-white/10 bg-[#091024]/80 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
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
                className="w-full rounded-xl border border-white/10 bg-[#091024]/80 px-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan/50"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/[0.15] bg-red-500/[0.05] px-4 py-3 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={generatePresentation}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-green px-6 py-3 text-xs font-bold text-slate-950 hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:scale-100 transition shadow-lg shadow-brand-cyan/25"
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

        {/* Interactive Deck Layout */}
        {deckData ? (
          <div id="slide-window-viewport" className="grid gap-6 lg:grid-cols-4">
            
            {/* Sidebar Navigation: Slide Toggles */}
            <div className="lg:col-span-1 space-y-3">
              <div className="rounded-xl bg-[#0d142a]/60 border border-white/[0.06] p-4">
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
                      className={`w-full rounded-xl border p-3 text-left transition relative overflow-hidden group ${
                        isActive
                          ? "bg-brand-cyan/[0.06] border-brand-cyan/50 shadow-md"
                          : "bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-0.5 rounded-full h-2 w-2 shrink-0 ${
                          slide.healthStatus === "red"
                            ? "bg-brand-danger animate-pulse"
                            : slide.healthStatus === "yellow"
                            ? "bg-amber-400"
                            : "bg-[#05FFC4]"
                        }`} />
                        <div>
                          <div className={`text-[10px] font-medium tracking-wide uppercase transition ${
                            isActive ? "text-brand-cyan" : "text-slate-400 group-hover:text-slate-300"
                          }`}>
                            Slide {slide.slideId}
                          </div>
                          <div className={`text-xs font-semibold mt-0.5 transition truncate max-w-[180px] ${
                            isActive ? "text-white" : "text-slate-300 group-hover:text-white"
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
              <div className="mt-5 border-t border-white/[0.06] pt-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">整體效能健康度得分</div>
                  <div className="text-2xl font-bold text-white mt-0.5">{deckData.overallScore} <span className="text-xs font-normal text-slate-400">/ 100</span></div>
                </div>
                <div className={`rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-950 ${
                  deckData.overallScore < 60
                    ? "bg-brand-danger/90 text-white"
                    : deckData.overallScore < 80
                    ? "bg-amber-400"
                    : "bg-brand-green"
                }`}>
                  {deckData.overallScore < 60 ? "紅色預警" : deckData.overallScore < 80 ? "中度警告" : "安全良好"}
                </div>
              </div>
            </div>

            {/* Quick Context details card */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
              <h4 className="text-xs font-semibold text-white mb-2">當前稽核環境</h4>
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
            <div className="rounded-2xl border border-white/10 bg-[#060b18] p-6 shadow-2xl relative overflow-hidden ring-1 ring-white/5">
              <div className="absolute top-0 right-0 h-[200px] w-[200px] bg-sky-500/5 rounded-full blur-3xl -z-10" />
              
              {/* Slide Meta Top Bar */}
              <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-white/[0.05] px-3 py-1 text-[11px] font-bold text-brand-cyan">
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
                      : "bg-emerald-500/10 text-[#05FFC4]"
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
                    <h2 className="text-xl font-bold tracking-tight text-white">
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
                        <div className="mt-1 rounded bg-[#091a32] p-1 text-brand-cyan shrink-0">
                          <Activity className="h-3 w-3" />
                        </div>
                        <div className="text-xs font-semibold leading-relaxed text-slate-200">
                          {bullet}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/[0.06] pt-4 space-y-3">
                    {/* Technical insight details badge */}
                    <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 text-left">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="h-3 w-3 text-brand-cyan" />
                        技術層架構稽核剖析 (Technical Insight)
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed mt-1">
                        {currentSlide.technicalInsight}
                      </p>
                    </div>

                    {/* Business value takeaway badge */}
                    <div className="rounded-xl bg-brand-cyan/[0.03] border border-brand-cyan/15 p-3 text-left">
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
                <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#091024]/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      即時數據化關聯圖表
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {currentSlide.chartType.toUpperCase()} CHART
                    </span>
                  </div>

                  {/* Visual container block */}
                  <div className="h-[210px] w-full shrink-0">
                    {renderSlideChart(currentSlide)}
                  </div>

                  {/* Extra Data Table: mobile optimization - ensures high mobile visibility */}
                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <div className="text-[11px] font-bold text-slate-300 mb-2">數據指標明細 (手機端完整適配)</div>
                    <div className="grid gap-2 grid-cols-3">
                      {currentSlide.metrics.map((metric, mIdx) => (
                        <div key={mIdx} className="rounded-lg bg-white/[0.02] p-2 border border-white/[0.03]">
                          <div className="text-[10px] text-slate-400 truncate">{metric.label}</div>
                          <div className="text-sm font-extrabold text-white mt-0.5">
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
              <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-4">
                <button
                  type="button"
                  disabled={activeSlideIndex === 0}
                  onClick={() => handleSlideSelect(activeSlideIndex - 1)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一頁投影片
                </button>

                <div className="flex gap-1.5">
                  {deckData.slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSlideSelect(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        activeSlideIndex === idx ? "w-6 bg-brand-cyan" : "w-1.5 bg-slate-700 hover:bg-slate-500"
                      }`}
                      aria-label={`切換至投影片 ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  disabled={activeSlideIndex === deckData.slides.length - 1}
                  onClick={() => handleSlideSelect(activeSlideIndex + 1)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                >
                  下一頁投影片
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

            </div>

            {/* Speaking Talktracks / Speaker Notes for C-level Reporting */}
            <div className="rounded-2xl border border-white/[0.06] bg-slate-950 p-5">
              <div className="flex items-center gap-2 mb-3 border-b border-white/[0.06] pb-2">
                <div className="rounded p-1 bg-[#152e1f] text-[#05FFC4]">
                  <Monitor className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white">
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

              <div className="mt-4 rounded-xl border border-brand-cyan/10 bg-brand-cyan/[0.02] p-3 text-xs leading-relaxed text-brand-cyan/80">
                <strong>💡 報告實戰提示:</strong> 行向主管報告此投影片時，請先點出右側「數據化圖表」的落差（例如 LCP 或 轉換率損耗），直接銜接「商業價值利益（Business Takeaway）」說明，隨後引用「技術層洞察（Technical Insight）」作為科學研發團隊承接改造的具體修復背書。
              </div>
            </div>

            {/* Mobile Adaptive Data View (Always displayed nicely for extra dense mobile grids) */}
            <div className="rounded-2xl border border-white/[0.06] p-5 bg-[#091124]/30 block md:hidden">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-4 w-4 text-brand-cyan" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  手機端多維效能明細表格 (Mobile Data Grid)
                </h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                以下列出完整 5 張投影片最底層量化指標與時間預測對照表，確保您在手機操作時不漏空任何硬核細節。
              </p>

              <div className="space-y-4">
                {deckData.slides.map((s) => (
                  <div key={s.slideId} className="border-b border-white/[0.06] pb-3 last:border-b-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.slideId}. {s.title}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        s.healthStatus === "red" ? "bg-red-500" : s.healthStatus === "yellow" ? "bg-amber-400" : "bg-emerald-400"
                      }`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      {s.metrics.map((m, mIdx) => (
                        <div key={mIdx} className="bg-white/[0.02] p-1.5 rounded border border-white/[0.04]">
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
          <div className="flex flex-col items-center flex-1 justify-center rounded-2xl border border-white/[0.06] bg-[#0c1328]/35 p-12 text-center">
            <Monitor className="mb-4 h-12 w-12 text-slate-500 opacity-50" />
            <h3 className="text-lg font-semibold text-white">尚未生成簡報</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-md">
              請填寫上方的環境資料，並點擊「生成專屬稽核簡報投影片」，AI 將為您即時產生深度分析簡報與高階講稿。
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
