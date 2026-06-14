import {
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { redirect } from "next/navigation";
import {
  createMember,
  deleteMember,
  linkAccountToMember,
  renameMember,
  unlinkAccount,
} from "@/app/actions";
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

  const [{ data: team }, { data: members }] =
    await Promise.all([
      supabase.from("teams").select("name").eq("id", teamId).single(),
      supabase
        .from("members")
        .select("id, display_name")
        .eq("team_id", teamId)
        .order("display_name"),
    ]);

  // Fetch accounts for all members in this team
  const memberIds = members?.map((m) => m.id) ?? [];
  const { data: memberAccounts } = memberIds.length
    ? await supabase
        .from("member_accounts")
        .select("member_id, user_id")
        .in("member_id", memberIds)
    : { data: [] };

  // Fetch profiles for linked users
  const linkedUserIds = [...new Set(memberAccounts?.map((a) => a.user_id) ?? [])];
  const { data: profiles } = linkedUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", linkedUserIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p.display_name]) ?? []);

  // Group accounts by member
  const accountsByMember = new Map<
    string,
    { user_id: string; display_name: string | null }[]
  >();
  for (const account of memberAccounts ?? []) {
    const list = accountsByMember.get(account.member_id) ?? [];
    list.push({
      user_id: account.user_id,
      display_name: profileMap.get(account.user_id) ?? null,
    });
    accountsByMember.set(account.member_id, list);
  }

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

        {members?.map((member) => {
          const linkedAccounts = accountsByMember.get(member.id) ?? [];
          return (
            <Card key={member.id} radius="lg" p="lg" withBorder>
              <Group justify="space-between" mb="sm">
                <Title order={3}>{member.display_name}</Title>
                <form action={deleteMember}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    size="xs"
                    color="red"
                    variant="subtle"
                  >
                    Ta bort
                  </Button>
                </form>
              </Group>

              {/* Rename form */}
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

              <Divider my="sm" />

              {/* Linked accounts */}
              <Text size="sm" fw={600} mb="xs">
                Kopplade konton ({linkedAccounts.length})
              </Text>
              {linkedAccounts.length > 0 ? (
                <Stack gap="xs">
                  {linkedAccounts.map((account) => (
                    <Group key={account.user_id} justify="space-between">
                      <Text size="sm">
                        {account.display_name ?? account.user_id}
                      </Text>
                      <form action={unlinkAccount}>
                        <input type="hidden" name="teamId" value={teamId} />
                        <input
                          type="hidden"
                          name="memberId"
                          value={member.id}
                        />
                        <input
                          type="hidden"
                          name="userId"
                          value={account.user_id}
                        />
                        <Button
                          type="submit"
                          size="xs"
                          color="red"
                          variant="subtle"
                        >
                          Koppla bort
                        </Button>
                      </form>
                    </Group>
                  ))}
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  Inga kopplade konton
                </Text>
              )}

              {/* Link self button */}
              <form action={linkAccountToMember}>
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="memberId" value={member.id} />
                <Button
                  type="submit"
                  size="xs"
                  variant="light"
                  color="blue"
                  mt="sm"
                >
                  Koppla mitt konto
                </Button>
              </form>
            </Card>
          );
        })}

        {!members?.length ? (
          <Text c="dimmed">Inga spelare har skapats ännu.</Text>
        ) : null}
      </Stack>
    </main>
  );
}
