import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index";
import { users } from "../../db/schema";
import { getPlanSettingsWithCache } from "../Services/planSettingsCache";

declare global {
  namespace Express {
    interface Request {
      auditConfig?: {
        aiProvider: string | null;
        agentRouterApiKey: string | null;
        openRouterApiKey: string | null;
        nvidiaApiKey: string | null;
        allowedModels?: string[];
      };
    }
  }
}

/**
 * Middleware that fetches the current user's subscription plan from the database,
 * retrieves the corresponding plan settings from the cache, and maps them to
 * an `auditConfig` object attached to `req`.
 * 
 * Must be used after `authenticateToken` so that `req.user` is available.
 */
export async function requirePlanLimits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const db = getDb();
    const dbUser = await db.select().from(users).where(eq(users.id, Number(user.id))).then(rows => rows[0]);
    const currentPlan = dbUser?.subscriptionPlan || "free";
    const userPlanSettings = await getPlanSettingsWithCache(db, currentPlan);

    if (userPlanSettings) {
      req.auditConfig = {
        aiProvider: userPlanSettings.aiProvider,
        agentRouterApiKey: userPlanSettings.agentRouterApiKey,
        openRouterApiKey: userPlanSettings.openRouterApiKey,
        nvidiaApiKey: userPlanSettings.nvidiaApiKey,
        allowedModels:
          currentPlan === "free"
            ? undefined
            : userPlanSettings.allowedModels
              ? userPlanSettings.allowedModels.split(",").map(m => m.trim()).filter(Boolean)
              : undefined,
      };
    }

    next();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[requirePlanLimits] Error:", error);
    }
    next(error);
  }
}
