import {
  Badge,
  Button,
  Card,
  Group,
  Progress,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { SetupRequired } from "@/app/setup-required";
import { BingoGrid } from "@/components/bingo-grid";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const statusLabels = {
  draft: "utkast",
  active: "aktiv",
} as const;

type Cell = {
  id: string;
  position: number;
  tasks:
    | { title: string; description: string | null }
    | { title: string; description: string | null }[]
    | null;
  cell_checks: { member_id: string }[];
};

export default async function BoardPage({
  params,
}: {
  params: Promise<{ teamId: string; boardId: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await ensureProfile();
  if (!user) return null;
  const { teamId, boardId } = await params;
  const supabase = await createClient();
  const [{ data: board }, { data: cells }, { data: member }] =
    await Promise.all([
      supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .eq("team_id", teamId)
        .single(),
      supabase
        .from("board_cells")
        .select(
          "id, position, tasks(title, description), cell_checks(member_id)",
        )
        .eq("board_id", boardId)
        .order("position"),
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (!board)
    return (
      <main className="page-shell">
        <Text>Bingobrickan hittades inte.</Text>
      </main>
    );

  // Fetch linked members for the current user in this team
  const { data: myLinks } = await supabase
    .from("member_accounts")
    .select("member_id")
    .eq("user_id", user.id);

  let linkedMembers: { id: string; display_name: string }[] = [];
  if (myLinks && myLinks.length > 0) {
    const { data: teamMembers } = await supabase
      .from("members")
      .select("id, display_name")
      .eq("team_id", teamId)
      .in("id", myLinks.map((l) => l.member_id));
    linkedMembers = teamMembers ?? [];
  }

  const typedCells = (cells ?? []) as Cell[];
  const totalCells = board.width * board.height;

  // Count total checks across all members
  const totalCheckedCells = typedCells.filter(
    (cell) => cell.cell_checks.length > 0,
  ).length;

  const isLeader = member?.role === "leader";

  // Transform cells for the client component
  const gridCells = typedCells.map((cell) => {
    const task = Array.isArray(cell.tasks) ? cell.tasks[0] : cell.tasks;
    return {
      id: cell.id,
      position: cell.position,
      task,
      checks: cell.cell_checks,
    };
  });

  return (
    <main className="page-shell">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Text
              component="a"
              href={`/teams/${teamId}`}
              c="dimmed"
              size="sm"
            >
              Tillbaka till lag
            </Text>
            <Title>{board.title}</Title>
            <Text c="dimmed">{board.description}</Text>
          </div>
          {isLeader ? (
            <Button
              component="a"
              href={`/teams/${teamId}/boards/${boardId}/edit`}
              color="green"
              variant="light"
            >
              Redigera
            </Button>
          ) : null}
        </Group>
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between" mb="sm">
            <Badge color={board.status === "active" ? "green" : "gray"}>
              {statusLabels[board.status]}
            </Badge>
            <Text fw={700}>
              {totalCheckedCells} / {totalCells} rutor ikryssade
            </Text>
          </Group>
          <Progress
            value={totalCells ? (totalCheckedCells / totalCells) * 100 : 0}
            color="green"
            size="lg"
            radius="xl"
          />
        </Card>
        {board.status !== "active" ? (
          <Card radius="lg" p="lg" withBorder>
            <Text>
              Den här bingobrickan är fortfarande ett utkast. En ledare måste
              generera den innan spelare kan kryssa i rutor.
            </Text>
          </Card>
        ) : (
          <BingoGrid
            teamId={teamId}
            boardId={boardId}
            boardWidth={board.width}
            cells={gridCells}
            linkedMembers={linkedMembers}
          />
        )}
      </Stack>
    </main>
  );
}
