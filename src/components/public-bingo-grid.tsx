"use client";

import {
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
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

function useLocalStorage(key: string) {
  const subscribe = useMemo(
    () => (callback: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = () => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const getServerSnapshot = () => null;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function MemberSelectOption({ label, color }: { label: string; color: string }) {
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
      <Text size="sm">{label}</Text>
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
  const storageKey = `board-${slug}-selected-member`;
  const addCheckStorageKey = `board-${slug}-add-check-member`;
  const storedValue = useLocalStorage(storageKey);
  const router = useRouter();
  const [showAllChecks, setShowAllChecks] = useState(true);
  const [detailsCellId, setDetailsCellId] = useState<string | null>(null);
  const [addCheckCellId, setAddCheckCellId] = useState<string | null>(null);
  const [addCheckMemberId, setAddCheckMemberId] = useState<string | null>(null);
  const [lastAddCheckMemberId, setLastAddCheckMemberId] = useState<string | null>(null);

  const selectedMemberId = useMemo(() => {
    if (storedValue && members.some((m) => m.id === storedValue)) {
      return storedValue;
    }
    return null;
  }, [storedValue, members]);

  // Map member id -> member data for quick lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const handleMemberChange = useCallback(
    (val: string | null) => {
      if (val) {
        localStorage.setItem(storageKey, val);
        window.dispatchEvent(
          new StorageEvent("storage", { key: storageKey, newValue: val }),
        );
      }
    },
    [storageKey],
  );

  const handleCellClick = useCallback(
    async (cellId: string) => {
      if (readOnly) return;
      if (!selectedMemberId) return;

      // Check if this member already checked this cell
      const cell = cells.find((c) => c.id === cellId);
      const isChecked = cell?.checks.some(
        (c) => c.member_id === selectedMemberId,
      );

      const method = isChecked ? "DELETE" : "POST";
      await fetch(`/api/boards/${slug}/check`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellId, memberId: selectedMemberId }),
      });
      router.refresh();
    },
    [slug, router, selectedMemberId, cells, readOnly],
  );

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
  // Build select data with color info for renderOption
  const selectData = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.display_name,
      })),
    [members],
  );
  const addCheckSelectData = useMemo(
    () =>
      addCheckMembers.map((m) => ({
        value: m.id,
        label: m.display_name,
      })),
    [addCheckMembers],
  );

  const openAddCheckModal = useCallback(
    (cell: CellData) => {
      const savedMemberId = lastAddCheckMemberId ?? localStorage.getItem(addCheckStorageKey);
      const canUseSavedMember = savedMemberId
        ? members.some((member) => member.id === savedMemberId) &&
          !cell.checks.some((check) => check.member_id === savedMemberId)
        : false;

      setAddCheckCellId(cell.id);
      setAddCheckMemberId(canUseSavedMember ? savedMemberId : null);
    },
    [addCheckStorageKey, lastAddCheckMemberId, members],
  );

  const handleAddCheck = useCallback(async () => {
    if (!addCheckCellId || !addCheckMemberId) return;

    localStorage.setItem(addCheckStorageKey, addCheckMemberId);
    setLastAddCheckMemberId(addCheckMemberId);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: addCheckStorageKey,
        newValue: addCheckMemberId,
      }),
    );

    await fetch(`/api/boards/${slug}/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cellId: addCheckCellId, memberId: addCheckMemberId }),
    });
    setAddCheckCellId(null);
    setAddCheckMemberId(null);
    router.refresh();
  }, [addCheckCellId, addCheckMemberId, addCheckStorageKey, router, slug]);

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
      ) : (
        <Select
          label="Kryssa av som"
          data={selectData}
          value={selectedMemberId}
          onChange={handleMemberChange}
          placeholder="Välj spelare..."
          searchable
          renderOption={({ option }) => {
            const member = memberMap.get(option.value);
            return (
              <MemberSelectOption
                label={option.label}
                color={member?.color ?? "#ccc"}
              />
            );
          }}
          leftSection={
            selectedMemberId ? (
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  backgroundColor:
                    memberMap.get(selectedMemberId)?.color ?? "#ccc",
                }}
              />
            ) : undefined
          }
        />
      )}
      {!readOnly && !noMembers ? (
        <Checkbox
          label="Visa alla"
          checked={showAllChecks}
          onChange={(event) => setShowAllChecks(event.currentTarget.checked)}
          description="Avmarkera för att bara visa vald spelares kryss."
        />
      ) : null}

      {/* Bingo grid */}
      <div
        className="bingo-grid"
        style={{ "--bingo-width": boardWidth } as React.CSSProperties}
      >
        {cells.map((cell) => {
          const visibleChecks = showAllChecks
            ? cell.checks
            : cell.checks.filter((check) => check.member_id === selectedMemberId);
          const shownChecks = visibleChecks.slice(0, 3);
          const hiddenChecks = visibleChecks.length - shownChecks.length;
          const isFinished = cell.checks.length > 0;
          const canToggle = !!selectedMemberId && !readOnly;

          return (
            <Card
              key={cell.id}
              radius="lg"
              p={0}
              withBorder
              bg={isFinished ? "green.0" : "white"}
              style={{
                cursor: canToggle || !readOnly ? "pointer" : "default",
                border: isFinished
                  ? "2px solid var(--mantine-color-green-5)"
                  : undefined,
                transition: "background 0.15s",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={() => {
                if (canToggle) {
                  void handleCellClick(cell.id);
                  return;
                }

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
                      <Tooltip label="Lägg till spelare">
                        <button
                          type="button"
                          aria-label="Lägg till spelare som kryssat av"
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

      {/* Helper text */}
      {selectedMemberId && !readOnly && (
        <Text size="xs" c="dimmed" ta="center">
          Tryck på en ruta för att kryssa av / ångra
        </Text>
      )}
      {!selectedMemberId && !noMembers && !readOnly && (
        <Text size="xs" c="dimmed" ta="center">
          Välj en spelare ovan för att kryssa av rutor
        </Text>
      )}
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
          setAddCheckMemberId(null);
        }}
        title={<Text fw={800}>Lägg till kryss</Text>}
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Välj spelaren som har klarat aktiviteten.
          </Text>
          {addCheckMembers.length ? (
            <Select
              label="Spelare"
              data={addCheckSelectData}
              value={addCheckMemberId}
              onChange={(value) => {
                setAddCheckMemberId(value);
                if (!value) return;
                localStorage.setItem(addCheckStorageKey, value);
                setLastAddCheckMemberId(value);
                window.dispatchEvent(
                  new StorageEvent("storage", {
                    key: addCheckStorageKey,
                    newValue: value,
                  }),
                );
              }}
              placeholder="Välj spelare..."
              searchable
              renderOption={({ option }) => {
                const member = memberMap.get(option.value);
                return (
                  <MemberSelectOption
                    label={option.label}
                    color={member?.color ?? "#ccc"}
                  />
                );
              }}
            />
          ) : (
            <Text size="sm" c="dimmed">
              Alla spelare är redan ikryssade på den här aktiviteten.
            </Text>
          )}
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={() => {
                setAddCheckCellId(null);
                setAddCheckMemberId(null);
              }}
            >
              Avbryt
            </Button>
            <Button
              color="green"
              disabled={!addCheckMemberId}
              onClick={() => void handleAddCheck()}
            >
              Lägg till kryss
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
