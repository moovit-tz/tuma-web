import "server-only";
import { and, count, eq, ilike, isNull, sql } from "drizzle-orm";
import type { Tx } from "../db/client";
import { accounts, invoices, partnerInvoices } from "../db/schema";
import { formatInvoiceNumber, invoiceCodeCandidates, invoicePrefix } from "@/domain/invoice-number";

/** This business's invoice code, made from its name the first time it invoices and then kept. */
export async function invoiceCodeFor(tx: Tx, accountId: string): Promise<string> {
  const [a] = await tx.select({ code: accounts.invoiceCode, name: accounts.name }).from(accounts).where(eq(accounts.id, accountId));
  if (a?.code) return a.code;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext('invoice_code'))`);
  const base = invoiceCodeCandidates(a?.name ?? "");
  const tries = [...base, ...[2, 3, 4, 5, 6, 7, 8, 9].map((d) => `${base[0]}${d}`), ...Array.from({ length: 90 }, (_, i) => `${base[0]}${i + 10}`)];
  for (const code of tries) {
    const [taken] = await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.invoiceCode, code));
    if (taken) continue;
    const [set] = await tx
      .update(accounts)
      .set({ invoiceCode: code })
      .where(and(eq(accounts.id, accountId), isNull(accounts.invoiceCode)))
      .returning({ code: accounts.invoiceCode });
    if (set?.code) return set.code;
    const [again] = await tx.select({ code: accounts.invoiceCode }).from(accounts).where(eq(accounts.id, accountId));
    if (again?.code) return again.code;
  }
  throw new Error(`No free invoice code for ${accountId}`);
}

/**
 * The next invoice number for this business this month. Counts its counter invoices and its partner invoices
 * together, so the two can never share a number. Call inside the transaction that inserts the invoice.
 */
export async function nextInvoiceNumber(tx: Tx, accountId: string, at = new Date()): Promise<string> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`inv:${accountId}`}))`);
  const code = await invoiceCodeFor(tx, accountId);
  const like = `${invoicePrefix(code, at)}%`;
  const [[a], [b]] = await Promise.all([
    tx.select({ n: count() }).from(invoices).where(and(eq(invoices.accountId, accountId), ilike(invoices.number, like))),
    tx.select({ n: count() }).from(partnerInvoices).where(and(eq(partnerInvoices.partnerAccountId, accountId), ilike(partnerInvoices.number, like))),
  ]);
  return formatInvoiceNumber(code, at, Number(a.n) + Number(b.n) + 1);
}
