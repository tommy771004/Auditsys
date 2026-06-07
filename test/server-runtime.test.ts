import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadLocalEnvFiles } from "../src/Server/Services/serverEnv.ts";
import { registerSpaFallback } from "../src/Server/Services/serverRouting.ts";

test("loadLocalEnvFiles loads .env and lets .env.local override it", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "auditsys-env-"));
  const previousJwtSecret = process.env.JWT_SECRET;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  try {
    await writeFile(path.join(workspace, ".env"), "JWT_SECRET=from-env\nDATABASE_URL=postgres://from-env\n");
    await writeFile(path.join(workspace, ".env.local"), "JWT_SECRET=from-local\n");
    delete process.env.JWT_SECRET;
    delete process.env.DATABASE_URL;

    const loadedFiles = loadLocalEnvFiles(workspace);

    assert.deepEqual(loadedFiles, [".env", ".env.local"]);
    assert.equal(process.env.JWT_SECRET, "from-local");
    assert.equal(process.env.DATABASE_URL, "postgres://from-env");
  } finally {
    if (previousJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousJwtSecret;
    }
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    await rm(workspace, { recursive: true, force: true });
  }
});

test("registerSpaFallback serves index.html for unknown production routes under Express 5", async () => {
  const workspace = await mkdtemp(path.join(tmpdir(), "auditsys-spa-"));
  const app = express();
  let server: ReturnType<typeof app.listen> | undefined;

  try {
    await writeFile(path.join(workspace, "index.html"), "<main>Audit app shell</main>");
    registerSpaFallback(app, workspace);

    await new Promise<void>((resolve) => {
      server = app.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server?.address();
    assert.equal(typeof address, "object");
    assert(address && typeof address === "object");

    const response = await fetch(`http://127.0.0.1:${address.port}/nested/client/route`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "<main>Audit app shell</main>");
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error?: Error) => error ? reject(error) : resolve());
      });
    }
    await rm(workspace, { recursive: true, force: true });
  }
});
