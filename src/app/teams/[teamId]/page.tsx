import {
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  createBoard,
  createInvite,
  createMember,
  linkAccountToMember,
} from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const roleLabels = {
  leader: "ledare",
  kid: "spelare",
} as const;

const statusLabels = {
  draft: "utkast",
  active: "aktiv",
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
  const [
    { data: team },
    { data: member },
    { data: boards },
    { data: invites },
    { data: members },
    { data: myMemberLinks },
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
      .select("id, title, status, width, height, created_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false }),
    supabase
      .from("team_invites")
      .select("code, role, created_at")
      .eq("team_id", teamId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("members")
      .select("id, display_name")
      .eq("team_id", teamId)
      .order("display_name"),
    supabase
      .from("member_accounts")
      .select("member_id")
      .eq("user_id", user.id),
  ]);

  const isLeader = member?.role === "leader";

  // Check which members the current leader is linked to
  const linkedMemberIds = new Set<string>();
  if (myMemberLinks && myMemberLinks.length > 0 && members) {
    const teamMemberIds = new Set(members.map((m) => m.id));
    for (const link of myMemberLinks) {
      if (teamMemberIds.has(link.member_id)) {
        linkedMemberIds.add(link.member_id);
      }
    }
  }

  return (
    <main className="page-shell">
      <Group justify="space-between" mb="xl">
        <div>
          <Text component="a" href="/dashboard" c="dimmed" size="sm">
            Tillbaka till översikt
          </Text>
          <Title>{team?.name ?? "Lag"}</Title>
          <Badge color={isLeader ? "green" : "blue"}>
            {member?.role ? roleLabels[member.role] : "medlem"}
          </Badge>
        </div>
      </Group>
      <div className="card-grid">
        <Card radius="lg" p="lg" withBorder>
          <Title order={2}>Bingobrickor</Title>
          <Stack mt="md">
            {boards?.length ? (
              boards.map((board) => (
                <Button
                  key={board.id}
                  component="a"
                  href={`/teams/${teamId}/boards/${board.id}`}
                  variant="light"
                  color="green"
                  justify="space-between"
                >
                  {board.title} ({board.width}x{board.height},{" "}
                  {statusLabels[board.status]})
                </Button>
              ))
            ) : (
              <Text c="dimmed">Inga brickor ännu.</Text>
            )}
          </Stack>
        </Card>

        {isLeader ? (
          <>
            <Card radius="lg" p="lg" withBorder>
              <Title order={2}>Spelare</Title>
              <Stack mt="md">
                {members?.length ? (
                  members.map((m) => (
                    <Group key={m.id} justify="space-between">
                      <Text>{m.display_name}</Text>
                      {!linkedMemberIds.has(m.id) ? (
                        <form action={linkAccountToMember}>
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="memberId" value={m.id} />
                          <Button
                            type="submit"
                            size="xs"
                            variant="subtle"
                            color="blue"
                          >
                            Koppla mig
                          </Button>
                        </form>
                      ) : (
                        <Badge size="sm" color="blue" variant="light">
                          Kopplad
                        </Badge>
                      )}
                    </Group>
                  ))
                ) : (
                  <Text c="dimmed">Inga spelare ännu.</Text>
                )}
              </Stack>

              <form action={createMember}>
                <input type="hidden" name="teamId" value={teamId} />
                <Stack mt="md">
                  <TextInput
                    name="displayName"
                    label="Ny spelare"
                    required
                    placeholder="Namn"
                  />
                  <Button type="submit" color="green" variant="light">
                    Lägg till spelare
                  </Button>
                </Stack>
              </form>

              <Button
                component="a"
                href={`/teams/${teamId}/members`}
                variant="subtle"
                color="gray"
                mt="md"
                fullWidth
              >
                Hantera spelare och konton
              </Button>
            </Card>

            <Card radius="lg" p="lg" withBorder>
              <Title order={2}>Ny bingobricka</Title>
              <form action={createBoard}>
                <input type="hidden" name="teamId" value={teamId} />
                <Stack mt="md">
                  <TextInput
                    name="title"
                    label="Titel"
                    required
                    placeholder="Sommaren 2026"
                  />
                  <Group grow>
                    <TextInput
                      name="width"
                      label="Bredd"
                      type="number"
                      min={2}
                      max={10}
                      defaultValue={5}
                      required
                    />
                    <TextInput
                      name="height"
                      label="Höjd"
                      type="number"
                      min={2}
                      max={10}
                      defaultValue={5}
                      required
                    />
                  </Group>
                  <Textarea
                    name="description"
                    label="Beskrivning"
                    placeholder="Vad ska spelarna göra i sommar?"
                  />
                  <Button type="submit" color="green">
                    Skapa utkast
                  </Button>
                </Stack>
              </form>
            </Card>

            <Card radius="lg" p="lg" withBorder>
              <Title order={2}>Inbjudningar</Title>
              <form action={createInvite}>
                <input type="hidden" name="teamId" value={teamId} />
                <Stack mt="md">
                  <Select
                    name="role"
                    label="Roll"
                    data={[
                      { value: "kid", label: "Spelare" },
                      { value: "leader", label: "Ledare" },
                    ]}
                    defaultValue="kid"
                  />
                  <Button type="submit" color="green">
                    Skapa inbjudningskod
                  </Button>
                </Stack>
              </form>
              <Stack mt="md" gap="xs">
                {invites?.map((invite) => (
                  <Group key={invite.code} gap="xs">
                    <Text ff="monospace" size="sm">
                      {invite.code}
                    </Text>
                    <Badge
                      size="xs"
                      color={invite.role === "leader" ? "orange" : "blue"}
                    >
                      {invite.role === "leader" ? "ledare" : "spelare"}
                    </Badge>
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
