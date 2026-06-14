import { Alert, Card, Stack, Text, Title } from "@mantine/core";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/domain";
import { createClient } from "@/lib/supabase/server";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const invitePath = `/invite/${encodeURIComponent(code)}`;
  const user = await ensureProfile();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(invitePath)}`);
  }

  const supabase = await createClient();
  const { data: invite, error } = await supabase
    .from("team_invites")
    .select("team_id")
    .eq("code", code.toUpperCase())
    .is("revoked_at", null)
    .maybeSingle();

  if (!error && invite) {
    // Invite found — make user a leader of the team
    await supabase
      .from("team_members")
      .upsert({ team_id: invite.team_id, user_id: user.id, role: "leader" });
    redirect(`/teams/${invite.team_id}`);
  }

  return (
    <main className="page-shell">
      <Card maw={480} mx="auto" mt={60} radius="xl" p="xl" shadow="md" withBorder>
        <Stack>
          <Title>Inbjudan hittades inte</Title>
          <Alert color="red">
            Inbjudningskoden är ogiltig eller har tagits bort.
          </Alert>
          <Text c="dimmed">Kontakta lagets ledare för en ny inbjudan.</Text>
        </Stack>
      </Card>
    </main>
  );
}
