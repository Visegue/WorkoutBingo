import {
  Alert,
  Button,
  Card,
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
  addTask,
  autoFitTaskCounts,
  deleteTask,
  generateBoard,
  updateDraftBoard,
} from "@/app/actions";
import { SetupRequired } from "@/app/setup-required";
import { ensureProfile } from "@/lib/domain";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

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
  const [{ data: board }, { data: tasks }, { data: member }] =
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
            <Text
              component="a"
              href={`/teams/${teamId}/boards/${boardId}`}
              c="dimmed"
              size="sm"
            >
              Tillbaka till bricka
            </Text>
            <Title>Redigera {board.title}</Title>
          </div>
        </Group>
        {!isDraft ? (
          <Alert color="yellow" title="Aktiv bricka">
            Den här brickan har framsteg. Om du genererar om den tas alla kryss
            bort och en ny slumpad layout skapas.
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
                  disabled={!isDraft}
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
                  disabled={!isDraft}
                />
                <Button type="submit" color="green" disabled={!isDraft}>
                  Spara utkast
                </Button>
              </Stack>
            </form>
          </Card>
          <Card radius="lg" p="lg" withBorder>
            <Title order={2}>Lägg till uppgift</Title>
            <form action={addTask}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="boardId" value={boardId} />
              <Stack mt="md">
                <TextInput
                  name="title"
                  label="Uppgift"
                  placeholder="20 jongleringar"
                  disabled={!isDraft}
                  required
                />
                <Textarea
                  name="description"
                  label="Beskrivning"
                  disabled={!isDraft}
                />
                <TextInput
                  name="appearanceCount"
                  label="Antal gånger på brickan"
                  type="number"
                  min={1}
                  defaultValue={1}
                  disabled={!isDraft}
                  required
                />
                <Button type="submit" color="green" disabled={!isDraft}>
                  Lägg till uppgift
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
              {isDraft && totalAppearances !== boardCells ? (
                <Text c="dimmed" size="sm" mt={4}>
                  Anpassa automatiskt minskar de vanligaste uppgifterna först om
                  det är för många, eller fyller på alfabetiskt om det saknas
                  rutor.
                </Text>
              ) : null}
            </div>
            <Stack gap="xs" align="flex-end">
              {isDraft ? (
                <form action={autoFitTaskCounts}>
                  <input type="hidden" name="teamId" value={teamId} />
                  <input type="hidden" name="boardId" value={boardId} />
                  <Button
                    type="submit"
                    color="green"
                    variant="light"
                    disabled={!tasks?.length || totalAppearances === boardCells}
                  >
                    Anpassa automatiskt
                  </Button>
                </form>
              ) : null}
              <form action={generateBoard}>
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="boardId" value={boardId} />
                {!isDraft ? (
                  <input type="hidden" name="resetConfirmed" value="on" />
                ) : null}
                <Button
                  type="submit"
                  color={isDraft ? "green" : "red"}
                  disabled={totalAppearances !== boardCells}
                >
                  {isDraft
                    ? "Generera bricka"
                    : "Nollställ framsteg och generera om"}
                </Button>
              </form>
            </Stack>
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
                    <Text size="sm" c="dimmed">
                      {task.description}
                    </Text>
                  </TableTd>
                  <TableTd>{task.appearance_count}</TableTd>
                  <TableTd>
                    {isDraft ? (
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
                    ) : null}
                  </TableTd>
                </TableTr>
              ))}
            </TableTbody>
          </Table>
        </Card>
      </Stack>
    </main>
  );
}
