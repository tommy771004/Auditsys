import { test } from "node:test";
import assert from "node:assert";
import { categorizeFinding, type AuditFindingCategory } from "../src/shared/types/auditPipelineTypes.ts";

test("categorizeFinding: affectedMetric LCP maps to slow_lcp", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "lcp" }), "slow_lcp");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "largest-contentful-paint" }), "slow_lcp");
});

test("categorizeFinding: affectedMetric metadata maps to missing_meta", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "metadata" }), "missing_meta");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "meta" }), "missing_meta");
});

test("categorizeFinding: affectedMetric contrast maps to low_contrast", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "contrast" }), "low_contrast");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "color-contrast" }), "low_contrast");
});

test("categorizeFinding: affectedMetric protocol maps to insecure_protocol", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "protocol" }), "insecure_protocol");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "ssl" }), "insecure_protocol");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "tls" }), "insecure_protocol");
});

test("categorizeFinding: affectedMetric resource maps to blocked_resource", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "resource" }), "blocked_resource");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "blocked" }), "blocked_resource");
});

test("categorizeFinding: affectedMetric image maps to heavy_image", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "image" }), "heavy_image");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "images" }), "heavy_image");
});

test("categorizeFinding: affectedMetric content maps to sparse_content", () => {
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "content" }), "sparse_content");
  assert.equal(categorizeFinding({ issue: "", affectedMetric: "text" }), "sparse_content");
});

test("categorizeFinding: zh issue keywords map to correct category", () => {
  assert.equal(categorizeFinding({ issue: "最大內容繪製過慢" }), "slow_lcp");
  assert.equal(categorizeFinding({ issue: "缺少 meta description" }), "missing_meta");
  assert.equal(categorizeFinding({ issue: "對比度不足" }), "low_contrast");
  assert.equal(categorizeFinding({ issue: "不安全協定 HTTP" }), "insecure_protocol");
  assert.equal(categorizeFinding({ issue: "被封鎖資源 403" }), "blocked_resource");
  assert.equal(categorizeFinding({ issue: "圖片過大需優化" }), "heavy_image");
  assert.equal(categorizeFinding({ issue: "內容稀疏字數過少" }), "sparse_content");
});

test("categorizeFinding: en issue keywords map to correct category", () => {
  assert.equal(categorizeFinding({ issue: "largest contentful paint too slow" }), "slow_lcp");
  assert.equal(categorizeFinding({ issue: "missing meta description" }), "missing_meta");
  assert.equal(categorizeFinding({ issue: "low contrast ratio" }), "low_contrast");
  assert.equal(categorizeFinding({ issue: "insecure protocol http" }), "insecure_protocol");
  assert.equal(categorizeFinding({ issue: "blocked resource 404" }), "blocked_resource");
  assert.equal(categorizeFinding({ issue: "heavy image needs optimization" }), "heavy_image");
  assert.equal(categorizeFinding({ issue: "sparse content thin content" }), "sparse_content");
});

test("categorizeFinding: unknown issue with no affectedMetric returns other", () => {
  assert.equal(categorizeFinding({ issue: "something completely unknown xyz" }), "other");
});

test("categorizeFinding: case insensitive matching works", () => {
  assert.equal(categorizeFinding({ issue: "LCP IS TOO SLOW" }), "slow_lcp");
  assert.equal(categorizeFinding({ issue: "Missing Meta Description" }), "missing_meta");
  assert.equal(categorizeFinding({ issue: "Low Contrast" }), "low_contrast");
});

test("categorizeFinding: affectedMetric takes precedence over issue keywords", () => {
  // affectedMetric says "metadata" but issue mentions LCP
  assert.equal(categorizeFinding({ issue: "lcp is slow but metadata missing", affectedMetric: "metadata" }), "missing_meta");
  // affectedMetric says "lcp" but issue mentions meta
  assert.equal(categorizeFinding({ issue: "meta description missing", affectedMetric: "lcp" }), "slow_lcp");
});