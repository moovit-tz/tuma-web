import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client";
import { savedPlaces } from "../db/schema";
import { DomainError } from "./shipments";
import type { CurrentUser } from "../auth/current-user";
import { TZ_REGIONS } from "@/domain/pricing";

/**
 * A person's saved places: one home, one work, and favourites. Picked on the map (the pin gives the region and
 * district), offered first when they send a parcel to the door or set their area.
 */

const MAX_FAVOURITES = 20;

const placeSchema = z.object({
  kind: z.enum(["home", "work", "favourite"]),
  label: z.string().trim().max(40).optional(),
  line: z.string().trim().min(2, "Pick the place on the map").max(200),
  region: z.enum(TZ_REGIONS),
  district: z.string().trim().min(2).max(60),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const out = (p: typeof savedPlaces.$inferSelect) => ({ id: p.id, kind: p.kind, label: p.label, line: p.line, region: p.region, district: p.district, lat: p.lat, lng: p.lng });

export async function myPlaces(user: CurrentUser) {
  const rows = await db
    .select()
    .from(savedPlaces)
    .where(eq(savedPlaces.userId, user.id))
    .orderBy(sql`case ${savedPlaces.kind} when 'home' then 0 when 'work' then 1 else 2 end`, asc(savedPlaces.label));
  return { places: rows.map(out) };
}

/** Save a place. Home and work are one each, so saving one again moves it. */
export async function savePlace(user: CurrentUser, raw: unknown) {
  const b = placeSchema.parse(raw);
  const label = b.label || (b.kind === "home" ? "Home" : b.kind === "work" ? "Work" : b.line.split(",")[0].slice(0, 40));
  const values = { userId: user.id, kind: b.kind, label, line: b.line, region: b.region, district: b.district, lat: b.lat, lng: b.lng };
  if (b.kind === "favourite") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(savedPlaces)
      .where(and(eq(savedPlaces.userId, user.id), eq(savedPlaces.kind, "favourite")));
    if (n >= MAX_FAVOURITES) throw new DomainError("TOO_MANY_PLACES", `You can save up to ${MAX_FAVOURITES} favourite places. Remove one first.`);
    await db.insert(savedPlaces).values(values);
  } else {
    await db.transaction(async (tx) => {
      await tx.delete(savedPlaces).where(and(eq(savedPlaces.userId, user.id), eq(savedPlaces.kind, b.kind)));
      await tx.insert(savedPlaces).values(values);
    });
  }
  return myPlaces(user);
}

export async function removePlace(user: CurrentUser, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new DomainError("NOT_FOUND", "That place isn't saved.", 404);
  const r = await db.delete(savedPlaces).where(and(eq(savedPlaces.id, id), eq(savedPlaces.userId, user.id))).returning({ id: savedPlaces.id });
  if (!r.length) throw new DomainError("NOT_FOUND", "That place isn't saved.", 404);
  return myPlaces(user);
}
