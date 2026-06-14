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
