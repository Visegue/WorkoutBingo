import { Alert, Card, Stack, Text, Title } from "@mantine/core";
import { redirect } from "next/navigation";
import { joinViaInviteLink } from "@/app/actions";
import { ensureProfile } from "@/lib/domain";

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

  const invite = await joinViaInviteLink(code);

  if (invite) {
    if (invite.role === "leader") {
      redirect(`/teams/${invite.team_id}`);
    } else {
      redirect(`/teams/${invite.team_id}/join`);
    }
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
