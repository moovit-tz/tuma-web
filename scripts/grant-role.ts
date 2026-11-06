/**
 * Grants a Tuma role to a person who has signed in with Ondi at least once (real Ondi carries no Tuma roles).
 * The role goes into both `roles` and `grantedRoles`, so it survives later sign-ins.
 *   pnpm tsx scripts/grant-role.ts <email-or-ondi-sub> <role-key> [account-id]
 * e.g. the first platform admin:  pnpm tsx scripts/grant-role.ts admin@moovit.co.tz tuma_admin acc_moovit_ops
 */
import { config } from "dotenv";
config({ path: process.env.ENV_FILE ?? ".env.local" });

(async () => {
  const [who, role, accountId] = process.argv.slice(2);
  if (!who || !role) throw new Error("Usage: grant-role.ts <email-or-ondi-sub> <role-key> [account-id]");
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const schema = await import("../src/server/db/schema");
  const { eq, or } = await import("drizzle-orm");
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema, casing: "snake_case" });
  const { roles, users } = schema;
  const [r] = await db.select().from(roles).where(eq(roles.key, role));
  if (!r) throw new Error(`No role "${role}". Seed roles first (pnpm db:seed --platform).`);
  const [u] = await db.select().from(users).where(or(eq(users.id, who), eq(users.email, who)));
  if (!u) throw new Error(`No user "${who}". They need to sign in to Tuma with Ondi once first.`);
  const add = (l: string[]) => [...new Set([...l, role])];
  await db
    .update(users)
    .set({ roles: add(u.roles), grantedRoles: add(u.grantedRoles), ...(accountId ? { accountId } : {}) })
    .where(eq(users.id, u.id));
  console.log(`Granted ${role} to ${u.name} (${u.id})${accountId ? ` in ${accountId}` : ""}. They get it at their next sign-in.`);
  await client.end();
})().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
