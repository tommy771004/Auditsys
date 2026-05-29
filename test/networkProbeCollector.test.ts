import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSubResources, collectNetworkProbe } from "../src/Server/Services/networkProbeCollector";

const HTML = `<!doctype html><html><head>
  <link rel="stylesheet" href="/site.css">
  <script src="/app.js"></script>
  <script src="https://cdn.thirdparty.com/tag.js" async></script>
</head><body>
  <img src="/hero.jpg">
  <script src="/defer.js" defer></script>
</body></html>`;

test("parseSubResources classifies render-blocking, third-party, and type", () => {
  const resources = parseSubResources(HTML, "https://example.com/");
  const byUrl = Object.fromEntries(resources.map((r) => [r.url, r]));

  assert.equal(byUrl["https://example.com/site.css"].type, "stylesheet");
  assert.equal(byUrl["https://example.com/site.css"].renderBlocking, true);

  assert.equal(byUrl["https://example.com/app.js"].type, "script");
  assert.equal(byUrl["https://example.com/app.js"].renderBlocking, true); // head, no async/defer

  assert.equal(byUrl["https://cdn.thirdparty.com/tag.js"].isThirdParty, true);
  assert.equal(byUrl["https://cdn.thirdparty.com/tag.js"].renderBlocking, false); // async

  assert.equal(byUrl["https://example.com/hero.jpg"].type, "image");
  assert.equal(byUrl["https://example.com/hero.jpg"].renderBlocking, false);

  assert.equal(byUrl["https://example.com/defer.js"].renderBlocking, false); // defer
});

test("collectNetworkProbe measures via injected fetch and never throws", async () => {
  const evidence = await collectNetworkProbe(HTML, "https://example.com/", {
    fetchResource: async (url) => ({
      ok: true,
      status: 200,
      durationMs: url.endsWith(".css") ? 700 : 120,
      contentType: url.endsWith(".css") ? "text/css" : "application/javascript",
      contentEncoding: url.endsWith(".css") ? null : "br",
      transferBytes: 20000,
      encodedBytes: 20000,
      fromCache: false,
    }),
    assertSafe: async () => {},
  });

  assert.equal(evidence.collector, "fetch-probe");
  assert.equal(evidence.resources.length, 5);
  const css = evidence.resources.find((r) => r.url.endsWith("site.css"));
  assert.equal(css?.durationMs, 700);
  assert.equal(css?.contentEncoding, null);
  // Browser-only fields are null + noted.
  assert.equal(evidence.page.fcpMs, null);
  assert.ok(evidence.notes.some((n) => /未量測|not measured/i.test(n)));
});

test("collectNetworkProbe skips SSRF-rejected resources", async () => {
  const evidence = await collectNetworkProbe(
    `<head><script src="http://169.254.169.254/meta.js"></script></head>`,
    "https://example.com/",
    {
      fetchResource: async () => { throw new Error("should not fetch"); },
      assertSafe: async () => { throw new Error("UNSAFE_AUDIT_TARGET"); },
    },
  );
  assert.equal(evidence.resources.length, 0);
});
