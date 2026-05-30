/**
 * 安全呼叫 Web Vibrate API (支援 SSR 與不支援的裝置)
 * @param pattern 震動模式，數字(毫秒)或數字陣列
 */
export const triggerVibration = (pattern: number | number[]) => {
  if (typeof window !== "undefined" && navigator && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // 忽略部分瀏覽器權限或支援度問題
    }
  }
};

export const haptics = {
  /** 極短促的段落感，適合切換 Tab、開關或滑動經過刻度 */
  tick: () => triggerVibration(5),
  /** 一般按壓回饋 */
  tap: () => triggerVibration(10),
  /** 成功送出表單、操作完成的明顯回饋 */
  success: () => triggerVibration([15, 30, 20]),
  /** 錯誤或警告的強烈回饋 */
  error: () => triggerVibration([30, 50, 30, 50, 30]),
};
