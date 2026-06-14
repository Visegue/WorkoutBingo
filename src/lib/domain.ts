import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/env";

export async function getUser() {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function ensureProfile() {
  if (!hasSupabaseEnv()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  await supabase.from("profiles").upsert({
    id: data.user.id,
    display_name:
      data.user.user_metadata?.full_name ?? data.user.email ?? "Player",
  });

  return data.user;
}

export function randomInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

/**
 * Generate a URL-safe slug from team name and board title.
 * Format: "team-name-board-title" (lowercased, special chars replaced with hyphens).
 */
export function generateSlug(teamName: string, boardTitle: string): string {
  const raw = `${teamName}-${boardTitle}`;
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, 60); // reasonable max length
}

/**
 * Ensure slug uniqueness by appending a short random suffix if needed.
 */
export function slugWithSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${slug}-${suffix}`;
}
