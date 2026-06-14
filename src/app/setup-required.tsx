import { Alert, Card, Code, Stack, Text, Title } from "@mantine/core";

export function SetupRequired() {
  return (
    <main className="page-shell">
      <Card maw={640} mx="auto" mt={60} radius="xl" p="xl" shadow="md" withBorder>
        <Stack>
          <Alert color="yellow" title="Supabase-miljö saknas">
            Skapa <Code>.env.local</Code> från <Code>.env.example</Code>, fyll i
            Supabase-värden och starta om utvecklingsservern.
          </Alert>
          <Title order={2}>Obligatoriska variabler</Title>
          <Text>
            <Code>NEXT_PUBLIC_SUPABASE_URL</Code>
          </Text>
          <Text>
            <Code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</Code>
          </Text>
          <Text>
            <Code>NEXT_PUBLIC_SITE_URL</Code> är som standard
            <Code ml={6}>http://localhost:3000</Code>
          </Text>
          <Text c="dimmed">Se projektets README för Supabase-installation.</Text>
        </Stack>
      </Card>
    </main>
  );
}
