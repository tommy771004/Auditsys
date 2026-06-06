/**
 * 管理與維護 LLM 的上下文 (Context)，防止 Context Rot (上下文腐爛)
 */
export class ContextManager {
  private readonly maxContextSize: number;
  private stateMachineSoR: Record<string, any>; // System of Record: 最小真相來源
  
  constructor(maxContextSize: number = 80000) { // 預設 80,000 字元警告閾值
    this.maxContextSize = maxContextSize;
    this.stateMachineSoR = {};
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
   * 當 Agent 在長任務/多特工管線間交接時，不帶上前面龐大的對話歷史廢話，
   * 而是將特定摘要與 System of Record (SoR) 交接給下一個 Agent，清空污染的 Context。
   */
  public resetContextForPhase<T>(phaseData: T, newInstructions: string, phaseName: string): string {
    // 儲存於 SoR 狀態機，確保後續隨時能取得最小真相版本
    this.stateMachineSoR[phaseName] = phaseData;
    
    // 返回乾淨的重置上下文
    return `[System Instruction]\n${newInstructions}\n\n[Phase Context]\n${JSON.stringify(phaseData)}\n\n[System of Record]\n${JSON.stringify(this.stateMachineSoR)}`;
  }

  /**
   * 跨 Session 的長期專案記憶持久化
   * 將目前的 SoR 累計成果寫入長期物理記憶（如專案根目錄的 CLAUDE.md 或 PROJECT_MEMORY.md）
   */
  public async persistLongTermMemory(projectId: string, summary: string): Promise<void> {
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      
      const memoryFilePath = path.join(process.cwd(), "PROJECT_MEMORY.md");
      const timestamp = new Date().toISOString();
      const content = `\n## [${timestamp}] Session Memory [${projectId}]\n${summary}\n\n### State Machine Snapshot\n\`\`\`json\n${JSON.stringify(this.stateMachineSoR, null, 2)}\n\`\`\`\n`;
      
      // 自動累積類似 CLAUDE.md 的長期專案記憶
      await fs.appendFile(memoryFilePath, content, { encoding: "utf8" });
      console.log(`[ContextManager] Long-term memory persisted to ${memoryFilePath}`);
    } catch (e: any) {
      console.error(`[ContextManager] Failed to persist long term memory: ${e.message}`);
    }
  }
}
