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
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { HelpIconLink } from "@/components/help-icon-link";
import { PublicBingoGrid } from "@/components/public-bingo-grid";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const statusLabels = {
  draft: "utkast",
  active: "aktiv",
} as const;

function isPastEndDate(endDate: string | null) {
  if (!endDate) return false;
  return endDate <= new Date().toISOString().slice(0, 10);
}

type Cell = {
  id: string;
  position: number;
  tasks:
    | { title: string; description: string | null; quantity: string | null }
    | { title: string; description: string | null; quantity: string | null }[]
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
  const [
    { data: board },
    { data: cells },
    { data: member },
    { data: members },
    { data: team },
  ] = await Promise.all([
      supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .eq("team_id", teamId)
        .single(),
      supabase
        .from("board_cells")
        .select(
          "id, position, tasks(title, description, quantity), cell_checks(member_id)",
        )
        .eq("board_id", boardId)
        .order("position"),
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("members")
        .select("id, display_name, color")
        .eq("team_id", teamId)
        .order("display_name"),
      supabase.from("teams").select("name").eq("id", teamId).single(),
    ]);

  if (!board)
    return (
      <main className="page-shell">
        <Text>Bingobrickan hittades inte.</Text>
      </main>
    );

  const typedCells = (cells ?? []) as unknown as Cell[];
  const totalCells = board.width * board.height;
  const totalCheckedCells = typedCells.filter(
    (cell) => cell.cell_checks.length > 0,
  ).length;
  const isLeader = member?.role === "leader";
  const isFinished = board.status === "active" && isPastEndDate(board.end_date);
  const isComplete = totalCells > 0 && totalCheckedCells === totalCells;

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
  const gridStateKey = gridCells
    .map((cell) => `${cell.id}:${cell.checks.map((check) => check.member_id).join(",")}`)
    .join("|");

  return (
    <main className="page-shell">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <AdminBreadcrumbs
              items={[
                { label: "Översikt", href: "/dashboard" },
                { label: team?.name ?? "Lag", href: `/teams/${teamId}` },
                { label: board.title },
              ]}
            />
            <Title>{board.title}</Title>
            <Text c="dimmed">{board.description}</Text>
          </div>
          <Group gap="xs" wrap="nowrap">
            <HelpIconLink />
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
        </Group>

        {board.slug ? (
          <Card radius="lg" p="sm" withBorder>
            <Group gap="xs">
              <Text size="sm" fw={600}>Publik länk:</Text>
              <Text
                component="a"
                href={`/b/${board.slug}`}
                size="sm"
                c="blue"
                td="underline"
              >
                {siteUrl}/b/{board.slug}
              </Text>
            </Group>
          </Card>
        ) : null}

        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between" mb="sm">
            <Badge color={isFinished ? "gray" : board.status === "active" ? "green" : "gray"}>
              {isFinished ? "avslutad" : statusLabels[board.status]}
            </Badge>
            <Text fw={700}>
              {totalCheckedCells} / {totalCells} rutor ikryssade
            </Text>
          </Group>
          {isFinished ? (
            <Text fw={700} mb="sm">
              Resultat: {totalCheckedCells} av {totalCells} aktiviteter ikryssade
            </Text>
          ) : null}
          {board.end_date ? (
            <Text size="sm" c="dimmed" mb="sm">
              Slutdatum: {board.end_date}
            </Text>
          ) : null}
          <Progress
            value={totalCells ? (totalCheckedCells / totalCells) * 100 : 0}
            color={isComplete ? "green" : "gray"}
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
        ) : board.slug ? (
          <PublicBingoGrid
            key={gridStateKey}
            slug={board.slug}
            boardWidth={board.width}
            cells={gridCells}
            members={allMembers}
            readOnly={isFinished}
          />
        ) : (
          <Card radius="lg" p="lg" withBorder>
            <Text>
              Bingobrickan saknar en publik URL. Generera om den för att skapa
              en.
            </Text>
          </Card>
        )}
      </Stack>
    </main>
  );
}
