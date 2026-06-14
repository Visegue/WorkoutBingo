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
import { checkCell, uncheckCell } from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
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
  cell_checks: { user_id: string }[];
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
        .select("id, position, tasks(title, description), cell_checks(user_id)")
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
        <Text>Brickan hittades inte.</Text>
      </main>
    );
  const typedCells = (cells ?? []) as Cell[];
  const checkedCells = typedCells.filter(
    (cell) => cell.cell_checks.length > 0,
  ).length;
  const totalCells = board.width * board.height;
  const isLeader = member?.role === "leader";

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
              {checkedCells} / {totalCells} rutor ikryssade
            </Text>
          </Group>
          <Progress
            value={totalCells ? (checkedCells / totalCells) * 100 : 0}
            color="green"
            size="lg"
            radius="xl"
          />
        </Card>
        {board.status !== "active" ? (
          <Card radius="lg" p="lg" withBorder>
            <Text>
              Den här brickan är fortfarande ett utkast. En ledare måste
              generera den innan spelare kan kryssa i rutor.
            </Text>
          </Card>
        ) : (
          <div
            className="bingo-grid"
            style={{ "--bingo-width": board.width } as React.CSSProperties}
          >
            {typedCells.map((cell) => {
              const task = Array.isArray(cell.tasks) ? cell.tasks[0] : cell.tasks;
              const checkedByMe = cell.cell_checks.some(
                (check) => check.user_id === user.id,
              );
              return (
                <Card
                  key={cell.id}
                  radius="lg"
                  p="sm"
                  withBorder
                  bg={checkedByMe ? "green.0" : "white"}
                >
                  <Stack gap="xs" justify="space-between" h="100%">
                    <div>
                      <Text fw={800} size="sm">
                        {task?.title}
                      </Text>
                      {task?.description ? (
                        <Text size="xs" c="dimmed">
                          {task.description}
                        </Text>
                      ) : null}
                    </div>
                    <Text size="xs" c="dimmed">
                      {cell.cell_checks.length} kryss
                    </Text>
                    <form action={checkedByMe ? uncheckCell : checkCell}>
                      <input type="hidden" name="teamId" value={teamId} />
                      <input type="hidden" name="boardId" value={boardId} />
                      <input type="hidden" name="cellId" value={cell.id} />
                      <Button
                        type="submit"
                        size="xs"
                        fullWidth
                        color={checkedByMe ? "red" : "green"}
                        variant={checkedByMe ? "light" : "filled"}
                      >
                        {checkedByMe ? "Ta bort mig" : "Jag gjorde detta"}
                      </Button>
                    </form>
                  </Stack>
                </Card>
              );
            })}
          </div>
        )}
      </Stack>
    </main>
  );
}
