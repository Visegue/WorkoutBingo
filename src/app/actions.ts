"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  generateSlug,
  pickMemberColor,
  randomInviteCode,
  shuffle,
  slugWithSuffix,
} from "@/lib/domain";
import { siteUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const text = z.string().trim().min(1);
const uuid = z.string().uuid();

async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  await supabase.from("profiles").upsert({
    id: data.user.id,
    display_name:
      data.user.user_metadata?.full_name ?? data.user.email ?? "Player",
  });

  return { supabase, user: data.user };
}

async function requireLeader(teamId: string) {
  const session = await requireUser();
  const { data } = await session.supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", session.user.id)
    .eq("role", "leader")
    .maybeSingle();

  if (!data) throw new Error("Leader access required");
  return session;
}

// =============================================================
// Auth actions
// =============================================================

export async function signInWithEmail(formData: FormData) {
  const email = z.string().email().parse(formData.get("email"));
  const next = safeNextPath(formData.get("next"));
  const callbackUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;
  const supabase = await createClient();
  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl },
  });
  redirect(`/login?sent=1&next=${encodeURIComponent(next)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url) throw error ?? new Error("Google sign-in failed");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// =============================================================
// Team actions
// =============================================================

export async function createTeam(formData: FormData) {
  const name = text.max(80).parse(formData.get("name"));
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("teams")
    .insert({ name, created_by: user.id })
    .select("id")
    .single();
  if (error) throw error;

  await supabase
    .from("team_members")
    .insert({ team_id: data.id, user_id: user.id, role: "leader" });
  redirect(`/teams/${data.id}`);
}

// =============================================================
// Invite actions (leader-only invites)
// =============================================================

export async function createInvite(formData: FormData) {
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase, user } = await requireLeader(teamId);
  const { error } = await supabase.from("team_invites").insert({
    team_id: teamId,
    code: randomInviteCode(),
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath(`/teams/${teamId}`);
}

/**
 * Join a team via invite code. User becomes a leader.
 */
export async function joinInvite(formData: FormData) {
  const code = text.max(40).parse(formData.get("code")).toUpperCase();
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("team_invites")
    .select("team_id")
    .eq("code", code)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Invite not found");

  await supabase
    .from("team_members")
    .upsert({ team_id: data.team_id, user_id: user.id, role: "leader" });
  redirect(`/teams/${data.team_id}`);
}

// =============================================================
// Member actions (leaders manage team members/players)
// =============================================================

export async function createMember(formData: FormData) {
  const teamId = uuid.parse(formData.get("teamId"));
  const displayName = text.max(80).parse(formData.get("displayName"));
  const { supabase, user } = await requireLeader(teamId);

  // Count existing members to pick a unique color
  const { count } = await supabase
    .from("members")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  const color = pickMemberColor(count ?? 0);

  const { error } = await supabase.from("members").insert({
    team_id: teamId,
    display_name: displayName,
    color,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "23505") throw new Error("Namnet finns redan i laget");
    throw error;
  }
  revalidatePath(`/teams/${teamId}`);
}

export async function renameMember(formData: FormData) {
  const memberId = uuid.parse(formData.get("memberId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const displayName = text.max(80).parse(formData.get("displayName"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("members")
    .update({ display_name: displayName })
    .eq("id", memberId)
    .eq("team_id", teamId);
  if (error) {
    if (error.code === "23505") throw new Error("Namnet finns redan i laget");
    throw error;
  }
  revalidatePath(`/teams/${teamId}/members`);
}

export async function deleteMember(formData: FormData) {
  const memberId = uuid.parse(formData.get("memberId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("members")
    .delete()
    .eq("id", memberId)
    .eq("team_id", teamId);
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/members`);
}

