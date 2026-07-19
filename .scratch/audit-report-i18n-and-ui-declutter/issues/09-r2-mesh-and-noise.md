# 09 — R2 視覺減量:MeshBackground 光球 + bg-noise 清理

**What to build:**

`MeshBackground.tsx` 刪三顆 `motion.div` 彩色光球(violet / cyan / blue,各跑 10/12/15s `Infinity` 動畫),留 blueprint grid 一層,移除 `framer-motion` import;`App.tsx` 移除 `<div className="bg-noise" />`;`index.css` 移除 `.bg-noize` rule 與任何 noise texture asset reference;若 texture asset 檔(svg / png)存在一併刪。完成後全站背景一層靜態 grid,頁面無持續 GPU/CPU 動畫,低階裝置不再掉格。**不動 App 路由過場** (那是 10),**不動行銷頁元素動畫**(`Reveal`、stagger、`Logos3` 保留)。

**Blocked by:** None — can start immediately(可與 R1 並行)

**Status:** ready-for-agent

- [ ] `src/components/ui/MeshBackground.tsx` 移除三顆 `<motion.div>` 光球區塊,留下 blueprint grid 與 `bg-[var(--bg)]` 純色底
- [ ] 移除該檔 `import { motion } from "framer-motion"` 與其他不再用到的 import
- [ ] `src/App.tsx` 移除 `<div className="bg-noise" />` 一行
- [ ] `src/index.css` 移除 `.bg-noise` rule 與相關 texture url reference(`/url\(.*noise.*\)/` pattern)
- [ ] 若 `src/assets/` 或 `public/` 內有 noise texture asset 檔(svg/png)只被 `.bg-noise` 引用,一併刪
- [ ] 確認 `MeshBackground` 兩個變體(`default` 與 `console`)仍正常 render;`variant` prop 行為保持(若 `console` 變體資訊與 `default` 同後已無差異,可砍 `variant` 退到單一 component)
- [ ] 全站 visual diff 由 spec 視覺鎖住 — 只砍光球與 noise,網格保留
- [ ] `npm test` + `tsc --noEmit` + `npm run build` 通過(無新測試,既有套件 + 既有用例不破)
