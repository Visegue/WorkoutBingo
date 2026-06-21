import {
  Badge,
  Card,
  Group,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { SetupRequired } from "@/app/setup-required";
import { PublicBingoGrid } from "@/components/public-bingo-grid";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type Cell = {
  id: string;
  position: number;
  tasks:
    | { title: string; description: string | null }
    | { title: string; description: string | null }[]
    | null;
  cell_checks: { member_id: string }[];
};

function isPastEndDate(endDate: string | null) {
  if (!endDate) return false;
  return endDate <= new Date().toISOString().slice(0, 10);
}

export default async function PublicBoardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const { slug } = await params;
  const supabase = await createClient();

  const { data: board } = await supabase
    .from("boards")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!board) {
    return (
      <main className="page-shell">
        <Card maw={480} mx="auto" mt={60} radius="xl" p="xl" shadow="md" withBorder>
          <Stack>
            <Title>Bingobricka hittades inte</Title>
            <Text c="dimmed">
              Kontrollera länken eller kontakta lagets ledare.
            </Text>
          </Stack>
        </Card>
      </main>
    );
  }

  const [{ data: cells }, { data: members }] = await Promise.all([
    supabase
      .from("board_cells")
      .select(
        "id, position, tasks(title, description), cell_checks(member_id)",
      )
      .eq("board_id", board.id)
      .order("position"),
    supabase
      .from("members")
      .select("id, display_name, color")
      .eq("team_id", board.team_id)
      .order("display_name"),
  ]);

  const typedCells = (cells ?? []) as unknown as Cell[];
  const totalCells = board.width * board.height;

  const gridCells = typedCells.map((cell) => {
    const task = Array.isArray(cell.tasks) ? cell.tasks[0] : cell.tasks;
    return {
      id: cell.id,
      position: cell.position,
      task,
      checks: cell.cell_checks,
    };
  });

  const allMembers = (members ?? []).map((m) => ({
    id: m.id,
    display_name: m.display_name,
    color: m.color,
  }));

  const completedCells = gridCells.filter((c) => c.checks.length > 0).length;
  const progressPercent = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0;
  const isFinished = isPastEndDate(board.end_date);
  const isComplete = totalCells > 0 && completedCells === totalCells;

  return (
    <main className="page-shell">
      <Stack gap="lg">
        <div>
          <Title>{board.title}</Title>
          {board.description ? <Text c="dimmed">{board.description}</Text> : null}
        </div>
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between" mb="sm">
            <Badge color={isFinished ? "gray" : "green"}>
              {isFinished ? "avslutad" : "aktiv"}
            </Badge>
            <Text fw={700}>
              {completedCells} / {totalCells} rutor klara
            </Text>
          </Group>
          {isFinished ? (
            <Text fw={700} mb="sm">
              Resultat: {completedCells} av {totalCells} aktiviteter ikryssade
            </Text>
          ) : null}
          {board.end_date ? (
            <Text size="sm" c="dimmed" mb="sm">
              Slutdatum: {board.end_date}
            </Text>
          ) : null}
          <Progress
            value={progressPercent}
            color={isComplete ? "green" : "gray"}
            size="lg"
            radius="xl"
          />
        </Card>
        <PublicBingoGrid
          slug={slug}
          boardWidth={board.width}
          cells={gridCells}
          members={allMembers}
          readOnly={isFinished}
        />
      </Stack>
    </main>
  );
}
