import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Stack,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { createInvite, revokeInvite } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
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

function isPastEndDate(endDate: string | null) {
  if (!endDate) return false;
  return endDate <= new Date().toISOString().slice(0, 10);
}

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
  const [
    { data: team },
    { data: member },
    { data: boards },
    { data: invites },
    { data: members },
    { data: leaders },
  ] = await Promise.all([
    supabase.from("teams").select("id, name").eq("id", teamId).single(),
    supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("boards")
      .select("id, title, status, slug, width, height, end_date, created_at")
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
    supabase
      .from("team_members")
      .select("user_id, created_at")
      .eq("team_id", teamId)
      .eq("role", "leader")
      .order("created_at"),
  ]);

  const leaderIds = leaders?.map((leader) => leader.user_id) ?? [];
  const { data: leaderProfiles } = leaderIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", leaderIds)
    : { data: [] };
  const leaderProfileById = new Map(
    leaderProfiles?.map((profile) => [profile.id, profile]) ?? [],
  );

  const isLeader = member?.role === "leader";

  return (
    <main className="page-shell">
      <Group justify="space-between" mb="xl">
        <div>
          <AdminBreadcrumbs
            items={[
              { label: "Översikt", href: "/dashboard" },
              { label: team?.name ?? "Lag" },
            ]}
          />
          <Title>{team?.name ?? "Lag"}</Title>
          {member ? (
            <Badge color={isLeader ? "green" : "gray"}>
              {roleLabels[member.role]}
            </Badge>
          ) : null}
        </div>
      </Group>
      <Tabs defaultValue="boards" color="green" variant="pills">
        <TabsList mb="md" className="scroll-tabs">
          <TabsTab value="boards">Brickor</TabsTab>
          {isLeader ? <TabsTab value="members">Spelare</TabsTab> : null}
          {isLeader ? <TabsTab value="leaders">Ledare</TabsTab> : null}
        </TabsList>

        <TabsPanel value="boards">
          <Card radius="lg" p="lg" withBorder>
            <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
              <Title order={2}>Bingobrickor</Title>
              {isLeader ? <CreateBoardButton teamId={teamId} /> : null}
            </Group>
            <Stack mt="md">
              {boards?.length ? (
                boards.map((board) => {
                  const isFinished =
                    board.status === "active" && isPastEndDate(board.end_date);
                  return (
                    <div key={board.id}>
                      <Button
                        component="a"
                        href={`/teams/${teamId}/boards/${board.id}`}
                        variant="light"
                        color={isFinished ? "gray" : "green"}
                        justify="space-between"
                        fullWidth
                      >
                        {board.title} ({board.width}x{board.height},{" "}
                        {isFinished ? "avslutad" : statusLabels[board.status]})
                      </Button>
                    </div>
                  );
                })
              ) : (
                <Text c="dimmed">Inga brickor ännu.</Text>
              )}
            </Stack>
          </Card>
        </TabsPanel>

        {isLeader ? (
          <TabsPanel value="members">
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
          </TabsPanel>
        ) : null}

        {isLeader ? (
          <TabsPanel value="leaders">
            <Stack>
              <Card radius="lg" p="lg" withBorder>
                <Title order={2}>Ledare</Title>
                <Stack mt="md" gap="xs">
                  {leaders?.length ? (
                    leaders.map((leader) => {
                      const profile = leaderProfileById.get(leader.user_id);
                      return (
                        <Group key={leader.user_id} gap="xs" wrap="nowrap">
                          <Badge color="green" variant="light">
                            ledare
                          </Badge>
                          <Text fw={600} size="sm">
                            {profile?.display_name ?? "Namnlös ledare"}
                          </Text>
                        </Group>
                      );
                    })
                  ) : (
                    <Text c="dimmed">Inga ledare registrerade.</Text>
                  )}
                </Stack>
              </Card>

              <Card radius="lg" p="lg" withBorder>
                <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
                  <div>
                    <Title order={2}>Ledarinbjudningar</Title>
                    <Text size="sm" c="dimmed" mt={4}>
                      Bjud in andra ledare som ska kunna redigera laget och brickorna.
                    </Text>
                  </div>
                  <form action={createInvite}>
                    <input type="hidden" name="teamId" value={teamId} />
                    <ActionIcon
                      type="submit"
                      variant="filled"
                      color="green"
                      size="xl"
                      radius="md"
                      aria-label="Skapa ledarinbjudan"
                    >
                      <IconPlus size={22} stroke={2.5} />
                    </ActionIcon>
                  </form>
                </Group>
                <Stack mt="md" gap="xs">
                  {invites?.length ? (
                    invites.map((invite) => (
                      <Group key={invite.code} gap="xs" wrap="nowrap">
                        <Code>{invite.code}</Code>
                        <Text size="xs" c="dimmed" style={{ flex: 1, minWidth: 0 }}>
                          {siteUrl}/invite/{invite.code}
                        </Text>
                        <form action={revokeInvite}>
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="code" value={invite.code} />
                          <ActionIcon
                            type="submit"
                            variant="subtle"
                            color="red"
                            size="sm"
                            aria-label="Ta bort ledarinbjudan"
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </form>
                      </Group>
                    ))
                  ) : (
                    <Text c="dimmed">Inga aktiva ledarinbjudningar.</Text>
                  )}
                </Stack>
              </Card>
            </Stack>
          </TabsPanel>
        ) : null}
      </Tabs>
    </main>
  );
}
