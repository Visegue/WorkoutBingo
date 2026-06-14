import { Button, Card, Stack, Text, Title } from "@mantine/core";
import { joinInvite } from "@/app/actions";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <main className="page-shell">
      <Card
        maw={480}
        mx="auto"
        mt={60}
        radius="xl"
        p="xl"
        shadow="md"
        withBorder
      >
        <Stack>
          <Title>Gå med i lag</Title>
          <Text c="dimmed">
            Logga in först om det behövs och gå sedan med med inbjudningskoden {code}.
          </Text>
          <form action={joinInvite}>
            <input type="hidden" name="code" value={code} />
            <Button type="submit" color="green" fullWidth>
              Gå med i lag
            </Button>
          </form>
        </Stack>
      </Card>
    </main>
  );
}
