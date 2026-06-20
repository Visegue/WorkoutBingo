import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { joinInvite, signOut } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { CreateTeamButton } from "@/components/create-team-button";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await ensureProfile();
  if (!user) return null;
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const teamIds = memberships?.map((membership) => membership.team_id) ?? [];
  const { data: teams } = teamIds.length
    ? await supabase.from("teams").select("id, name").in("id", teamIds)
    : { data: [] };
  const teamById = new Map(teams?.map((team) => [team.id, team]));

  return (
    <main className="page-shell">
      <Group justify="space-between" mb="xl">
        <div>
          <Title>Översikt</Title>
          <Text c="dimmed">Inloggad som {user.email}</Text>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="subtle" color="red">
            Logga ut
          </Button>
        </form>
      </Group>
      <div className="card-grid">
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between" wrap="nowrap" style={{ width: "100%" }}>
            <Title order={2}>Dina lag</Title>
            <CreateTeamButton />
          </Group>
          <Stack mt="md">
            {memberships?.length ? (
              memberships.map((membership) => {
                const team = teamById.get(membership.team_id);
                return team ? (
                  <Button
                    key={team.id}
                    component="a"
                    href={`/teams/${team.id}`}
                    variant="light"
                    color="green"
                    justify="space-between"
                  >
                    {team.name}
                  </Button>
                ) : null;
              })
            ) : (
              <Text c="dimmed">Inga lag ännu.</Text>
            )}
          </Stack>
        </Card>
        <Card radius="lg" p="lg" withBorder>
          <Title order={2}>Gå med via ledarinbjudan</Title>
          <form action={joinInvite}>
            <Stack mt="md">
              <TextInput
                name="code"
                label="Ledarinbjudan"
                required
                placeholder="ABC123"
              />
              <Button type="submit" color="green" variant="light">
                Gå med som ledare
              </Button>
            </Stack>
          </form>
        </Card>
      </div>
    </main>
  );
}
