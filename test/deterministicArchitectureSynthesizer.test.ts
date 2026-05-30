import { test } from "node:test";
import assert from "node:assert/strict";
import { synthesizeArchitecturalWarning } from "../src/Server/Services/deterministicArchitectureSynthesizer";

test("synthesizeArchitecturalWarning identifies head-of-line blocking when HTTP/2 is absent with high request count", () => {
  const warning = synthesizeArchitecturalWarning({
    hasGzip: false,
    isHttp2: false,
    requestCount: 150,
    domDepth: 800,
    techStack: ["node"],
  });

  assert.match(warning, /Head-of-Line Blocking/);
  assert.match(warning, /150/);
  assert.match(warning, /HTTP\/2/);
  assert.match(warning, /brotli|gzip|CDN|邊緣/);
  assert.doesNotMatch(warning, /basic linter/i);
});

test("synthesizeArchitecturalWarning identifies React hydration risk when DOM depth is extreme", () => {
  const warning = synthesizeArchitecturalWarning({
    hasGzip: true,
    isHttp2: true,
    requestCount: 60,
    domDepth: 3200,
    techStack: ["Next.js", "React", "Tailwind"],
  });

  assert.match(warning, /hydration/);
  assert.match(warning, /3200/);
  assert.match(warning, /記憶體/);
  assert.match(warning, /Server Components|島嶼式|拆分/);
});

test("synthesizeArchitecturalWarning compounds network and hydration failures into one CTO-level warning", () => {
  const warning = synthesizeArchitecturalWarning({
    hasGzip: false,
    isHttp2: false,
    requestCount: 180,
    domDepth: 3600,
    techStack: ["react", "next.js"],
  });

  assert.match(warning, /災難性瓶頸|系統性瓶頸/);
  assert.match(warning, /Head-of-Line Blocking/);
  assert.match(warning, /hydration/);
  assert.match(warning, /結構性重構/);
});
