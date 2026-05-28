import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./schema";

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
  if (!connectionString) return; // Wait until configured
  
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
      allowed_models TEXT DEFAULT 'google/gemini-2.5-flash'
    );

    INSERT INTO audit_plan_settings (plan_id, allowed_models) 
    VALUES 
      ('free', ''),
      ('pro', 'anthropic/claude-4.5-haiku,google/gemini-3.5-flash,google/gemini-3.1-flash-lite,openai/gpt-5.4,openai/gpt-5.4-mini'),
      ('enterprise', 'anthropic/claude-4.7-opus,anthropic/claude-4.6-sonnet,anthropic/claude-4.5-haiku,google/gemini-3.1-pro,google/gemini-2.5-pro,google/gemini-3.5-flash,google/gemini-3.1-flash-lite,openai/gpt-5.5,openai/gpt-5.4,openai/gpt-5.4-mini')
    ON CONFLICT (plan_id) DO UPDATE SET allowed_models = EXCLUDED.allowed_models;
  `);
  
  // Ensure default admin exists
  const res = await p.query('SELECT * FROM audit_users WHERE username = $1', ['admin']);
  if (res.rowCount === 0) {
    // password is 'admin123'
    await p.query(
      'INSERT INTO audit_users (username, password_hash, is_admin) VALUES ($1, $2, $3)',
      ['admin', '$2b$10$0Jg2mdpVRBGSv8w/6sqX3.ibRy1wOIvZ4xe8oq4sACsvIh503UG.2', true] 
    );
  }
  
  console.log("Database initialized and schema verified.");
}
