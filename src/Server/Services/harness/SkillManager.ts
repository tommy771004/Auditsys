export interface Skill {
  id: string;
  name: string;
  isLoaded: boolean;
  load: () => Promise<void>;
  schema?: any; // P3 動態工具註冊表 (Toolset Disclosure) 專用的 Schema
}

/**
 * 漸進式技能載入管理器 (Progressive Skill Disclosure)
 * 允許 Agent 在執行過程中動態請求高階技能，避免預先載入龐大且不需要的模組
 */
export class SkillManager {
  private skills: Map<string, Skill> = new Map();

  public registerSkill(id: string, name: string, loader: () => Promise<void>, schema?: any) {
    this.skills.set(id, { id, name, isLoaded: false, load: loader, schema });
  }

  public async requireSkill(id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`[SkillManager] Skill '${id}' is not registered.`);
    }

    if (!skill.isLoaded) {
      console.log(`[SkillManager] Lazy loading skill: ${skill.name} (${skill.id})`);
      await skill.load();
      skill.isLoaded = true;
    }
  }

  public hasSkill(id: string): boolean {
    return this.skills.get(id)?.isLoaded ?? false;
  }

  /**
   * 漸進式技能披露 (Progressive Skill Disclosure)
   * 根據給定的任務屬性與權限半徑，回傳被允許且關聯的動態工具 schemas。
   * 避免一次將所有工具 Schema 塞進 Context 導致 LLM 混淆與 Token 浪費。
   */
  public getDisclosedSkills(taskIntent: string): any[] {
    const disclosed: any[] = [];
    
    // 依據意圖字串模糊比對決定披露範圍（實質可改為更嚴謹的 LLM Router 分發）
    const isSynthesis = taskIntent.includes("synthesis") || taskIntent.includes("report");
    const isCrawling = taskIntent.includes("collect") || taskIntent.includes("browser") || taskIntent.includes("deterministic");
    
    for (const [id, skill] of this.skills.entries()) {
      // 根據意圖動態 Disclosure
      if (isSynthesis && id === "synthesis" && skill.schema) {
        disclosed.push(skill.schema);
      }
      if (isCrawling && (id === "browser" || id === "deterministic") && skill.schema) {
        disclosed.push(skill.schema);
      }
    }
    
    // 如果未能成功推斷出特定的 Skill，則採最低權限返回，這確保模型的純潔性與防止 hallucinated tool calls.
    return disclosed;
  }
}

