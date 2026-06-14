import {
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { redirect } from "next/navigation";
import { createMember, deleteMember, renameMember } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await ensureProfile();
  if (!user) return null;
  const { teamId } = await params;
  const supabase = await createClient();

  // Verify leader access
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .eq("role", "leader")
    .maybeSingle();

  if (!membership) redirect(`/teams/${teamId}`);

  const [{ data: team }, { data: members }] = await Promise.all([
    supabase.from("teams").select("name").eq("id", teamId).single(),
    supabase
      .from("members")
      .select("id, display_name")
      .eq("team_id", teamId)
      .order("display_name"),
  ]);

  return (
    <main className="page-shell">
      <Stack gap="lg">
        <div>
          <Text
            component="a"
            href={`/teams/${teamId}`}
            c="dimmed"
            size="sm"
          >
            Tillbaka till lag
          </Text>
          <Title>Hantera spelare - {team?.name}</Title>
          <Text c="dimmed" size="sm">
            Spelare som läggs till här kan kryssas av på bingobrickor.
          </Text>
        </div>

        <Card radius="lg" p="lg" withBorder>
          <Title order={2}>Lägg till spelare</Title>
          <form action={createMember}>
            <input type="hidden" name="teamId" value={teamId} />
            <Stack mt="md">
              <TextInput
                name="displayName"
                label="Namn"
                required
                placeholder="Spelarnamn (unikt inom laget)"
              />
              <Button type="submit" color="green">
                Lägg till
              </Button>
            </Stack>
          </form>
        </Card>

        {members?.map((member) => (
          <Card key={member.id} radius="lg" p="lg" withBorder>
            <Group justify="space-between" mb="sm">
              <Title order={3}>{member.display_name}</Title>
              <form action={deleteMember}>
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="memberId" value={member.id} />
                <Button type="submit" size="xs" color="red" variant="subtle">
                  Ta bort
                </Button>
              </form>
            </Group>

            <form action={renameMember}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="memberId" value={member.id} />
              <Group>
                <TextInput
                  name="displayName"
                  placeholder="Nytt namn"
                  size="sm"
                  defaultValue={member.display_name}
                />
                <Button type="submit" size="sm" variant="light">
                  Byt namn
                </Button>
              </Group>
            </form>
          </Card>
        ))}

        {!members?.length ? (
          <Text c="dimmed">Inga spelare har skapats ännu.</Text>
        ) : null}
      </Stack>
    </main>
  );
}
