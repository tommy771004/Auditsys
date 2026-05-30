import { getDb } from "../../../db";
import { agentGuardrails } from "../../../db/schema";
import { desc } from "drizzle-orm";

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
  /**
   * 紀錄錯誤並產生防護規則
   */
  public async recordError(errorMsg: string, suggestedGuardrail: string) {
    try {
      const db = getDb();
      await db.insert(agentGuardrails).values({
        errorPattern: errorMsg,
        guardrailPrompt: suggestedGuardrail,
      });
      console.log(`[Guardrail] New rule added to knowledge base: ${suggestedGuardrail}`);
    } catch (e) {
      console.warn("[Guardrail] Failed to persist knowledge base to DB", e);
    }
  }

  /**
   * 根據當前上下文提取相關的防護欄 Prompt
   */
  public async getGuardrailsForContext(contextStr: string): Promise<string[]> {
    try {
      const db = getDb();
      // 實務上這裡會搭配 Vector Search 或 Semantic Matching
      // 目前原型階段，我們就注入最相關的前 3 筆最新紀錄
      const recentGuardrails = await db.select()
        .from(agentGuardrails)
        .orderBy(desc(agentGuardrails.createdAt))
        .limit(3);
        
      return recentGuardrails.map(g => g.guardrailPrompt);
    } catch (e) {
      console.warn("[Guardrail] Failed to fetch guardrails from DB", e);
      return [];
    }
  }
}
