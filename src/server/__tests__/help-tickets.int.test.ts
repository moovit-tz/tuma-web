import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";
import { driverContext, finishDriverLogin, swapHandoff, type DriverCtx } from "../services/drivers";
import { myTicket, myTickets, openTicket, replyTicket } from "../services/help-tickets";
import { stubSupportReply } from "../adapters/bliss";
import { verifyDriverToken } from "../auth/driver-token";

const A = "ondi|help.tickets.a";
const B = "ondi|help.tickets.b";
const SUBS = [A, B];

async function signIn(sub: string): Promise<DriverCtx> {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const code = await finishDriverLogin({ sub, name: "Asha Help", email: "asha@example.test", phone: "+255711000888", roles: [] }, challenge);
  const { token } = await swapHandoff(code, verifier);
  return (await driverContext(await verifyDriverToken(token)))!;
}

async function cleanup() {
  await db.execute(sql`delete from driver_handoffs where user_id in (${sql.join(SUBS.map((s) => sql`${s}`), sql`, `)})`);
  await db.delete(users).where(inArray(users.id, SUBS));
}

describe("help tickets (Bliss, stub)", () => {
  let a: DriverCtx;
  let b: DriverCtx;
  beforeAll(async () => {
    delete process.env.BLISS_API_URL;
    await cleanup();
    a = await signIn(A);
    b = await signIn(B);
  });
  afterAll(cleanup);

  it("opens, lists, answers and replies, only for the owner", async () => {
    await expect(openTicket(a.user, { topic: "printer", subject: "x", message: "short" })).rejects.toThrow();
    const t = await openTicket(a.user, { topic: "printer", subject: "Labels print blank", message: "The sticker comes out empty since this morning." });
    expect(t.ref).toMatch(/^SUP-/);

    const mine = await myTickets(a.user);
    expect(mine.tickets.map((x) => x.id)).toContain(t.id);
    expect((await myTickets(b.user)).tickets.map((x) => x.id)).not.toContain(t.id);
    await expect(myTicket(b.user, t.id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    stubSupportReply(t.id, "Try a new paper roll.", "RESOLVED");
    const after = await replyTicket(a.user, t.id, { message: "Still blank." });
    expect(after.status).toBe("OPEN");
    expect(after.messages.map((m) => m.from)).toEqual(["support", "customer"]);

    stubSupportReply(t.id, "Closing.", "CLOSED");
    await expect(replyTicket(a.user, t.id, { message: "Hello?" })).rejects.toMatchObject({ code: "CLOSED" });
  });
});
