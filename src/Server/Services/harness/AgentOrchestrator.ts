export interface AuditTaskPlan {
  steps: string[];
  subagents?: string[];
}

/**
 * 智能編排系統 (Agent Orchestrator)
 * 負責解析 Audit Request，進行任務分解，並路由至對應的 Agent/Skill 執行。
 */
export class AgentOrchestrator {
  // Focus-area keywords used to derive advisory subagent labels from the request
  // goals. These influence the focus surfaced to the UI, NOT the executable
  // pipeline — only deterministic/browser/synthesis are real steps the harness runs.
  private focusRules = [
    { focus: "UXAuditAgent", keywords: ["seo", "performance", "visual", "ui", "ux", "accessibility", "a11y", "frontend"] },
    { focus: "DevSecOpsAgent", keywords: ["security", "auth", "vuln", "sql", "xss"] },
    { focus: "ContentStrategyAgent", keywords: ["copy", "content", "marketing", "wording", "text"] },
  ];

  /**
   * 根據使用者的 Request 動態拆解任務並決定 Pipeline 路徑
   *
   * The pipeline always runs deterministic -> browser -> synthesis. `browser` is
   * mandatory: synthesis and the quality-gate sensors consume a well-formed
   * BrowserCollectorResult (even when it resolves to a skipped/stub result), so
   * dropping it would leave downstream code dereferencing undefined evidence.
   * Goal keywords only add advisory subagent focus labels — they never add or
   * remove executable steps.
   */
  public planTask(url: string, goals?: string[]): AuditTaskPlan {
    console.log(`[Orchestrator] Planning task for URL: ${url}`);

    const steps = ["deterministic", "browser", "synthesis"];

    const focus = new Set<string>();
    if (goals && goals.length > 0) {
      const goalsStr = goals.join(" ").toLowerCase();
      for (const rule of this.focusRules) {
        if (rule.keywords.some(keyword => goalsStr.includes(keyword))) {
          focus.add(rule.focus);
        }
      }
    }

    console.log(`[Orchestrator] Decided Execution Pipeline: ${steps.join(" -> ")}`);

    return { steps, subagents: focus.size > 0 ? Array.from(focus) : undefined };
  }

  /**
   * Swarm Router: Dispatch to specialized subagents based on tech stack identified in the deterministic phase
   */
  public routeSwarm(stack?: string[], headers?: { server: string | null, poweredBy: string | null }): string[] {
    const subagents = new Set<string>();
    const stackStr = (stack || []).join(" ").toLowerCase();
    const serverHeader = (headers?.server || "").toLowerCase();
    const poweredByHeader = (headers?.poweredBy || "").toLowerCase();

    if (stackStr.includes("react") || stackStr.includes("vue") || stackStr.includes("angular") || stackStr.includes("svelte")) {
      subagents.add("UXAuditAgent");
    }
    if (stackStr.includes("node") || stackStr.includes("express") || stackStr.includes("php") || stackStr.includes("django") || stackStr.includes("spring") || poweredByHeader.includes("express") || poweredByHeader.includes("php")) {
      subagents.add("DevSecOpsAgent");
    }
    if (stackStr.includes("next") || stackStr.includes("nuxt") || stackStr.includes("vercel") || stackStr.includes("astro") || poweredByHeader.includes("next.js") || serverHeader.includes("vercel")) {
      subagents.add("PerformanceAgent");
    }
    if (subagents.size === 0) {
      subagents.add("GeneralAuditAgent"); // fallback subagent
    }

    const finalSubagents = Array.from(subagents);
    console.log(`[Orchestrator] Swarm Router Dispatched Active Subagents: ${finalSubagents.join(", ")}`);
    return finalSubagents;
  }
}
