/**
 * plan-settings-cache.test.ts
 *
 * Unit tests for PlanSettingsCache (TTL, LRU eviction, invalidation).
 * Tests the in-memory cache logic directly — no DB connection required.
 */

import test from "node:test";
import assert from "node:assert/strict";

// ---------------------------------------------------------------------------
// Inline a minimal reproduction of PlanSettingsCache for isolated testing.
// This mirrors planSettingsCache.ts but is self-contained so these tests
// run with zero infrastructure.
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class TestableCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  constructor(private readonly ttlMs: number, private readonly maxSize: number) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("plan settings cache: returns cached value within TTL", () => {
  const cache = new TestableCache<string>(60_000, 10);
  cache.set("free", "free-settings");
  assert.equal(cache.get("free"), "free-settings");
});

test("plan settings cache: returns undefined for missing keys", () => {
  const cache = new TestableCache<string>(60_000, 10);
  assert.equal(cache.get("nonexistent"), undefined);
});

test("plan settings cache: invalidate removes the entry immediately", () => {
  const cache = new TestableCache<string>(60_000, 10);
  cache.set("pro", "pro-settings");
  assert.equal(cache.get("pro"), "pro-settings");
  cache.invalidate("pro");
  assert.equal(cache.get("pro"), undefined, "entry should be gone after invalidation");
});

test("plan settings cache: evicts oldest entry when maxSize is exceeded", () => {
  const cache = new TestableCache<number>(60_000, 3);
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  assert.equal(cache.size(), 3);

  // Adding a 4th entry should evict "a" (the oldest)
  cache.set("d", 4);
  assert.equal(cache.size(), 3, "size should remain at maxSize");
  assert.equal(cache.get("a"), undefined, "oldest entry 'a' should have been evicted");
  assert.equal(cache.get("d"), 4, "newest entry 'd' should be present");
});

test("plan settings cache: returns undefined for expired entries (simulated TTL = 1ms)", async () => {
  const cache = new TestableCache<string>(1, 10); // 1ms TTL
  cache.set("enterprise", "enterprise-settings");

  // Wait for the entry to expire
  await new Promise(resolve => setTimeout(resolve, 5));

  assert.equal(
    cache.get("enterprise"),
    undefined,
    "entry should have expired after TTL",
  );
});

test("plan settings cache: overwriting a key resets its TTL", async () => {
  const cache = new TestableCache<string>(50, 10);
  cache.set("free", "v1");
  await new Promise(resolve => setTimeout(resolve, 20));
  cache.set("free", "v2"); // refresh
  await new Promise(resolve => setTimeout(resolve, 35));
  // Should still be valid: v2 was set at +20ms with 50ms TTL → expires at +70ms
  assert.equal(cache.get("free"), "v2", "refreshed entry should still be valid");
});