export async function updateMemberColor(formData: FormData) {
  const memberId = uuid.parse(formData.get("memberId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const color = z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .parse(formData.get("color"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("members")
    .update({ color })
    .eq("id", memberId)
    .eq("team_id", teamId);
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/members`);
}

// =============================================================
// Board actions
// =============================================================

export async function deleteBoard(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("boards")
    .delete()
    .eq("id", boardId)
    .eq("team_id", teamId);
  if (error) throw error;
  redirect(`/teams/${teamId}`);
}

export async function createBoard(formData: FormData) {
  const teamId = uuid.parse(formData.get("teamId"));
  const title = text.max(100).parse(formData.get("title"));
  const width = z.coerce
    .number()
    .int()
    .min(2)
    .max(10)
    .parse(formData.get("width"));
  const height = z.coerce
    .number()
    .int()
    .min(2)
    .max(10)
    .parse(formData.get("height"));
  const description = z
    .string()
    .trim()
    .max(2000)
    .parse(formData.get("description") ?? "");
  const { supabase, user } = await requireLeader(teamId);

  // Generate slug from team name + board title
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();
  let slug = generateSlug(team?.name ?? "team", title);

  // Check uniqueness, add suffix if needed
  const { data: existing } = await supabase
    .from("boards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    slug = slugWithSuffix(slug);
  }

  const { data, error } = await supabase
    .from("boards")
    .insert({
      team_id: teamId,
      title,
      width,
      height,
      description,
      slug,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/teams/${teamId}/boards/${data.id}/edit`);
}

export async function updateDraftBoard(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const title = text.max(100).parse(formData.get("title"));
  const width = z.coerce
    .number()
    .int()
    .min(2)
    .max(10)
    .parse(formData.get("width"));
  const height = z.coerce
    .number()
    .int()
    .min(2)
    .max(10)
    .parse(formData.get("height"));
  const description = z
    .string()
    .trim()
    .max(2000)
    .parse(formData.get("description") ?? "");
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("boards")
    .update({ title, width, height, description })
    .eq("id", boardId)
    .eq("team_id", teamId)
    .eq("status", "draft");
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/boards/${boardId}/edit`);
}

export async function updateBoardSlug(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const slug = z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/, "Slug must be lowercase, alphanumeric, hyphens only")
    .parse(formData.get("slug"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("boards")
    .update({ slug })
    .eq("id", boardId)
    .eq("team_id", teamId);
  if (error) {
    if (error.code === "23505") throw new Error("Denna URL är redan upptagen");
    throw error;
  }
  revalidatePath(`/teams/${teamId}/boards/${boardId}/edit`);
}

export async function addTask(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const title = text.max(120).parse(formData.get("title"));
  const description = z
    .string()
    .trim()
    .max(1000)
    .parse(formData.get("description") ?? "");
  const appearanceCount = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(formData.get("appearanceCount"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("tasks")
    .insert({
      board_id: boardId,
      title,
      description,
      appearance_count: appearanceCount,
    });
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/boards/${boardId}/edit`);
}

