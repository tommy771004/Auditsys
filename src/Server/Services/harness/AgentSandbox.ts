import { AgentIdentity } from "./AgentIdentity";

export interface SandboxAction {
  type: "network_request" | "file_read" | "file_write" | "llm_call";
  target: string;
  payload?: any;
}

/**
 * ActionInterceptor: 攔截並驗證 Agent 的所有操作請求，確保其在安全邊界內執行
 */
export class ActionInterceptor {
  private allowedDomains: string[];

  constructor(allowedDomains: string[] = []) {
    this.allowedDomains = allowedDomains;
  }

  /**
   * 驗證動作是否合法
   */
  public validateAction(identity: AgentIdentity, action: SandboxAction): boolean {
    if (action.type === "file_write" || action.type === "file_read") {
      // 在這個專案中，Agent 被嚴格禁止直接存取宿主檔案系統
      console.warn(`[Sandbox: ${identity.correlationId}] Blocked illegal file system access to ${action.target}`);
      return false;
    }

    if (action.type === "network_request") {
      // 若有設置白名單，檢查目標網域
      if (this.allowedDomains.length > 0) {
        try {
          const url = new URL(action.target);
          if (!this.allowedDomains.includes(url.hostname)) {
            console.warn(`[Sandbox: ${identity.correlationId}] Blocked network request to unauthorized domain: ${url.hostname}`);
            return false;
          }
        } catch {
          return false;
        }
      }
    }

    return true;
  }
}

export type MiddlewareNext<T> = (action: SandboxAction) => Promise<T>;
export type MiddlewareHandler = <T>(identity: AgentIdentity, action: SandboxAction, next: MiddlewareNext<T>) => Promise<T>;

/**
 * IsolatedContext: 限制特工的權限半徑，封裝對外溝通的介面
 */
export class AgentSandbox {
  private identity: AgentIdentity;
  private interceptor: ActionInterceptor;
  private scratchpad: Map<string, any>;
  private middlewares: MiddlewareHandler[];

  constructor(identity: AgentIdentity, allowedDomains: string[] = []) {
    this.identity = identity;
    this.interceptor = new ActionInterceptor(allowedDomains);
    this.scratchpad = new Map();
    this.middlewares = [];
  }

  /**
   * P3: 註冊 Middleware
   */
  public useMiddleware(handler: MiddlewareHandler): void {
    this.middlewares.push(handler);
  }

  /**
   * P3: 思考板 Scratchpad (Task Memory)
   */
  public setContext(key: string, value: any): void {
    this.scratchpad.set(key, value);
  }

  public getContext<T>(key: string): T | undefined {
    return this.scratchpad.get(key) as T;
  }

  /**
   * 透過沙箱執行 LLM 呼叫 (攔截與驗證 + Middleware 鏈)
   */
  public async executeLlmCall<T>(modelName: string, promptSize: number, executor: () => Promise<T>): Promise<T> {
    const action: SandboxAction = { type: "llm_call", target: modelName, payload: { promptSize } };
    
    if (!this.interceptor.validateAction(this.identity, action)) {
      throw new Error(`[Sandbox] LLM Call action blocked by security policy for ${this.identity.role}.`);
    }

    // Middleware execution chain
    let index = -1;
    const dispatch = async (i: number, currentAction: SandboxAction): Promise<T> => {
      if (i <= index) throw new Error("[Sandbox] next() called multiple times");
      index = i;
      
      const middleware = this.middlewares[i];
      if (middleware) {
        return await middleware(this.identity, currentAction, (nextAction) => dispatch(i + 1, nextAction));
      }
      return await executor();
    };

    return await dispatch(0, action);
  }
}

