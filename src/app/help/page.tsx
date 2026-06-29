import { Badge, Button, Card, Divider, Group, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { IconFilter, IconSearch } from "@tabler/icons-react";

function MiniMember({ initials, color }: { initials: string; color: string }) {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: color,
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 10,
        fontWeight: 800,
      }}
    >
      {initials}
    </div>
  );
}

function PlusBadge() {
  return (
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        border: "2px dashed var(--mantine-color-green-6)",
        color: "var(--mantine-color-green-7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 900,
      }}
    >
      +
    </div>
  );
}

function ExampleCard() {
  return (
    <Card radius="xl" p={0} withBorder bg="green.0" style={{ border: "2px solid var(--mantine-color-green-5)" }}>
      <Stack p="md" gap={6} style={{ minHeight: 132 }}>
        <Text fw={800} size="lg" lh={1.15}>Sammanhängande löpning</Text>
        <Text c="dimmed" fw={700}>30 min</Text>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--mantine-color-green-6)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 900,
            margin: "auto auto 0",
          }}
        >
          ✓
        </div>
      </Stack>
      <Group p="sm" gap={8} style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
        <MiniMember initials="OM" color="var(--mantine-color-blue-7)" />
        <MiniMember initials="SD" color="var(--mantine-color-orange-7)" />
        <PlusBadge />
      </Group>
    </Card>
  );
}

function SemiFilledBoardIllustration() {
  const completed = new Set([0, 2, 4, 5, 7, 10, 12, 14]);
  const memberColors = [
    "var(--mantine-color-blue-7)",
    "var(--mantine-color-orange-7)",
    "var(--mantine-color-red-7)",
  ];

  return (
    <Card radius="xl" p="lg" withBorder bg="green.0">
      <Stack gap="md">
        <Group justify="space-between">
          <div>
            <Text fw={900} size="xl">Sommar 2026</Text>
            <Text size="sm" c="dimmed">8 / 16 aktiviteter avklarade tillsammans</Text>
          </div>
          <Badge color="green" variant="filled">Lagbricka</Badge>
        </Group>
        <SimpleGrid cols={{ base: 4, xs: 4 }} spacing={8}>
          {Array.from({ length: 16 }).map((_, index) => {
            const isDone = completed.has(index);
            return (
              <div
                key={index}
                style={{
                  minHeight: 74,
                  borderRadius: 14,
                  border: isDone
                    ? "2px solid var(--mantine-color-green-5)"
                    : "1px solid var(--mantine-color-gray-3)",
                  background: isDone ? "var(--mantine-color-green-0)" : "white",
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: "75%",
                    height: 8,
                    borderRadius: 999,
                    background: isDone
                      ? "var(--mantine-color-green-6)"
                      : "var(--mantine-color-gray-3)",
                  }}
                />
                <Group gap={3}>
                  {isDone ? (
                    memberColors.slice(0, (index % 3) + 1).map((color, memberIndex) => (
                      <div
                        key={`${index}-${memberIndex}`}
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: color,
                        }}
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px dashed var(--mantine-color-green-5)",
                      }}
                    />
                  )}
                </Group>
              </div>
            );
          })}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

