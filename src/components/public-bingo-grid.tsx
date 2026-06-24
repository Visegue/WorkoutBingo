"use client";

import {
  ActionIcon,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Popover,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconFilter, IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CellData = {
  id: string;
  position: number;
  task: { title: string; description: string | null; quantity: string | null } | null;
  checks: { member_id: string }[];
};

type Member = {
  id: string;
  display_name: string;
  color: string;
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function MemberBadge({ name, color }: { name: string; color: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Text size="sm">{name}</Text>
    </Group>
  );
}

export function PublicBingoGrid({
  slug,
  boardWidth,
  cells,
  members,
  readOnly = false,
}: {
  slug: string;
  boardWidth: number;
  cells: CellData[];
  members: Member[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>([]);
  const [filterOpened, setFilterOpened] = useState(false);
  const [detailsCellId, setDetailsCellId] = useState<string | null>(null);
  const [addCheckCellId, setAddCheckCellId] = useState<string | null>(null);

  // Map member id -> member data for quick lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const noMembers = members.length === 0;
  const detailsCell = detailsCellId
    ? cells.find((cell) => cell.id === detailsCellId)
    : null;
  const addCheckCell = addCheckCellId
    ? cells.find((cell) => cell.id === addCheckCellId)
    : null;
  const addCheckMembers = useMemo(
    () =>
      addCheckCell
        ? members.filter(
            (member) =>
              !addCheckCell.checks.some((check) => check.member_id === member.id),
          )
        : [],
    [addCheckCell, members],
  );
  const removeCheckMembers = useMemo(
    () =>
      addCheckCell
        ? members.filter((member) =>
            addCheckCell.checks.some((check) => check.member_id === member.id),
          )
        : [],
    [addCheckCell, members],
  );
  const allMembersVisible =
    members.length > 0 && hiddenMemberIds.length === 0;

  const openAddCheckModal = useCallback((cell: CellData) => {
    setAddCheckCellId(cell.id);
  }, []);

  const handleAddCheck = useCallback(async (memberId: string) => {
    if (!addCheckCellId) return;

    await fetch(`/api/boards/${slug}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId: addCheckCellId, memberId }),
    });
    setAddCheckCellId(null);
    router.refresh();
  }, [addCheckCellId, router, slug]);

  const handleRemoveCheck = useCallback(
    async (memberId: string) => {
      if (!addCheckCellId) return;

      await fetch(`/api/boards/${slug}/check`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellId: addCheckCellId, memberId }),
      });
      setAddCheckCellId(null);
      router.refresh();
    },
    [addCheckCellId, router, slug],
  );

  const toggleVisibleMember = useCallback((memberId: string, checked: boolean) => {
    setHiddenMemberIds((current) =>
      checked
        ? current.filter((id) => id !== memberId)
        : [...new Set([...current, memberId])],
    );
  }, []);

  return (
    <Stack gap="md">
      {readOnly ? (
        <Card radius="lg" p="md" withBorder bg="gray.0">
          <Text size="sm">
            Brickan är avslutad. Resultatet visas nedan och nya kryss kan inte
            läggas till.
          </Text>
        </Card>
      ) : noMembers ? (
        <Card radius="lg" p="md" withBorder bg="yellow.0">
          <Text size="sm">
            Inga spelare har lagts till ännu. Be lagets ledare lägga till
            spelare.
          </Text>
        </Card>
      ) : null}
      {!noMembers ? (
        <Group justify="flex-end">
          <Popover
            opened={filterOpened}
            onChange={setFilterOpened}
            position="bottom-end"
            withArrow
            shadow="md"
          >
            <Popover.Target>
              <Tooltip label="Filtrera spelare">
                <ActionIcon
                  variant="light"
                  color="green"
                  size="lg"
                  aria-label="Filtrera spelare"
                  onClick={() => setFilterOpened((opened) => !opened)}
                >
                  <IconFilter size={20} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown>
              <Stack gap="xs" miw={220}>
                <Checkbox
                  label="Visa alla"
                  checked={allMembersVisible}
                  indeterminate={
                    hiddenMemberIds.length > 0 && hiddenMemberIds.length < members.length
                  }
                  onChange={(event) => {
                    setHiddenMemberIds(
                      event.currentTarget.checked
                        ? []
                        : members.map((member) => member.id),
                    );
                  }}
                />
                {members.map((member) => (
                  <Checkbox
                    key={member.id}
                    checked={!hiddenMemberIds.includes(member.id)}
                    onChange={(event) =>
                      toggleVisibleMember(member.id, event.currentTarget.checked)
                    }
                    label={
                      <MemberBadge name={member.display_name} color={member.color} />
                    }
                  />
                ))}
              </Stack>
            </Popover.Dropdown>
          </Popover>
        </Group>
      ) : null}

      {/* Bingo grid */}
      <div
        className="bingo-grid"
        style={{ "--bingo-width": boardWidth } as React.CSSProperties}
      >
        {cells.map((cell) => {
          const visibleChecks = cell.checks.filter((check) =>
            !hiddenMemberIds.includes(check.member_id),
          );
          const shownChecks = visibleChecks.slice(0, 3);
          const hiddenChecks = visibleChecks.length - shownChecks.length;
          const isFinished = cell.checks.length > 0;

          return (
            <Card
              key={cell.id}
              radius="lg"
              p={0}
              withBorder
              bg={isFinished ? "green.0" : "white"}
              style={{
                cursor: "pointer",
                border: isFinished
                  ? "2px solid var(--mantine-color-green-5)"
                  : undefined,
                transition: "background 0.15s",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => {
                setDetailsCellId(cell.id);
              }}
            >
              <Stack gap={6} p="md" style={{ minHeight: 122, flex: 1 }}>
                <div>
                  <Text
                    fw={800}
                    size="sm"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {cell.task?.title}
                  </Text>
                  {cell.task?.quantity ? (
                    <Text size="xs" c="dimmed" fw={600} mt={4}>
                      {cell.task.quantity}
                    </Text>
                  ) : null}
                </div>
                {isFinished ? (
                  <div
                    aria-label="Avklarad"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-green-6)",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      fontWeight: 800,
                      lineHeight: 1,
                      marginInline: "auto",
                      marginTop: "auto",
                    }}
                  >
                    ✓
                  </div>
                ) : null}
              </Stack>
              <div
                style={{
                  borderTop: "1px solid var(--mantine-color-gray-2)",
                  minHeight: 44,
                  padding: "10px 16px",
                  marginTop: "auto",
                }}
              >
                <Group gap={6} style={{ minHeight: 26 }}>
                    {shownChecks.map((check) => {
                      const member = memberMap.get(check.member_id);
                      const name = member?.display_name ?? "?";
                      const color = member?.color ?? "#ccc";
                      return (
                        <Tooltip key={check.member_id} label={name}>
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              backgroundColor: color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: "white",
                                lineHeight: 1,
                                userSelect: "none",
                              }}
                            >
                              {getInitials(name)}
                            </span>
                          </div>
                        </Tooltip>
                      );
                    })}
                    {hiddenChecks > 0 ? (
                      <Tooltip label={`${hiddenChecks} fler kryss`}>
                        <div
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            backgroundColor: "var(--mantine-color-gray-5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "white",
                              lineHeight: 1,
                              userSelect: "none",
                            }}
                          >
                            +{hiddenChecks}
                          </span>
                        </div>
                      </Tooltip>
                    ) : null}
                    {!readOnly && members.length ? (
                      <Tooltip label="Hantera kryss">
                        <button
                          type="button"
                          aria-label="Hantera kryss"
                          onClick={(event) => {
                            event.stopPropagation();
                            openAddCheckModal(cell);
                          }}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            border: "2px dashed var(--mantine-color-green-6)",
                            background: "white",
                            color: "var(--mantine-color-green-7)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 18,
                            fontWeight: 800,
                            lineHeight: 1,
                            cursor: "pointer",
                          }}
                        >
                          +
                        </button>
                      </Tooltip>
                    ) : null}
                  </Group>
                </div>
              <div
                style={{
                  borderTop: "1px solid var(--mantine-color-gray-2)",
                  padding: "8px 16px 10px",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label="Visa uppgiftsdetaljer"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailsCellId(cell.id);
                  }}
                >
                  <IconInfoCircle size={22} stroke={2.4} />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        opened={!!detailsCell}
        onClose={() => setDetailsCellId(null)}
        title={<Text fw={800}>{detailsCell?.task?.title ?? "Uppgift"}</Text>}
        centered
      >
        <Stack>
          {detailsCell?.task?.description ? (
            <Text c="dimmed">{detailsCell.task.description}</Text>
          ) : (
            <Text c="dimmed">Ingen beskrivning.</Text>
          )}
          {detailsCell?.task?.quantity ? (
            <Text size="sm">
              <b>Mängd:</b> {detailsCell.task.quantity}
            </Text>
          ) : null}
          <Button color="gray" variant="light" onClick={() => setDetailsCellId(null)}>
            Stäng
          </Button>
        </Stack>
      </Modal>
      <Modal
        opened={!!addCheckCell}
        onClose={() => {
          setAddCheckCellId(null);
        }}
        title={<Text fw={800}>Hantera kryss</Text>}
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Lägg till eller ta bort spelare som har klarat aktiviteten.
          </Text>
          {addCheckMembers.length ? (
            <Stack gap="xs">
              <Text size="sm" fw={700}>
                Lägg till kryss
              </Text>
              {addCheckMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="light"
                  color="green"
                  justify="flex-start"
                  onClick={() => void handleAddCheck(member.id)}
                >
                  <MemberBadge name={member.display_name} color={member.color} />
                </Button>
              ))}
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              Alla spelare är redan ikryssade på den här aktiviteten.
            </Text>
          )}
          {removeCheckMembers.length ? (
            <Stack gap="xs">
              <Text size="sm" fw={700}>
                Ta bort kryss
              </Text>
              {removeCheckMembers.map((member) => (
                <Button
                  key={member.id}
                  variant="light"
                  color="red"
                  justify="flex-start"
                  onClick={() => void handleRemoveCheck(member.id)}
                >
                  <MemberBadge name={member.display_name} color={member.color} />
                </Button>
              ))}
            </Stack>
          ) : null}
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setAddCheckCellId(null);
              }}
            >
              Avbryt
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
