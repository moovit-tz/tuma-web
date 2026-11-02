"use server";
import { getCurrentUser } from "@/server/auth/current-user";
import { searchPortal, type SearchResult } from "@/server/services/search";

export async function searchAction(q: string, locale: string): Promise<SearchResult> {
  const user = await getCurrentUser();
  if (!user) return { suggestions: [], groups: [], understood: [] };
  return searchPortal(user, q, locale);
}
