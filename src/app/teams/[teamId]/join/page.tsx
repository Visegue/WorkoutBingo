import {
  Button,
  Card,
  Divider,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { redirect } from "next/navigation";
import { associateMember, createAndAssociateMember } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function JoinMemberPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await ensureProfile();
  if (!user) return null;
  const { teamId } = await params;
  const supabase = await createClient();

  // Verify user is a team member
  const { data: membership } = await supabase
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  // If leader, skip member selection
  if (membership.role === "leader") redirect(`/teams/${teamId}`);

  // Check if user already has a member association for this team
  const { data: myLinks } = await supabase
    .from("member_accounts")
    .select("member_id")
    .eq("user_id", user.id);

  if (myLinks && myLinks.length > 0) {
    const { data: linkedMembers } = await supabase
      .from("members")
      .select("id")
      .eq("team_id", teamId)
      .in("id", myLinks.map((l) => l.member_id));

    if (linkedMembers && linkedMembers.length > 0) {
      redirect(`/teams/${teamId}`);
    }
  }

  // Fetch existing members for this team
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", teamId)
    .single();

  const { data: members } = await supabase
    .from("members")
    .select("id, display_name")
    .eq("team_id", teamId)
    .order("display_name");

  return (
    <main className="page-shell">
      <Card maw={520} mx="auto" mt={60} radius="xl" p="xl" shadow="md" withBorder>
        <Stack>
          <Title order={2}>Välj din spelare</Title>
          <Text c="dimmed">
            Du har gått med i {team?.name ?? "laget"}. Välj vilken spelare du
            vill koppla ditt konto till, eller skapa en ny.
          </Text>

          {members && members.length > 0 ? (
            <>
              <Title order={4}>Befintliga spelare</Title>
              {members.map((member) => (
                <form key={member.id} action={associateMember}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="light"
                    color="green"
                    fullWidth
                  >
                    {member.display_name}
                  </Button>
                </form>
              ))}
              <Divider label="eller" labelPosition="center" />
            </>
          ) : null}

          <Title order={4}>Skapa ny spelare</Title>
          <form action={createAndAssociateMember}>
            <input type="hidden" name="teamId" value={teamId} />
            <Stack>
              <TextInput
                name="displayName"
                label="Namn"
                required
                placeholder="Ditt namn"
              />
              <Button type="submit" color="green">
                Skapa och koppla
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </main>
  );
}
