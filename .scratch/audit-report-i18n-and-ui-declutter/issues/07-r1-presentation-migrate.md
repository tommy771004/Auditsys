# 07 — R1 page migration:AuditPresentation 改吃 buildSlidesViewModel

**What to build:**

`AuditPresentation.tsx` 從自家內聯 `renderChartByType`(line/bar/pie switch)與 inline `CHART_COLORS` 改成吃 `buildSlidesViewModel`(05)+ 共用 `AuditCharts`(或新 extract 的共用 chart components)。`AuditPresentation` 從 782 行縮減到預期 < 400 行,只剩 slide deck layout / 頁面殼 / i18n header / navigation,所有 chart rendering 邏輯外移。verifiable:`/#/presentation` 路由仍 render 5 slides,數字跟其他畫面一致。

**Blocked by:** 05 — R1 view-model:buildSlidesViewModel

**Status:** ready-for-agent

- [ ] `AuditPresentation.tsx` 改 import `buildSlidesViewModel` + 共用 chart component(`AuditCharts` 或新 extract),移除自家 `renderChartByType` 內聯邏輯
- [ ] `CHART_COLORS` 常數往外抽到共用 module(若 `AuditCharts` 尚未持有相同顏色),避免再有一份
- [ ] slide layout(標題 / summary / chart / metrics 排版)保留,僅 chart rendering 走共用
- [ ] `framer-motion`、`recharts` 直接 import 從此檔內如有縮減(若 slide 入場動畫保留仍可保留 framer-motion,但 recharts 應改走共用 AuditCharts 元件)
- [ ] 不破壞既有 `presentation.types.ts` 契約(`AuditPresentationResult`、`AuditSlide`、`SlideChartData`、`SlideMetric`)
- [ ] 視覺 diff:5 slides 仍正常 render、數字跟 console / sample-report 一致
- [ ] `npm test` + `tsc --noEmit` + `npm run build` 通過
- [ ] 既有測試綠;若有 `AuditPresentation` snapshot test 一併更新(diff 落在 chart rendering 提煉,不在視覺輸出)
