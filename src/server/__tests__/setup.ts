import { config } from "dotenv";
import { vi } from "vitest";

config({ path: ".env.local" });
if (!process.env.DATABASE_URL_TEST) throw new Error("Set DATABASE_URL_TEST (see .env.example)");
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST; // never touch the dev database

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {}, updateTag: () => {}, refresh: () => {} }));
