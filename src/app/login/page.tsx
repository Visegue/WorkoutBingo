import {
  Alert,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { signInWithEmail, signInWithGoogle } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { hasSupabaseEnv } from "@/lib/env";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const params = await searchParams;

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
          <Title>Logga in</Title>
          <Text c="dimmed">
            Använd Google eller en magisk e-postlänk. Inget lösenord krävs.
          </Text>
          {params.sent ? (
            <Alert color="green">Kontrollera din e-post för en inloggningslänk.</Alert>
          ) : null}
          <form action={signInWithGoogle}>
            <Button type="submit" fullWidth color="green" variant="filled">
              Fortsätt med Google
            </Button>
          </form>
          <Divider label="eller" />
          <form action={signInWithEmail}>
            <Stack gap="sm">
              <TextInput
                name="email"
                label="E-post"
                type="email"
                required
                placeholder="name@example.com"
              />
              <Button type="submit" fullWidth variant="light" color="green">
                Skicka magisk länk
              </Button>
            </Stack>
          </form>
          <Group justify="center">
            <Text size="sm" c="dimmed">
              Inbjudningslänkar fungerar efter inloggning.
            </Text>
          </Group>
        </Stack>
      </Card>
    </main>
  );
}
