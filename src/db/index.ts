import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { planSettings } from "./schema";
import { resolveAdminBootstrapConfig } from "./adminBootstrap";

let db: ReturnType<typeof drizzle>;
let pool: pkg.Pool;
let activeConnectionString: string | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!db) {
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    db = drizzle(pool, { schema });
    activeConnectionString = connectionString;
  } else if (connectionString && activeConnectionString !== connectionString) {
    throw new Error("DATABASE_URL changed after database initialization");
  }
  return db;
}

export async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return false;

  const p = new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  const migrationDb = drizzle(p, { schema });

  // Schema is owned by drizzle-kit migrations (see drizzle/) generated from
  // schema.ts — the baseline migration is idempotent so it applies cleanly to
  // both a fresh database and one that already has these tables.
  await migrate(migrationDb, { migrationsFolder: "./drizzle" });

  // Seed: default plan rows, in case the baseline migration's seed insert was
  // skipped (already applied) before these plans existed.
  await migrationDb
    .insert(planSettings)
    .values([
      { planId: "free", allowedModels: "", price: "$0" },
      { planId: "pro", allowedModels: "anthropic/claude-3.5-sonnet,google/gemma-7b-it", price: "$29" },
      {
        planId: "enterprise",
        allowedModels: "anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,meta-llama/llama-3-70b-instruct",
        price: "$99",
      },
    ])
    .onConflictDoNothing();

  const bootstrapAdmin = resolveAdminBootstrapConfig();
  if (bootstrapAdmin) {
    const res = await p.query('SELECT * FROM audit_users WHERE username = $1', [bootstrapAdmin.username]);
    if (res.rowCount === 0) {
      const passwordHash = await bcrypt.hash(bootstrapAdmin.password, 12);
      await p.query(
        'INSERT INTO audit_users (username, password_hash, is_admin) VALUES ($1, $2, $3)',
        [bootstrapAdmin.username, passwordHash, true]
      );
    }
  }

  console.log("Database initialized and schema verified.");
  return true;
}
