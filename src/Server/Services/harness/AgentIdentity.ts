import crypto from "node:crypto";

export interface AgentIdentity {
  correlationId: string;
  role: string;
  sessionStartTime: number;
}

export class AgentIdentityManager {
  /**
   * 建立並核發一個唯一的 Agent 身份
   */
  static issueIdentity(role: string): AgentIdentity {
    return {
      correlationId: `agt_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`,
      role,
      sessionStartTime: Date.now(),
    };
  }
}

export class CredentialsVault {
  private allowedModels: string[];
  private apiKey: string | null;

  constructor(apiKey: string | null = null, allowedModels: string[] = []) {
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || null;
    this.allowedModels = allowedModels;
  }

  /**
   * 安全地取得 API Key。這裡可以擴充針對特定 role 或是 model 的權限檢查。
   */
  public getCredentials(modelName: string, role: string): string {
    if (!this.apiKey) {
      throw new Error(`[Vault] Authentication Error: API Key missing for role '${role}'. Please configure openRouterApiKey.`);
    }

    if (this.allowedModels.length > 0 && !this.allowedModels.some(m => modelName.includes(m))) {
      throw new Error(`[Vault] Authorization Error: Model '${modelName}' is not allowed for this session.`);
    }

    return this.apiKey;
  }
}
