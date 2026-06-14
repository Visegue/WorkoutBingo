import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { getUser } from "@/lib/domain";

export default async function Home() {
  const user = await getUser();

  return (
    <main className="page-shell">
      <Stack gap="xl" py={56}>
        <Card radius="xl" p="xl" shadow="md" withBorder bg="lime.0">
          <Stack gap="lg">
            <Text fw={700} c="green.8" tt="uppercase" size="sm">
              Sommarutmaning för fotbollslag
            </Text>
            <Title order={1} size="3.6rem" lh={1} maw={780}>
              En gemensam träningsbingo för hela laget.
            </Title>
            <Text size="xl" c="dimmed" maw={720}>
              Ledare skapar slumpade bingobrickor. Spelare loggar in, går med
              via inbjudan och kryssar av träningar tillsammans under lovet.
            </Text>
            <Group>
              <Button
                component="a"
                href={user ? "/dashboard" : "/login"}
                size="lg"
                color="green"
              >
                {user ? "Öppna översikt" : "Logga in"}
              </Button>
              <Button
                component="a"
                href="#features"
                size="lg"
                variant="subtle"
                color="green"
              >
                Se funktioner
              </Button>
            </Group>
          </Stack>
        </Card>
        <div id="features" className="card-grid">
          {[
            {
              title: "Anpassningsbara brickor",
              description:
                "Välj bredd, höjd, träningar och hur ofta varje träning ska visas.",
            },
            {
              title: "Stabil slumpning",
              description:
                "Genererade rutor sparas så att alla enheter visar samma bingobricka.",
            },
            {
              title: "Lagets framsteg",
              description:
                "Spelare kan kryssa i och ta bort sina egna rutor medan alla ser lagets framsteg.",
            },
          ].map((feature) => (
            <Card key={feature.title} radius="lg" p="lg" withBorder>
              <Title order={3}>{feature.title}</Title>
              <Text c="dimmed" mt="xs">
                {feature.description}
              </Text>
            </Card>
          ))}
        </div>
      </Stack>
    </main>
  );
}
