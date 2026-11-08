import "server-only";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db/client";
import { platformSettings } from "./db/schema";
import { audit } from "./audit";
import { DomainError } from "./errors";
import type { CurrentUser } from "./auth/current-user";
import { SUPPORT } from "@/config/support";

/** Every platform setting: its type and the value used until someone changes it. */
const contactPhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 ]{6,18}$/, "Enter the number with its country code, e.g. +255 800 110 110");

export const SETTINGS = {
  /** How people reach Tuma support, shown in the app's Help screen. Tuma staff set it in Platform settings. */
  supportContacts: {
    schema: z.object({
      phone: contactPhone,
      whatsapp: contactPhone,
      email: z.string().trim().email("Enter a valid email address").max(120),
      hours: z.object({ en: z.string().trim().min(2).max(80), sw: z.string().trim().min(2).max(80) }),
    }),
    fallback: { phone: SUPPORT.phone, whatsapp: SUPPORT.whatsapp, email: SUPPORT.email, hours: { en: SUPPORT.hours.en, sw: SUPPORT.hours.sw } },
  },
  /** Parcels a business may take in while its application is still being reviewed. 0 = none until approval. */
  pendingParcelAllowance: { schema: z.coerce.number().int().min(0).max(10_000), fallback: 20 },
  /** Parcels a sending company may send on its account while its KYC is being reviewed. */
  pendingCompanyParcelAllowance: { schema: z.coerce.number().int().min(0).max(10_000), fallback: 5 },
  /** What a parcel can hold, offered as pills when an agent receives one. The key is stored as the parcel's category. */
  goodsTypes: {
    schema: z
      .array(
        z.object({
          key: z.string().trim().regex(/^[a-z0-9_]{2,40}$/),
          en: z.string().trim().min(2).max(40),
          sw: z.string().trim().min(2).max(40),
        }),
      )
      .min(1)
      .max(60),
    fallback: [
      { key: "clothes", en: "Clothes", sw: "Nguo" },
      { key: "shoes", en: "Shoes", sw: "Viatu" },
      { key: "electronics", en: "Electronics", sw: "Vifaa vya umeme" },
      { key: "phones", en: "Phones & accessories", sw: "Simu na vifaa" },
      { key: "spare_parts", en: "Spare parts", sw: "Spea" },
      { key: "documents", en: "Documents", sw: "Nyaraka" },
      { key: "cosmetics", en: "Cosmetics", sw: "Vipodozi" },
      { key: "household", en: "Household items", sw: "Vyombo vya nyumbani" },
      { key: "food", en: "Food (dry)", sw: "Chakula (kikavu)" },
      { key: "fabrics", en: "Fabrics & vitenge", sw: "Vitambaa na vitenge" },
      { key: "books", en: "Books & stationery", sw: "Vitabu na shajara" },
      { key: "bags", en: "Bags", sw: "Mabegi" },
      { key: "hardware", en: "Hardware & tools", sw: "Vifaa na zana" },
      { key: "medicine", en: "Medicine", sw: "Dawa" },
      { key: "toys", en: "Toys", sw: "Vitu vya kuchezea" },
      { key: "general", en: "Other", sw: "Vinginevyo" },
    ],
  },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = z.output<(typeof SETTINGS)[K]["schema"]>;

export async function getSetting<K extends SettingKey>(key: K): Promise<SettingValue<K>> {
  const [row] = await db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, key));
  const parsed = SETTINGS[key].schema.safeParse(row?.value);
  return (parsed.success ? parsed.data : SETTINGS[key].fallback) as SettingValue<K>;
}

/** Change a setting (settings.manage). Logged in the audit trail with the old and new value. */
export async function putSetting<K extends SettingKey>(user: CurrentUser, key: K, raw: unknown): Promise<SettingValue<K>> {
  if (!user.permissions.has("settings.manage")) throw new DomainError("FORBIDDEN", "You cannot change platform settings.", 403);
  const value = SETTINGS[key].schema.parse(raw) as SettingValue<K>;
  const before = await getSetting(key);
  await db.transaction(async (tx) => {
    await tx
      .insert(platformSettings)
      .values({ key, value, updatedBy: user.id })
      .onConflictDoUpdate({ target: platformSettings.key, set: { value, updatedBy: user.id, updatedAt: new Date() } });
    await audit(tx, { actorId: user.id, action: "settings.update", entity: "setting", entityId: key, before, after: value });
  });
  return value;
}

export async function settingMeta(key: SettingKey) {
  const [row] = await db.select({ updatedBy: platformSettings.updatedBy, updatedAt: platformSettings.updatedAt }).from(platformSettings).where(eq(platformSettings.key, key));
  return row ?? null;
}
