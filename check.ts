import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "./src/db/schema";
import { config } from "dotenv";

config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes("localhost") ? false : { rejectUnauthorized: false },
});
const db = drizzle(pool, { schema });

async function check() {
  const settings = await db.select().from(schema.planSettings);
  console.log("Settings:");
  console.log(settings);
  if (settings.length > 0) {
    console.log("Keys of first setting:", Object.keys(settings[0]));
    console.log("openRouterApiKey value:", settings[0].openRouterApiKey);
  }

  const auths = await db.select().from(schema.users);
  console.log("Users:");
  console.log(JSON.stringify(auths, null, 2));
  
  process.exit(0);
}

check();
