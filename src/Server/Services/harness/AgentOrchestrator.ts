export interface AuditTaskPlan {
  steps: string[];
}

/**
 * 智能編排系統 (Agent Orchestrator)
 * 負責解析 Audit Request，進行任務分解，並路由至對應的 Agent/Skill 執行。
 */
export class AgentOrchestrator {
  private skillRules = [
    { skill: "browser", keywords: ["seo", "performance", "visual", "ui", "ux", "accessibility", "a11y", "frontend"] },
    { skill: "security", keywords: ["security", "auth", "vuln", "sql", "xss"] }, // Future proofing
    { skill: "content", keywords: ["copy", "content", "marketing", "wording", "text"] } // Future proofing
  ];

  /**
   * 根據使用者的 Request 動態拆解任務並決定 Pipeline 路徑
   */
  public planTask(url: string, goals?: string[]): AuditTaskPlan {
    console.log(`[Orchestrator] Planning task for URL: ${url}`);
    
    // 預設一定要執行核心的 deterministic
    const steps = new Set<string>();
    steps.add("deterministic");
    
    if (goals && goals.length > 0) {
      const goalsStr = goals.join(" ").toLowerCase();
      
      // 基於規則的路由決策 (Rule-based Router)
      for (const rule of this.skillRules) {
        if (rule.keywords.some(keyword => goalsStr.includes(keyword))) {
          steps.add(rule.skill);
        }
      }
    } else {
      // 若未指定目標，預設啟動全部流程
      steps.add("browser");
      // Add other default skills here as they become available
    }

    // 確保即使規則匹配到未實作的 skill，系統依然能執行 (未來擴充點)
    // 最終必定交由 synthesis 產出報告
    steps.add("synthesis");
    
    const finalSteps = Array.from(steps);
    console.log(`[Orchestrator] Decided Execution Pipeline: ${finalSteps.join(" -> ")}`);
    return { steps: finalSteps };
  }
}