function CheckModalIllustration() {
  return (
    <Card radius="xl" withBorder p="md">
      <Stack gap="sm">
        <div
          style={{
            border: "1px solid var(--mantine-color-gray-3)",
            borderRadius: 10,
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <IconSearch size={16} color="var(--mantine-color-gray-6)" />
          <Text size="sm" c="dimmed">Skriv namn...</Text>
        </div>
        <Text size="sm" fw={800}>Lägg till kryss</Text>
        <Button color="green" variant="light" justify="flex-start" fullWidth>
          <Group justify="space-between" w="100%">
            <Group gap="xs"><MiniMember initials="OM" color="var(--mantine-color-blue-7)" /><Text size="sm">Olivia</Text></Group>
            <Badge color="green" variant="light">Senast vald</Badge>
          </Group>
        </Button>
        <Button color="green" variant="light" justify="flex-start" fullWidth>
          <Group gap="xs"><MiniMember initials="SD" color="var(--mantine-color-orange-7)" /><Text size="sm">Saga</Text></Group>
        </Button>
        <Divider />
        <Text size="sm" fw={800}>Ta bort kryss</Text>
        <Button color="red" variant="light" justify="flex-start" fullWidth>
          <Group gap="xs"><MiniMember initials="EI" color="var(--mantine-color-red-7)" /><Text size="sm">Elliot</Text></Group>
        </Button>
      </Stack>
    </Card>
  );
}

function FilterIllustration() {
  return (
    <Card radius="xl" withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Text fw={800}>Filtrera spelare</Text>
          <Button color="green" size="xs" radius="xl"><IconFilter size={16} /></Button>
        </Group>
        <Text size="sm">☑ Visa alla</Text>
        <Divider />
        <Text size="sm">☑ Olivia</Text>
        <Text size="sm">☐ Saga</Text>
        <Text size="sm">☑ Elliot</Text>
      </Stack>
    </Card>
  );
}

function SizeIllustration() {
  return (
    <Card radius="xl" withBorder p="md">
      <Stack gap="sm">
        <Group gap={4} grow>
          <Badge color="green" variant="filled">Liten</Badge>
          <Badge color="gray" variant="light">Mellan</Badge>
          <Badge color="gray" variant="light">Stor</Badge>
        </Group>
        <SimpleGrid cols={3} spacing={6}>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} style={{ height: 54, borderRadius: 10, border: "1px solid var(--mantine-color-green-4)", background: index % 2 ? "white" : "var(--mantine-color-green-0)" }} />
          ))}
        </SimpleGrid>
      </Stack>
    </Card>
  );
}

function HelpSection({ title, children, visual }: { title: string; children: React.ReactNode; visual: React.ReactNode }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" verticalSpacing="xl">
      <Stack gap="xs" justify="center">
        <Title order={2}>{title}</Title>
        <Text c="dimmed" lh={1.6}>{children}</Text>
      </Stack>
      {visual}
    </SimpleGrid>
  );
}

export default function HelpPage() {
  return (
    <main className="page-shell">
      <Stack gap="xl" maw={980} mx="auto">
        <Stack gap="xs">
          <Badge color="green" variant="light" w="fit-content">Hjälp</Badge>
          <Title>Så fungerar bingobrickan</Title>
          <Text c="dimmed" size="lg">
            Målet är att laget ska fylla brickan tillsammans. Varje aktivitet kan
            kryssas av flera gånger av olika spelare, och du kan filtrera vyn om
            du vill följa en enskild spelare.
          </Text>
        </Stack>

        <SemiFilledBoardIllustration />

        <HelpSection title="Kortens delar" visual={<ExampleCard />}>
          Varje kort visar aktivitetens namn och eventuell mängd. Grön bakgrund
          betyder att aktiviteten är avklarad i den vy du tittar på.
          Spelarikonerna visar vilka spelare som har kryssat av aktiviteten, så
          samma kort kan ha flera kryss. Tryck på plusknappen för att lägga till
          eller ta bort kryss.
        </HelpSection>

        <HelpSection title="Kryssa av eller ta bort" visual={<CheckModalIllustration />}>
          Tryck på plusknappen på ett kort. Sök fram spelaren och välj namnet under Lägg till kryss. Om ett kryss blev fel kan du ta bort det under Ta bort kryss. Den senaste valda spelaren markeras så att den är lätt att hitta igen.
        </HelpSection>

        <HelpSection title="Filtrera spelare" visual={<FilterIllustration />}>
          Filterknappen används för att visa en eller flera spelare. Visa alla
          ger lagets gemensamma bild av brickan. När filtret är aktivt markeras
          bara kort som avklarade om någon av de valda spelarna har kryssat av
          aktiviteten. Filterknappen blir grön när du inte visar hela laget.
        </HelpSection>

        <HelpSection title="Kortstorlek på mobil" visual={<SizeIllustration />}>
          Om brädan inte får plats på skärmen visas valen Liten, Mellan och Stor. Välj Liten för bäst överblick, Mellan för mer läsbarhet eller Stor när du vill se större kort.
        </HelpSection>

        <Card radius="xl" p="lg" withBorder bg="gray.0">
          <Stack gap="xs">
            <Title order={2}>Visa detaljer</Title>
            <Text c="dimmed">
              Tryck var som helst på ett kort för att öppna aktivitetens fullständiga beskrivning. Det påverkar inte kryssen.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </main>
  );
}
