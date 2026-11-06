/**
 * Dev and test databases are built with `drizzle-kit push`, which doesn't run the triggers in
 * drizzle/0001_references.sql. This applies the same guards: pnpm tsx scripts/apply-reference-guards.ts [DATABASE_URL]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
const url = process.argv[2] ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, onnotice: () => {} });
const statements = readFileSync(path.join(__dirname, "../src/server/db/reference-guards.sql"), "utf8")
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);
(async () => {
  for (const s of statements) await sql.unsafe(s);
  await sql.end();
  console.log(`Reference guards applied (${statements.length} statements).`);
})();
