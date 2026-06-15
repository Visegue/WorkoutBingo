import {
  Badge,
  Button,
  Card,
  Code,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { createInvite } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { CreateBoardButton } from "@/components/create-board-button";
import { CreateMemberButton } from "@/components/create-member-button";
import { MemberCard } from "@/components/member-card";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const statusLabels = {
  draft: "utkast",
  active: "aktiv",
} as const;

const roleLabels = {
  leader: "ledare",
  kid: "spelare",
} as const;

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await ensureProfile();
  if (!user) return null;
  const { teamId } = await params;
  const supabase = await createClient();
  const [{ data: team }, { data: member }, { data: boards }, { data: invites }, { data: members }] =
    await Promise.all([
      supabase.from("teams").select("id, name").eq("id", teamId).single(),
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("boards")
        .select("id, title, status, slug, width, height, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: false }),
      supabase
        .from("team_invites")
        .select("code, created_at")
        .eq("team_id", teamId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("members")
        .select("id, display_name, color")
        .eq("team_id", teamId)
        .order("display_name"),
    ]);

  const isLeader = member?.role === "leader";

  return (
    <main className="page-shell">
      <Group justify="space-between" mb="xl">
        <div>
          <Text component="a" href="/dashboard" c="dimmed" size="sm">
            Tillbaka till översikt
          </Text>
          <Title>{team?.name ?? "Lag"}</Title>
          {member ? (
            <Badge color={isLeader ? "green" : "gray"}>
              {roleLabels[member.role]}
            </Badge>
          ) : null}
        </div>
      </Group>
      <div className="card-grid">
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
            <Title order={2}>Bingobrickor</Title>
            {isLeader ? <CreateBoardButton teamId={teamId} /> : null}
          </Group>
          <Stack mt="md">
            {boards?.length ? (
              boards.map((board) => (
                <div key={board.id}>
                  <Button
                    component="a"
                    href={`/teams/${teamId}/boards/${board.id}`}
                    variant="light"
                    color="green"
                    justify="space-between"
                    fullWidth
                  >
                    {board.title} ({board.width}x{board.height},{" "}
                    {statusLabels[board.status]})
                  </Button>
                  {board.slug ? (
                    <Text size="xs" c="dimmed" mt={4}>
                      Publik länk: {siteUrl}/b/{board.slug}
                    </Text>
                  ) : null}
                </div>
              ))
            ) : (
              <Text c="dimmed">Inga brickor ännu.</Text>
            )}
          </Stack>
        </Card>

        {isLeader ? (
          <>
            <Card radius="lg" p="lg" withBorder>
              <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
                <Title order={2}>Spelare ({members?.length ?? 0})</Title>
                <CreateMemberButton teamId={teamId} />
              </Group>
              <Stack mt="md">
                {members?.length ? (
                  members.map((m) => (
                    <MemberCard key={m.id} teamId={teamId} member={m} />
                  ))
                ) : (
                  <Text c="dimmed">Inga spelare ännu.</Text>
                )}
              </Stack>
            </Card>

            <Card radius="lg" p="lg" withBorder>
              <Title order={2}>Inbjudningar (ledare)</Title>
              <Text size="sm" c="dimmed" mb="md">
                Bjud in andra ledare som ska kunna redigera det här laget och dess brickor.
              </Text>
              <form action={createInvite}>
                <input type="hidden" name="teamId" value={teamId} />
                <Button type="submit" color="green">
                  Skapa inbjudningskod
                </Button>
              </form>
              <Stack mt="md" gap="xs">
                {invites?.map((invite) => (
                  <Group key={invite.code} gap="xs">
                    <Code>{invite.code}</Code>
                    <Text size="xs" c="dimmed">
                      {siteUrl}/invite/{invite.code}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
