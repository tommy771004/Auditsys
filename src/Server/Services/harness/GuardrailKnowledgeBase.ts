import fs from "node:fs";
import path from "node:path";

export interface GuardrailEntry {
  errorPattern: string;
  guardrailPrompt: string;
  timestamp: string;
}

/**
 * 永久環境修復機制 (Self-Healing Guardrails)
 * 紀錄先前的失敗經驗，並自動產生 Prompt 防護欄，避免 Agent 重蹈覆轍
 */
export class GuardrailKnowledgeBase {
  private filePath = path.resolve(process.cwd(), ".harness_knowledge.json");
  private entries: GuardrailEntry[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(this.filePath)) {
      try {
        this.entries = JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      } catch (e) {
        this.entries = [];
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2));
    } catch (e) {
      console.warn("[Guardrail] Failed to persist knowledge base", e);
    }
  }

  /**
   * 紀錄錯誤並產生防護規則
   */
  public recordError(errorMsg: string, suggestedGuardrail: string) {
    this.entries.push({ 
      errorPattern: errorMsg, 
      guardrailPrompt: suggestedGuardrail,
      timestamp: new Date().toISOString()
    });
    this.save();
    console.log(`[Guardrail] New rule added to knowledge base: ${suggestedGuardrail}`);
  }

  /**
   * 根據當前上下文提取相關的防護欄 Prompt
   */
  public getGuardrailsForContext(contextStr: string): string[] {
    // 實務上這裡會搭配 Vector Search 或 Semantic Matching
    // 目前原型階段，只要有歷史紀錄，我們就注入最相關的前 3 筆，或簡單比對關鍵字
    const activeGuardrails: string[] = [];
    for (const entry of this.entries) {
      // 假設防護欄具有通用性，直接套用
      activeGuardrails.push(entry.guardrailPrompt);
    }
    
    return activeGuardrails.slice(-3); // 取最新三筆
  }
}
