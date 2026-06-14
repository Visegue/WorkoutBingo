"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { randomInviteCode, shuffle } from "@/lib/domain";
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
// Invite actions
// =============================================================

export async function createInvite(formData: FormData) {
  const teamId = uuid.parse(formData.get("teamId"));
  const role = z
    .enum(["leader", "kid"])
    .parse(formData.get("role") ?? "kid");
  const { supabase, user } = await requireLeader(teamId);
  const { error } = await supabase.from("team_invites").insert({
    team_id: teamId,
    code: randomInviteCode(),
    role,
    created_by: user.id,
  });
  if (error) throw error;
  revalidatePath(`/teams/${teamId}`);
}

/**
 * Join a team via invite code.
 * For "leader" invites: user becomes a leader, redirected to team page.
 * For "kid" invites: user becomes a kid member, redirected to member selection page.
 */
export async function joinInvite(formData: FormData) {
  const code = text.max(40).parse(formData.get("code")).toUpperCase();
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("team_invites")
    .select("team_id, role")
    .eq("code", code)
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) throw error ?? new Error("Invite not found");

  await supabase
    .from("team_members")
    .upsert({ team_id: data.team_id, user_id: user.id, role: data.role });

  if (data.role === "leader") {
    redirect(`/teams/${data.team_id}`);
  } else {
    // Redirect to member selection page
    redirect(`/teams/${data.team_id}/join`);
  }
}

/**
 * Join via invite link (used by /invite/[code] page).
 * Returns the invite data without redirecting so the page can handle the flow.
 */
export async function joinViaInviteLink(code: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("team_invites")
    .select("team_id, role")
    .eq("code", code.toUpperCase())
    .is("revoked_at", null)
    .maybeSingle();
  if (error || !data) return null;

  await supabase
    .from("team_members")
    .upsert({ team_id: data.team_id, user_id: user.id, role: data.role });

  return data;
}

// =============================================================
// Member actions
// =============================================================

export async function createMember(formData: FormData) {
  const teamId = uuid.parse(formData.get("teamId"));
  const displayName = text.max(80).parse(formData.get("displayName"));
  const { supabase, user } = await requireLeader(teamId);
  const { error } = await supabase.from("members").insert({
    team_id: teamId,
    display_name: displayName,
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

/**
 * Associate the current user with an existing member (during join flow or later).
 */
export async function associateMember(formData: FormData) {
  const memberId = uuid.parse(formData.get("memberId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase, user } = await requireUser();

  // Verify user is a team member
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) throw new Error("Not a team member");

  // Verify the member belongs to this team
  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("id", memberId)
    .eq("team_id", teamId)
    .maybeSingle();
  if (!member) throw new Error("Member not found");

  const { error } = await supabase
    .from("member_accounts")
    .upsert({ member_id: memberId, user_id: user.id });
  if (error) throw error;
  redirect(`/teams/${teamId}`);
}

/**
 * Create a new member and immediately associate the current user with it.
 * Used during the join flow when no existing member matches.
 */
export async function createAndAssociateMember(formData: FormData) {
  const teamId = uuid.parse(formData.get("teamId"));
  const displayName = text.max(80).parse(formData.get("displayName"));
  const { supabase, user } = await requireUser();

  // Verify user is a team member
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) throw new Error("Not a team member");

  // Create member (leader check not needed here; the user is creating themselves)
  // We use the user's ID as created_by
  const { data: member, error: memberError } = await supabase
    .from("members")
    .insert({
      team_id: teamId,
      display_name: displayName,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (memberError) {
    if (memberError.code === "23505")
      throw new Error("Namnet finns redan i laget");
    throw memberError;
  }

  const { error } = await supabase
    .from("member_accounts")
    .insert({ member_id: member.id, user_id: user.id });
  if (error) throw error;
  redirect(`/teams/${teamId}`);
}

/**
 * Leader unlinks an account from a member.
 */
export async function unlinkAccount(formData: FormData) {
  const memberId = uuid.parse(formData.get("memberId"));
  const userId = uuid.parse(formData.get("userId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase } = await requireLeader(teamId);
  const { error } = await supabase
    .from("member_accounts")
    .delete()
    .eq("member_id", memberId)
    .eq("user_id", userId);
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/members`);
}

/**
 * Leader links themselves (or another user) to a member.
 */
export async function linkAccountToMember(formData: FormData) {
  const memberId = uuid.parse(formData.get("memberId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const { supabase, user } = await requireLeader(teamId);
  const { error } = await supabase
    .from("member_accounts")
    .upsert({ member_id: memberId, user_id: user.id });
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/members`);
}

// =============================================================
// Board actions
// =============================================================

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
  const { data, error } = await supabase
    .from("boards")
    .insert({
      team_id: teamId,
      title,
      width,
      height,
      description,
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
    .update({ status: "active", generated_at: new Date().toISOString() })
    .eq("id", boardId)
    .eq("team_id", teamId);
  if (updateError) throw updateError;
  redirect(`/teams/${teamId}/boards/${boardId}`);
}

// =============================================================
// Cell check actions (now member-based)
// =============================================================

export async function checkCell(formData: FormData) {
  const cellId = uuid.parse(formData.get("cellId"));
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const memberId = uuid.parse(formData.get("memberId"));
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("cell_checks")
    .insert({ cell_id: cellId, member_id: memberId });
  if (error && error.code !== "23505") throw error;
  revalidatePath(`/teams/${teamId}/boards/${boardId}`);
}

export async function uncheckCell(formData: FormData) {
  const cellId = uuid.parse(formData.get("cellId"));
  const boardId = uuid.parse(formData.get("boardId"));
  const teamId = uuid.parse(formData.get("teamId"));
  const memberId = uuid.parse(formData.get("memberId"));
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("cell_checks")
    .delete()
    .eq("cell_id", cellId)
    .eq("member_id", memberId);
  if (error) throw error;
  revalidatePath(`/teams/${teamId}/boards/${boardId}`);
}
