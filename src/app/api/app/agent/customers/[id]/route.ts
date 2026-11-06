import { body, driverRoute } from "@/server/http/driver-api";
import { customerProfile, deleteCustomer, updateCustomer } from "@/server/services/customers";

/** GET → one customer: their details, parcels, what's unpaid, a company's people, and how they use the business. */
export const GET = driverRoute<{ id: string }>(async (ctx, _req, p) => customerProfile(ctx.user, p.id));

/** PUT { name, email?, tin?, regNo?, contactName?, landmark? } → corrects their details. Needs partner.clients.manage. */
export const PUT = driverRoute<{ id: string }>(async (ctx, req, p) => updateCustomer(ctx.user, p.id, await body(req)));

/** DELETE → removes them from the list (parcels and invoices stay). Needs partner.clients.manage. */
export const DELETE = driverRoute<{ id: string }>(async (ctx, _req, p) => deleteCustomer(ctx.user, p.id));
