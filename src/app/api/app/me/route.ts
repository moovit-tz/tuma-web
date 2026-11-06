import { driverRoute } from "@/server/http/driver-api";
import { appMe } from "@/server/services/drivers";
import { deleteMyAccount } from "@/server/services/account-deletion";

/** GET → { user, driver (null until registered), modules } for the signed-in Tuma app user. */
export const GET = driverRoute(async (ctx) => appMe(ctx));

/** DELETE → { deleted: true }: deletes their Tuma account (not their Ondi account). 409 with the reason when it can't yet. */
export const DELETE = driverRoute(async (ctx) => deleteMyAccount(ctx));
