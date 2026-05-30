/**
 * 管理與維護 LLM 的上下文 (Context)，防止 Context Rot (上下文腐爛)
 */
export class ContextManager {
  private readonly maxContextSize: number;

  constructor(maxContextSize: number = 80000) { // 預設 80,000 字元警告閾值
    this.maxContextSize = maxContextSize;
  }

  /**
   * 檢查是否需要壓縮 (Context Compression)
   */
  public needsCompression(contextStr: string): boolean {
    return contextStr.length > this.maxContextSize;
  }

  /**
   * 執行簡單的 Context Compression
   * 實務上可能會丟給 LLM 進行摘要，這裡以程式化的字串截斷作為展示 (防呆機制)
   */
  public compressContext(contextStr: string): string {
    if (!this.needsCompression(contextStr)) {
      return contextStr;
    }

    console.warn(`[ContextManager] Context size (${contextStr.length}) exceeds threshold (${this.maxContextSize}). Compressing...`);
    
    // 保留頭部 (通常包含 Prompt 指令) 與尾部 (最新擷取的資料)
    const preserveLength = Math.floor(this.maxContextSize / 2) - 1000;
    const head = contextStr.substring(0, preserveLength);
    const tail = contextStr.substring(contextStr.length - preserveLength);

    return `${head}\n\n...[CONTENT COMPRESSED BY CONTEXT MANAGER]...\n\n${tail}`;
  }

  /**
   * Context Reset 機制
   * 當 Agent 進入全新的階段 (Phase) 時，清理不必要的上下文，僅回傳所需的結構化資料
   */
  public resetContextForPhase<T>(phaseData: T, newInstructions: string): string {
    return `[System Instruction]\n${newInstructions}\n\n[Phase Context]\n${JSON.stringify(phaseData)}`;
  }
}
