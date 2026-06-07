import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function readLocale(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8"));
}

function getPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    return (value as Record<string, unknown>)[key];
  }, root);
}

test("console simulation disclosure copy exists in both locales", async () => {
  const locales = await Promise.all([
    readLocale("src/locales/en.json"),
    readLocale("src/locales/zh-TW.json"),
  ]);

  for (const locale of locales) {
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.simulatedTitle"), "string");
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.simulatedBody"), "string");
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.realEvidenceTitle"), "string");
    assert.equal(typeof getPath(locale, "auditConsole.disclosure.realEvidenceBody"), "string");
  }
});
