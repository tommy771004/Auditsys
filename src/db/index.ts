import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { resolveAdminBootstrapConfig } from "./adminBootstrap";

const connectionString = process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle>;
let pool: pkg.Pool;

export function getDb() {
  if (!db) {
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }

    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
    });
    db = drizzle(pool, { schema });
  }
  return db;
}

export async function initDb() {
  if (!connectionString) return false;
  
  const p = new Pool({ 
    connectionString,
    ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
  });
  
  // Auto-migrate tables
  await p.query(`
    CREATE TABLE IF NOT EXISTS audit_users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      subscription_plan TEXT NOT NULL DEFAULT 'free',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='audit_users' AND column_name='subscription_plan'
      ) THEN
        ALTER TABLE audit_users ADD COLUMN subscription_plan TEXT NOT NULL DEFAULT 'free';
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS audit_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='audit_records' AND column_name='user_id'
      ) THEN
        ALTER TABLE audit_records ADD COLUMN user_id INTEGER REFERENCES audit_users(id);
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS audit_plan_settings (
      plan_id TEXT PRIMARY KEY,
      openrouter_api_key TEXT DEFAULT '',
      allowed_models TEXT DEFAULT ''
    );

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='audit_plan_settings' AND column_name='price'
      ) THEN
        ALTER TABLE audit_plan_settings ADD COLUMN price TEXT NOT NULL DEFAULT '$0';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='audit_plan_settings' AND column_name='ai_provider'
      ) THEN
        ALTER TABLE audit_plan_settings ADD COLUMN ai_provider TEXT DEFAULT 'openrouter';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name='audit_plan_settings' AND column_name='agentrouter_api_key'
      ) THEN
        ALTER TABLE audit_plan_settings ADD COLUMN agentrouter_api_key TEXT DEFAULT '';
      END IF;
    END
    $$;

    CREATE TABLE IF NOT EXISTS audit_intake_leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id INTEGER REFERENCES audit_users(id),
      url TEXT NOT NULL,
      company_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      goals TEXT,
      stack TEXT,
      team_size TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agent_guardrails (
      id SERIAL PRIMARY KEY,
      error_pattern TEXT NOT NULL,
      guardrail_prompt TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS agent_flywheel (
      id SERIAL PRIMARY KEY,
      run_id TEXT NOT NULL,
      latency_ms INTEGER NOT NULL,
      cost_usd TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      context_summary TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    INSERT INTO audit_plan_settings (plan_id, allowed_models, price) 
    VALUES 
      ('free', '', '$0'),
      ('pro', 'anthropic/claude-3.5-sonnet,google/gemma-7b-it', '$29'),
      ('enterprise', 'anthropic/claude-3.5-sonnet,anthropic/claude-3-opus,meta-llama/llama-3-70b-instruct', '$99')
    ON CONFLICT (plan_id) DO NOTHING;
  `);
  
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