export async function deleteTask(formData: FormData) {
  const taskId = uuid.parse(formData.get("taskId"));
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("board_id", boardId);
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/boards/${boardId}/edit`);
}

export async function autoFitTaskCounts(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase } = await requireLeader(teamId);
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, width, height, status")
    .eq("id", boardId)
    .eq("team_id", teamId)
    .single();
  if (boardError) throw boardError;
  if (board.status !== "draft") throw new Error("Board must be a draft");

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, appearance_count")
    .eq("board_id", boardId)
    .order("title", { ascending: true });
  if (tasksError) throw tasksError;
  if (!tasks?.length) throw new Error("Add tasks before auto-fitting");

  const targetCells = board.width * board.height;
  const adjusted = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    appearance_count: task.appearance_count,
  }));
  let total = adjusted.reduce((sum, task) => sum + task.appearance_count, 0);

  if (total > targetCells && adjusted.length > targetCells) {
    throw new Error("Too many tasks to fit without deleting some");
  }

  while (total > targetCells) {
    const candidate = adjusted
      .filter((task) => task.appearance_count > 1)
      .sort((a, b) => {
        const countDiff = b.appearance_count - a.appearance_count;
        return countDiff || a.title.localeCompare(b.title, "sv");
      })[0];

    if (!candidate) throw new Error("Could not reduce task counts enough");
    candidate.appearance_count -= 1;
    total -= 1;
  }

  let nextIncreaseIndex = 0;
  while (total < targetCells) {
    adjusted[nextIncreaseIndex].appearance_count += 1;
    total += 1;
    nextIncreaseIndex = (nextIncreaseIndex + 1) % adjusted.length;
  }

  for (const task of adjusted) {
    const { error } = await supabase
      .from("tasks")
      .update({ appearance_count: task.appearance_count })
      .eq("id", task.id)
      .eq("board_id", boardId);
    if (error) throw error;
  }

  revalidatePath(`/teams/${teamId}/boards/${boardId}/edit`);
}

// =============================================================
// Autofill tasks
// =============================================================

const AUTOFILL_POOL = [
  "Spring 5 km",
  "Spring 10 km",
  "Spring 3 km",
  "Målvaktsträning",
  "Skotträning",
  "Spela match med kompisar",
  "Backträning",
  "Intervallträning",
  "Knäkontroll",
  "Kolla på en match",
  "Passningsträning",
  "Jonglering",
];

export async function autofillTasks(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase } = await requireLeader(teamId);

  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, width, height, status")
    .eq("id", boardId)
    .eq("team_id", teamId)
    .single();
  if (boardError) throw boardError;
  if (board.status !== "draft") throw new Error("Board must be a draft");

  const { data: existingTasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, title, appearance_count")
    .eq("board_id", boardId);
  if (tasksError) throw tasksError;

  const boardCells = board.width * board.height;
  const usedSlots = (existingTasks ?? []).reduce(
    (sum, t) => sum + t.appearance_count,
    0,
  );
  let remaining = boardCells - usedSlots;
  if (remaining <= 0) throw new Error("Board is already full");

  // Filter out tasks already on the board
  const existingTitles = new Set(
    (existingTasks ?? []).map((t) => t.title.toLowerCase()),
  );
  const available = shuffle(
    AUTOFILL_POOL.filter((t) => !existingTitles.has(t.toLowerCase())),
  );
  if (available.length === 0) throw new Error("No new tasks available to add");

  // Assign random appearance counts (1-3) to each task
  const newTasks: { title: string; count: number }[] = [];
  let i = 0;
  while (remaining > 0 && i < available.length) {
    const maxCount = Math.min(3, remaining);
    const count = Math.max(1, Math.floor(Math.random() * maxCount) + 1);
    newTasks.push({ title: available[i], count });
    remaining -= count;
    i++;
  }

  // If pool exhausted but slots remain, distribute extra across chosen tasks
  while (remaining > 0) {
    for (let j = 0; j < newTasks.length && remaining > 0; j++) {
      newTasks[j].count += 1;
      remaining -= 1;
    }
  }

  // Insert all new tasks
  const { error: insertError } = await supabase.from("tasks").insert(
    newTasks.map((t) => ({
      board_id: boardId,
      title: t.title,
      description: "",
      appearance_count: t.count,
    })),
  );
  if (insertError) throw insertError;

  revalidatePath(`/teams/${teamId}/boards/${boardId}/edit`);
}

export async function generateBoard(formData: FormData) {
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const resetConfirmed = formData.get("resetConfirmed") === "on";
  const { supabase } = await requireLeader(teamId);
  const { data: board, error: boardError } = await supabase
    .from("boards")
    .select("id, team_id, title, width, height, status")
    .eq("id", boardId)
    .eq("team_id", teamId)
    .single();
  if (boardError) throw boardError;
  if (board.status === "active" && !resetConfirmed)
    throw new Error("Reset confirmation required");

  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, appearance_count")
    .eq("board_id", boardId);
  if (tasksError) throw tasksError;

  const taskIds = (tasks ?? []).flatMap((task) =>
    Array.from({ length: task.appearance_count }, () => task.id),
  );
  if (taskIds.length !== board.width * board.height) {
    throw new Error("Task appearances must equal board width x height");
  }

  const { data: existingCells } = await supabase
    .from("board_cells")
    .select("id")
    .eq("board_id", boardId);
  const existingCellIds = existingCells?.map((cell) => cell.id) ?? [];
  if (existingCellIds.length > 0) {
    await supabase.from("cell_checks").delete().in("cell_id", existingCellIds);
  }
  await supabase.from("board_cells").delete().eq("board_id", boardId);

  const cells = shuffle(taskIds).map((taskId, position) => ({
    board_id: boardId,
    task_id: taskId,
    position,
  }));
  const { error: insertError } = await supabase
    .from("board_cells")
    .insert(cells);
  if (insertError) throw insertError;

  const { error: updateError } = await supabase
    .from("boards")
    .update({
      status: "active",
      generated_at: new Date().toISOString(),
    })
    .eq("id", boardId)
    .eq("team_id", teamId);
  if (updateError) throw updateError;
  redirect(`/teams/${teamId}/boards/${boardId}`);
}
