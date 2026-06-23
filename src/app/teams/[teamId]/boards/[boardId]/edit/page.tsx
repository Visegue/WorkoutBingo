import {
  Alert,
  ActionIcon,
  Button,
  Card,
  Code,
  Group,
  Stack,
  Table,
  TableTbody,
  TableTd,
  TableTh,
  TableThead,
  TableTr,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  autoFitTaskCounts,
  autofillTasks,
  deleteTask,
  generateBoard,
  updateBoardSlug,
  updateDraftBoard,
} from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { AddTaskButton } from "@/components/add-task-button";
import { AdminBreadcrumbs } from "@/components/admin-breadcrumbs";
import { DeleteBoardButton } from "@/components/delete-board-button";
import { EditTaskButton } from "@/components/edit-task-button";
import { ImportTasksCsvButton } from "@/components/import-tasks-csv-button";
import { TaskActionsHelpButton } from "@/components/task-actions-help-button";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { IconAdjustments, IconRefresh, IconWand } from "@tabler/icons-react";

export default async function EditBoardPage({
  params,
}: {
  params: Promise<{ teamId: string; boardId: string }>;
}) {
  if (!hasSupabaseEnv()) return <SetupRequired />;

  const user = await ensureProfile();
  if (!user) return null;
  const { teamId, boardId } = await params;
  const supabase = await createClient();
  const [{ data: board }, { data: tasks }, { data: member }, { data: team }] =
    await Promise.all([
      supabase
        .from("boards")
        .select("*")
        .eq("id", boardId)
        .eq("team_id", teamId)
        .single(),
      supabase
        .from("tasks")
        .select("*")
        .eq("board_id", boardId)
        .order("created_at"),
      supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase.from("teams").select("name").eq("id", teamId).single(),
    ]);

  if (!board || member?.role !== "leader") {
    return (
      <main className="page-shell">
        <Alert color="red">Ledarbehörighet krävs.</Alert>
      </main>
    );
  }

  const totalAppearances =
    tasks?.reduce((sum, task) => sum + task.appearance_count, 0) ?? 0;
  const boardCells = board.width * board.height;
  const isDraft = board.status === "draft";

  return (
    <main className="page-shell">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <AdminBreadcrumbs
              items={[
                { label: "Översikt", href: "/dashboard" },
                { label: team?.name ?? "Lag", href: `/teams/${teamId}` },
                {
                  label: board.title,
                  href: `/teams/${teamId}/boards/${boardId}`,
                },
                { label: "Redigera" },
              ]}
            />
            <Title>Redigera {board.title}</Title>
          </div>
        </Group>
        {!isDraft ? (
          <Alert color="yellow" title="Aktiv bingobricka">
            Du kan ändra titel, beskrivning, slutdatum och publik URL utan att
            påverka uppgifterna. För att ändra själva brickan behöver du
            nollställa framstegen och låsa upp den som utkast.
          </Alert>
        ) : null}
        <div className="card-grid">
          <Card radius="lg" p="lg" withBorder>
            <Title order={2}>Brickinställningar</Title>
            <form action={updateDraftBoard}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="boardId" value={boardId} />
              <Stack mt="md">
                <TextInput
                  name="title"
                  label="Titel"
                  defaultValue={board.title}
                  required
                />
                <Group grow>
                  <TextInput
                    name="width"
                    label="Bredd"
                    type="number"
                    min={2}
                    max={10}
                    defaultValue={board.width}
                    disabled={!isDraft}
                    required
                  />
                  <TextInput
                    name="height"
                    label="Höjd"
                    type="number"
                    min={2}
                    max={10}
                    defaultValue={board.height}
                    disabled={!isDraft}
                    required
                  />
                </Group>
                <Textarea
                  name="description"
                  label="Beskrivning"
                  defaultValue={board.description ?? ""}
                />
                <TextInput
                  name="endDate"
                  label="Slutdatum"
                  type="date"
                  defaultValue={board.end_date ?? ""}
                  description="Valfritt. Efter detta datum stängs brickan för nya kryss."
                />
                <Button type="submit" color="green">
                  Spara ändringar
                </Button>
              </Stack>
            </form>
          </Card>
          <Card radius="lg" p="lg" withBorder>
            <Title order={2}>Publik URL</Title>
            {board.slug ? (
              <Text size="sm" c="dimmed" mt="xs">
                Nuvarande:{" "}
                <Text
                  component="a"
                  href={`/b/${board.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  c="blue"
                  td="underline"
                >
                  <Code>{siteUrl}/b/{board.slug}</Code>
                </Text>
              </Text>
            ) : (
              <Text size="sm" c="dimmed" mt="xs">
                Genereras automatiskt när brickan aktiveras, eller ställ in manuellt.
              </Text>
            )}
            <form action={updateBoardSlug}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="boardId" value={boardId} />
              <Stack mt="md">
                <TextInput
                  name="slug"
                  label="URL-slug"
                  placeholder="mitt-lag-sommaren-2026"
                  defaultValue={board.slug ?? ""}
                  description="Gemener, siffror och bindestreck. Måste vara unik."
                />
                <Button type="submit" color="green" variant="light">
                  Spara URL
                </Button>
              </Stack>
            </form>
          </Card>
        </div>
        <Card radius="lg" p="lg" withBorder>
          <Group justify="space-between" align="start">
            <div>
              <Title order={2}>Uppgifter</Title>
              <Text c={totalAppearances === boardCells ? "green" : "red"}>
                {totalAppearances} uppgiftsplaceringar / {boardCells} rutor
              </Text>
            </div>
            <Group gap="xs" justify="flex-end">
              <TaskActionsHelpButton isDraft={isDraft} />
              {isDraft ? (
                <AddTaskButton teamId={teamId} boardId={boardId} />
              ) : null}
              {isDraft ? (
                <ImportTasksCsvButton teamId={teamId} boardId={boardId} />
              ) : null}
              {isDraft && totalAppearances < boardCells ? (
                <form action={autofillTasks}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="boardId" value={boardId} />
                  <ActionIcon
                    type="submit"
                    color="green"
                    variant="light"
                    size="xl"
                    radius="md"
                    aria-label="Autofyll uppgifter"
                  >
                    <IconWand size={22} />
                  </ActionIcon>
                </form>
              ) : null}
              {isDraft ? (
                <form action={autoFitTaskCounts}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="boardId" value={boardId} />
                  <ActionIcon
                    type="submit"
                    color="green"
                    variant="light"
                    size="xl"
                    radius="md"
                    disabled={!tasks?.length || totalAppearances === boardCells}
                    aria-label="Anpassa antal automatiskt"
                  >
                    <IconAdjustments size={22} />
                  </ActionIcon>
                </form>
              ) : null}
              <form action={generateBoard}>
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="boardId" value={boardId} />
                {!isDraft ? (
                  <input type="hidden" name="resetConfirmed" value="on" />
                ) : null}
                <ActionIcon
                  type="submit"
                  color={isDraft ? "green" : "red"}
                  variant={isDraft ? "filled" : "light"}
                  size="xl"
                  radius="md"
                  disabled={totalAppearances !== boardCells}
                  aria-label={
                    isDraft
                      ? "Generera bingobricka"
                      : "Nollställ framsteg och lås upp"
                  }
                >
                  <IconRefresh size={22} />
                </ActionIcon>
              </form>
            </Group>
          </Group>
          <Table mt="md">
            <TableThead>
              <TableTr>
                <TableTh>Uppgift</TableTh>
                <TableTh>Antal</TableTh>
                <TableTh />
              </TableTr>
            </TableThead>
            <TableTbody>
              {tasks?.map((task) => (
                <TableTr key={task.id}>
                  <TableTd>
                    <Text fw={600}>{task.title}</Text>
                    {task.quantity ? (
                      <Text size="sm" c="dimmed" fw={600}>
                        {task.quantity}
                      </Text>
                    ) : null}
                    <Text size="sm" c="dimmed">
                      {task.description}
                    </Text>
                  </TableTd>
                  <TableTd>{task.appearance_count}</TableTd>
                  <TableTd>
                    {isDraft ? (
                      <Group gap="xs" justify="flex-end" wrap="nowrap">
                        <EditTaskButton teamId={teamId} boardId={boardId} task={task} />
                        <form action={deleteTask}>
                          <input type="hidden" name="teamId" value={teamId} />
                          <input type="hidden" name="boardId" value={boardId} />
                          <input
                            type="hidden"
                            name="taskId"
                            value={task.id}
                          />
                          <Button
                            type="submit"
                            size="xs"
                            color="red"
                            variant="subtle"
                          >
                            Ta bort
                          </Button>
                        </form>
                      </Group>
                    ) : null}
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </Card>
        <Card radius="lg" p="lg" withBorder>
          <Title order={2} c="red">
            Ta bort bingobricka
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Detta tar bort brickan, alla uppgifter och alla kryss permanent.
          </Text>
          <Group mt="md">
            <DeleteBoardButton teamId={teamId} boardId={boardId} />
          </Group>
        </Card>
      </Stack>
    </main>
  );
}
