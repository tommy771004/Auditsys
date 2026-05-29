/**
 * InteractiveStatesDemo
 *
 * 完整展示 Press & Hover States 的互動設計展示頁。
 * 包含：
 *  - InteractiveCard 五種 variant 展示
 *  - 互動按鈕比較（一般 CSS vs Spring 物理效果）
 *  - 鍵盤無障礙展示區
 *  - 互動設計原則說明卡
 *
 * 設計語言：深色玻璃態（Glass Morphism）+ 彈簧物理動畫
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Zap,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  MousePointer2,
  Smartphone,
  Keyboard,
  ChevronRight,
  Star,
  Activity,
  Lock,
  Globe,
  BarChart3,
} from "lucide-react";
import InteractiveCard from "../components/ui/InteractiveCard";

// ── Spring configs (reused for demo buttons) ──────────────────────────────────

const BUTTON_SPRING = { type: "spring", stiffness: 500, damping: 28 } as const;
const HOVER_SPRING  = { type: "spring", stiffness: 260, damping: 22 } as const;

// ── Demo data ─────────────────────────────────────────────────────────────────

const CARD_DEMOS = [
  {
    id: "security",
    variant: "default" as const,
    icon: ShieldCheck,
    iconColor: "text-violet-300",
    iconBg: "bg-violet-400/15 border-violet-400/20",
    label: "Security Score",
    value: "A+",
    valueColor: "text-emerald-300",
    description: "Content-Security-Policy, HSTS, X-Frame-Options 全部通過",
    badge: "已保護",
    badgeStyle: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
    accentLine: true,
  },
  {
    id: "performance",
    variant: "success" as const,
    icon: Zap,
    iconColor: "text-emerald-300",
    iconBg: "bg-emerald-400/15 border-emerald-400/20",
    label: "Core Web Vitals",
    value: "92",
    valueColor: "text-emerald-300",
    description: "LCP 1.8s · INP 42ms · CLS 0.04 — 超越 90% 競品",
    badge: "優秀",
    badgeStyle: "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
    accentLine: true,
  },
  {
    id: "seo",
    variant: "warning" as const,
    icon: TrendingUp,
    iconColor: "text-amber-300",
    iconBg: "bg-amber-400/15 border-amber-400/20",
    label: "SEO 健康度",
    value: "67",
    valueColor: "text-amber-300",
    description: "缺少 Open Graph 標籤，結構化資料待補強",
    badge: "需改善",
    badgeStyle: "bg-amber-400/15 text-amber-300 border-amber-400/20",
    accentLine: true,
  },
  {
    id: "risk",
    variant: "danger" as const,
    icon: AlertTriangle,
    iconColor: "text-rose-300",
    iconBg: "bg-rose-400/15 border-rose-400/20",
    label: "資安風險",
    value: "3",
    valueColor: "text-rose-300",
    description: "CSP 缺失 · HSTS max-age 過短 · X-Frame-Options 未設定",
    badge: "立即修復",
    badgeStyle: "bg-rose-400/15 text-rose-300 border-rose-400/20",
    accentLine: true,
  },
  {
    id: "overview",
    variant: "ghost" as const,
    icon: BarChart3,
    iconColor: "text-white/60",
    iconBg: "bg-white/[0.06] border-white/10",
    label: "總覽報告",
    value: "78",
    valueColor: "text-white/90",
    description: "14 項指標 · 上次掃描：5 分鐘前 · 趨勢持平",
    badge: "Ghost",
    badgeStyle: "bg-white/[0.06] text-white/50 border-white/10",
    accentLine: false,
  },
] as const;

const BUTTON_DEMOS = [
  {
    id: "primary",
    label: "主要動作",
    description: "Spring stiffness: 500, damping: 28",
    className:
      "bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.4)]",
    hoverShadow: "0 0 45px rgba(6,182,212,0.5)",
    icon: Sparkles,
  },
  {
    id: "ghost",
    label: "次要動作",
    description: "Spring stiffness: 400, damping: 25",
    className: "border border-white/15 bg-white/[0.06] text-white/90",
    hoverShadow: "0 0 20px rgba(255,255,255,0.08)",
    icon: ChevronRight,
  },
  {
    id: "danger",
    label: "危險動作",
    description: "Spring stiffness: 600, damping: 30",
    className: "bg-rose-500/80 text-white border border-rose-400/30",
    hoverShadow: "0 0 30px rgba(251,113,133,0.4)",
    icon: AlertTriangle,
  },
] as const;

// ── Principle cards ───────────────────────────────────────────────────────────

const PRINCIPLES = [
  {
    id: "hover",
    icon: MousePointer2,
    color: "text-cyan-300",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    title: "Desktop Hover",
    desc: "whileHover: y:-6, scale:1.015",
    detail: "柔和上浮 + 陰影綻放。彈簧 stiffness 260, damping 22 讓卡片緩慢升起，不急促。",
  },
  {
    id: "tap",
    icon: Smartphone,
    color: "text-violet-300",
    bg: "bg-violet-400/10 border-violet-400/20",
    title: "Mobile / Tap",
    desc: "whileTap: scale:0.97",
    detail: "彈回感強烈，stiffness 500, damping 30 模擬真實按壓的物理彈性。",
  },
  {
    id: "keyboard",
    icon: Keyboard,
    color: "text-emerald-300",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    title: "Keyboard Nav",
    desc: ":focus-visible ring-2",
    detail: "僅在鍵盤聚焦時顯示外框，滑鼠操作不影響。符合 WCAG 2.4.7 標準。",
  },
];

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimatedValue({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="tabular-nums"
    >
      {value}
    </motion.span>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="space-y-2 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="mx-auto max-w-lg text-sm leading-7 text-white/50">{subtitle}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InteractiveStatesDemo() {
  const [clickedCard, setClickedCard] = useState<string | null>(null);
  const [activeButton, setActiveButton] = useState<string | null>(null);

  function handleCardClick(id: string) {
    setClickedCard(id);
    setTimeout(() => setClickedCard(null), 1800);
  }

  function handleButtonClick(id: string) {
    setActiveButton(id);
    setTimeout(() => setActiveButton(null), 1200);
  }

  return (
    <main className="relative min-h-screen bg-slate-950 pb-32 pt-24 text-white">
      {/* Background ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/3 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-indigo-500/8 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* ── Hero ───────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-20 text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200/90">
            <Activity className="h-3.5 w-3.5" />
            UI / UX · Spring Physics
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Press &amp; Hover{" "}
            <span className="bg-gradient-to-r from-violet-400 via-cyan-300 to-violet-400 bg-clip-text text-transparent">
              States
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-8 text-white/50">
            以 Framer Motion 彈簧物理效果打造的互動元件設計系統。
            桌面 Hover、手機 Tap、鍵盤導覽三者完整兼顧。
          </p>
        </motion.div>

        {/* ── Design Principles ──────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45 }}
          className="mb-20 space-y-8"
        >
          <SectionHeader
            eyebrow="設計原則"
            title="三軸互動兼顧"
            subtitle="桌面端 Hover、觸控 Tap、鍵盤 Focus — 每個使用場景都有最佳回饋"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            {PRINCIPLES.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 280, damping: 22 }}
                >
                  <InteractiveCard
                    variant="ghost"
                    className="h-full p-5"
                    aria-label={p.title}
                  >
                    <div className="space-y-3">
                      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${p.bg}`}>
                        <Icon className={`h-5 w-5 ${p.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{p.title}</p>
                        <code className="mt-0.5 block text-[11px] text-white/40">{p.desc}</code>
                      </div>
                      <p className="text-xs leading-5 text-white/55">{p.detail}</p>
                    </div>
                  </InteractiveCard>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Card Variants ──────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.45 }}
          className="mb-20 space-y-8"
        >
          <SectionHeader
            eyebrow="Card Variants"
            title="五種語意卡片"
            subtitle="懸停看陰影綻放，點擊感受彈簧壓縮 — 游標還能帶動 3D 視差傾斜"
          />

          {/* Keyboard nav hint */}
          <div className="flex items-center justify-center gap-2 text-xs text-white/30">
            <Keyboard className="h-3.5 w-3.5" />
            <span>用 Tab 鍵切換卡片，Enter / Space 觸發點擊，看看 focus 外框</span>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CARD_DEMOS.map((card, i) => {
              const Icon = card.icon;
              const isClicked = clickedCard === card.id;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.07, type: "spring", stiffness: 300, damping: 26 }}
                  className={i === 4 ? "sm:col-span-2 lg:col-span-1" : ""}
                >
                  <InteractiveCard
                    variant={card.variant}
                    accentLine={card.accentLine}
                    onClick={() => handleCardClick(card.id)}
                    aria-label={`${card.label}：${card.value}`}
                    className="h-full cursor-pointer p-5"
                  >
                    <div className="flex h-full flex-col gap-4">
                      {/* Top row */}
                      <div className="flex items-start justify-between">
                        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${card.iconBg}`}>
                          <Icon className={`h-5 w-5 ${card.iconColor}`} />
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${card.badgeStyle}`}>
                          {card.badge}
                        </span>
                      </div>

                      {/* Score */}
                      <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-white/40">{card.label}</p>
                        <p className={`mt-1 text-4xl font-bold tabular-nums ${card.valueColor}`}>
                          <AnimatedValue value={isClicked ? "✓" : card.value} />
                        </p>
                      </div>

                      {/* Description */}
                      <p className="mt-auto text-xs leading-5 text-white/50">{card.description}</p>

                      {/* Click feedback */}
                      <AnimatePresence>
                        {isClicked && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-xl bg-white/[0.06] px-3 py-2 text-center text-xs text-white/60">
                              ✓ 已選取 — 彈簧壓縮感
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </InteractiveCard>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Button Spring Comparison ───────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="mb-20 space-y-8"
        >
          <SectionHeader
            eyebrow="Button States"
            title="按鈕彈簧物理對比"
            subtitle="相同的 whileHover / whileTap，但 stiffness / damping 不同，感受截然不同的彈性"
          />

          <div className="grid gap-6 sm:grid-cols-3">
            {BUTTON_DEMOS.map((btn, i) => {
              const Icon = btn.icon;
              const isActive = activeButton === btn.id;

              return (
                <motion.div
                  key={btn.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                  className="rounded-[20px] border border-white/10 bg-white/[0.03] p-6 text-center"
                >
                  <p className="mb-1 text-xs font-semibold text-white/70">{btn.label}</p>
                  <code className="mb-5 block text-[10px] text-white/30">{btn.description}</code>

                  <motion.button
                    type="button"
                    className={[
                      "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold",
                      "outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                      "transition-colors duration-200",
                      btn.className,
                    ].join(" ")}
                    whileHover={{
                      y: -3,
                      scale: 1.03,
                      boxShadow: btn.hoverShadow,
                      transition: HOVER_SPRING,
                    }}
                    whileTap={{
                      scale: 0.96,
                      y: 0,
                      transition: BUTTON_SPRING,
                    }}
                    onClick={() => handleButtonClick(btn.id)}
                    aria-label={btn.label}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{isActive ? "已觸發！" : btn.label}</span>
                  </motion.button>

                  {/* Spring parameter display */}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-white/30">
                    <div className="rounded-lg bg-white/[0.04] py-1.5">
                      <p className="font-semibold text-white/50">Hover</p>
                      <p>y: -3 · scale: 1.03</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.04] py-1.5">
                      <p className="font-semibold text-white/50">Tap</p>
                      <p>scale: 0.96 · y: 0</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* ── Accessibility Section ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.45 }}
          className="mb-20 space-y-8"
        >
          <SectionHeader
            eyebrow="Accessibility · WCAG 2.4.7"
            title="鍵盤導覽展示區"
            subtitle="以下元件僅在鍵盤聚焦時顯示外框，滑鼠操作不受影響"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Keyboard-focus demo cards */}
            {[
              { id: "a11y-1", icon: Lock, label: "可點擊連結", desc: "Tab 鍵導覽，Enter 觸發", variant: "default" as const, note: "focus-visible ring: violet" },
              { id: "a11y-2", icon: Globe, label: "外部資源", desc: "Target = _blank，aria-label 已設定", variant: "success" as const, note: "focus-visible ring: emerald" },
              { id: "a11y-3", icon: Star, label: "評分操作", desc: "Space / Enter 均可觸發", variant: "warning" as const, note: "focus-visible ring: amber" },
              { id: "a11y-4", icon: AlertTriangle, label: "危險操作", desc: "需要 aria-describedby 確認提示", variant: "danger" as const, note: "focus-visible ring: rose" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -12 : 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65 + i * 0.07, type: "spring", stiffness: 280, damping: 24 }}
                >
                  <InteractiveCard
                    variant={item.variant}
                    onClick={() => {}}
                    aria-label={item.label}
                    className="p-5"
                  >
                    <div className="flex items-center gap-4">
                      <Icon className="h-6 w-6 shrink-0 text-white/60" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white">{item.label}</p>
                        <p className="mt-0.5 text-xs text-white/45">{item.desc}</p>
                      </div>
                      <code className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-1 text-[10px] text-white/40">
                        {item.note}
                      </code>
                    </div>
                  </InteractiveCard>
                </motion.div>
              );
            })}
          </div>

          {/* WCAG note */}
          <div className="rounded-[20px] border border-cyan-400/15 bg-cyan-400/[0.05] p-5">
            <div className="flex gap-3">
              <Keyboard className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-cyan-100">WCAG 2.4.7 Focus Visible 實作說明</p>
                <p className="leading-6 text-cyan-100/60">
                  使用 <code className="rounded bg-white/10 px-1 text-[11px]">:focus-visible</code> 選擇器而非{" "}
                  <code className="rounded bg-white/10 px-1 text-[11px]">:focus</code>，確保只在鍵盤導覽時顯示外框，
                  滑鼠操作不出現多餘樣式。配合 <code className="rounded bg-white/10 px-1 text-[11px]">outline-none</code>
                  移除瀏覽器預設外框，再以 Tailwind 的{" "}
                  <code className="rounded bg-white/10 px-1 text-[11px]">focus-visible:ring-2</code> 繪製語意色外框。
                  每個 variant 使用對應色彩，讓使用者一眼識別目前聚焦的元素。
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Spring Reference Card ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.45 }}
        >
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/10">
                <Zap className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <p className="font-semibold text-white">Spring 參數速查表</p>
                <p className="text-xs text-white/40">選擇合適的彈簧感，打造精準的互動回饋</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] font-semibold uppercase tracking-widest text-white/40">
                    <th className="pb-3 pr-4">用途</th>
                    <th className="pb-3 pr-4">Stiffness</th>
                    <th className="pb-3 pr-4">Damping</th>
                    <th className="pb-3">效果描述</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {[
                    { use: "Card Hover（懸浮）", stiffness: 260, damping: 22, desc: "緩慢升起，柔和落下，自然飄浮感" },
                    { use: "Button Tap（按壓）", stiffness: 500, damping: 30, desc: "瞬間壓縮，快速彈回，真實手感" },
                    { use: "3D Tilt（傾斜）", stiffness: 200, damping: 20, desc: "跟手順滑，無延遲追蹤游標" },
                    { use: "Panel Expand（展開）", stiffness: 400, damping: 28, desc: "流暢展開，不過度彈跳" },
                    { use: "Page Enter（入場）", stiffness: 280, damping: 24, desc: "優雅進場，輕微彈跳提升層次感" },
                  ].map((row) => (
                    <tr key={row.use} className="text-xs">
                      <td className="py-3 pr-4 font-medium text-white/80">{row.use}</td>
                      <td className="py-3 pr-4">
                        <code className="rounded bg-violet-400/15 px-2 py-0.5 text-violet-300">{row.stiffness}</code>
                      </td>
                      <td className="py-3 pr-4">
                        <code className="rounded bg-cyan-400/15 px-2 py-0.5 text-cyan-300">{row.damping}</code>
                      </td>
                      <td className="py-3 text-white/50">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.section>

      </div>
    </main>
  );
}
