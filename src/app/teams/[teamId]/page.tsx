import {
  Badge,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import { createBoard, createInvite } from "@/app/actions";
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
      .select("code, created_at")
      .eq("team_id", teamId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(3),
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
          <Badge color={isLeader ? "green" : "blue"}>
            {member?.role ? roleLabels[member.role] : "medlem"}
          </Badge>
        </div>
      </Group>
      <div className="card-grid">
        <Card radius="lg" p="lg" withBorder>
          <Title order={2}>Brickor</Title>
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
              <Title order={2}>Ny bricka</Title>
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
                <Button type="submit" color="green" mt="md">
                  Skapa inbjudningskod
                </Button>
              </form>
              <Stack mt="md" gap="xs">
                {invites?.map((invite) => (
                  <Text key={invite.code} ff="monospace">
                    {invite.code} - {siteUrl}/invite/{invite.code}
                  </Text>
                ))}
              </Stack>
            </Card>
          </>
        ) : null}
      </div>
    </main>
  );
}
