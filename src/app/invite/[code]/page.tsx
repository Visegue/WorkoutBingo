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
  const { data: teamId, error } = await supabase.rpc("accept_team_invite", {
    invite_code: code.toUpperCase(),
  });

  if (!error && teamId) {
    redirect(`/teams/${teamId}`);
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
