export interface AuditTaskPlan {
  steps: string[];
}

/**
 * 智能編排系統 (Agent Orchestrator)
 * 負責解析 Audit Request，進行任務分解，並路由至對應的 Agent/Skill 執行。
 */
export class AgentOrchestrator {
  /**
   * 根據使用者的 Request 動態拆解任務並決定 Pipeline 路徑
   */
  public planTask(url: string, goals?: string[]): AuditTaskPlan {
    console.log(`[Orchestrator] Planning task for URL: ${url}`);
    
    // 預設一定要執行核心的 deterministic
    const steps = ["deterministic"];
    
    if (goals && goals.length > 0) {
      const goalsStr = goals.join(" ").toLowerCase();
      // 基於規則的路由決策 (Rule-based Router)
      if (goalsStr.includes("seo") || goalsStr.includes("performance") || goalsStr.includes("visual") || goalsStr.includes("ui")) {
        steps.push("browser");
      }
    } else {
      // 若未指定目標，預設啟動全部流程
      steps.push("browser");
    }

    // 最終必定交由 synthesis 產出報告
    steps.push("synthesis");
    
    console.log(`[Orchestrator] Decided Execution Pipeline: ${steps.join(" -> ")}`);
    return { steps };
  }
}
