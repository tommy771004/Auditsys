import type { planSettings } from "../../db/schema";

type PlanSetting = typeof planSettings.$inferSelect;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class PlanSettingsCache {
  private cache = new Map<string, CacheEntry<PlanSetting>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs = 60_000, maxSize = 100) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(planId: string): PlanSetting | undefined {
    const entry = this.cache.get(planId);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(planId);
      return undefined;
    }

    return entry.value;
  }

  set(planId: string, value: PlanSetting): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(planId, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  invalidate(planId: string): void {
    this.cache.delete(planId);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number; ttlMs: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
    };
  }
}

export const planSettingsCache = new PlanSettingsCache();

export async function getPlanSettingsWithCache(
  db: ReturnType<typeof import("../../db/index").getDb>,
  planId: string
): Promise<PlanSetting | undefined> {
  const cached = planSettingsCache.get(planId);
  if (cached) return cached;

  const { planSettings: planSettingsTable } = await import("../../db/schema");
  const { eq } = await import("drizzle-orm");

  const rows = await db.select().from(planSettingsTable).where(eq(planSettingsTable.planId, planId));
  const setting = rows[0];

  if (setting) {
    planSettingsCache.set(planId, setting);
  }

  return setting;
}

export function invalidatePlanSettingsCache(planId: string): void {
  planSettingsCache.invalidate(planId);
}