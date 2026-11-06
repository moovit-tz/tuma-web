import "server-only";
import { randomUUID } from "node:crypto";

/**
 * Hudumika Bliss adapter: support tickets for signed-in Tuma people (the app's Help screen).
 *
 * Bliss owns tickets. Tuma's backend calls Bliss's service routes (`{BLISS_API_URL}/service/tickets`, header
 * `x-service-key: BLISS_SERVICE_KEY`, see moovit-beta services/bliss-api/src/routes/service) with the person's Ondi
 * subject; Bliss scopes every read to that person and to sourceApp "tuma".
 * Without BLISS_API_URL (BLISS_MODE=stub) tickets live in this process only, for development and tests.
 */
export const SOURCE_APP = "tuma";

export type TicketSummary = {
  id: string;
  ref: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  message_count: number;
};
export type TicketMessage = { id: string; from: "customer" | "support"; author: string; content: string; at: string };
export type Ticket = Omit<TicketSummary, "message_count"> & { description: string | null; resolved_at: string | null; messages: TicketMessage[] };

export type NewTicket = {
  ondiUserId: string;
  name: string;
  email?: string;
  phone?: string;
  subject: string;
  category: string;
  message: string;
  priority?: "NORMAL" | "HIGH";
  relatedRef?: string;
};

export class BlissError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const blissStub = () => (process.env.BLISS_MODE ?? (process.env.BLISS_API_URL ? "http" : "stub")) === "stub";

async function call<T>(method: "GET" | "POST", path: string, opts: { query?: Record<string, string>; body?: unknown } = {}): Promise<T> {
  const base = (process.env.BLISS_API_URL ?? "").replace(/\/$/, "");
  const url = new URL(`${base}/service/tickets${path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json", "x-service-key": process.env.BLISS_SERVICE_KEY ?? "" },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new BlissError(res.status, json.error ?? `Bliss answered ${res.status}`);
  return json as T;
}

/* ------------------------------------------------------------ stub */

type StubTicket = Ticket & { owner: string };
const stub = ((globalThis as { __blissStub?: Map<string, StubTicket> }).__blissStub ??= new Map());
const now = () => new Date().toISOString();
const stubOwned = (owner: string, id: string) => {
  const t = stub.get(id);
  if (!t || t.owner !== owner) throw new BlissError(404, "Ticket not found");
  return t;
};

/** Test/dev only: support answers on a stub ticket, as a Bliss officer would. */
export function stubSupportReply(id: string, content: string, status?: string) {
  const t = stub.get(id);
  if (!t) return;
  t.messages.push({ id: randomUUID(), from: "support", author: "Support", content, at: now() });
  if (status) t.status = status;
  t.updated_at = now();
}

/* ------------------------------------------------------------ calls */

export async function createTicket(t: NewTicket): Promise<{ id: string; ref: string; status: string }> {
  if (blissStub()) {
    const id = randomUUID();
    const ref = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const at = now();
    stub.set(id, {
      owner: t.ondiUserId,
      id,
      ref,
      subject: t.subject,
      category: t.category,
      status: "OPEN",
      priority: t.priority ?? "NORMAL",
      description: t.message,
      created_at: at,
      updated_at: at,
      resolved_at: null,
      messages: [],
    });
    return { id, ref, status: "OPEN" };
  }
  return call("POST", "", { body: { ...t, sourceApp: SOURCE_APP } });
}

export async function listTickets(ondiUserId: string): Promise<TicketSummary[]> {
  if (blissStub()) {
    return [...stub.values()]
      .filter((t) => t.owner === ondiUserId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .map(({ owner: _o, messages, description: _d, resolved_at: _r, ...t }) => ({ ...t, message_count: messages.length }));
  }
  const r = await call<{ tickets: TicketSummary[] }>("GET", "", { query: { ondiUserId, sourceApp: SOURCE_APP } });
  return r.tickets;
}

export async function getTicket(ondiUserId: string, id: string): Promise<Ticket> {
  if (blissStub()) {
    const { owner: _o, ...t } = stubOwned(ondiUserId, id);
    return structuredClone(t);
  }
  return call("GET", `/${encodeURIComponent(id)}`, { query: { ondiUserId, sourceApp: SOURCE_APP } });
}

export async function replyToTicket(ondiUserId: string, name: string, id: string, content: string) {
  if (blissStub()) {
    const t = stubOwned(ondiUserId, id);
    if (t.status === "CLOSED") throw new BlissError(409, "This ticket is closed. Open a new one.");
    t.messages.push({ id: randomUUID(), from: "customer", author: name, content, at: now() });
    if (t.status === "RESOLVED") (t.status = "OPEN"), (t.resolved_at = null);
    t.updated_at = now();
    return;
  }
  await call("POST", `/${encodeURIComponent(id)}/reply`, { body: { ondiUserId, sourceApp: SOURCE_APP, name, content } });
}
