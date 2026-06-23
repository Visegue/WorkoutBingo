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
  const storedValue = useLocalStorage(storageKey);
  const router = useRouter();
  const [showAllChecks, setShowAllChecks] = useState(true);
  const [detailsCellId, setDetailsCellId] = useState<string | null>(null);

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
  const detailsCheckedBySelected = selectedMemberId
    ? detailsCell?.checks.some((check) => check.member_id === selectedMemberId)
    : false;

  // Build select data with color info for renderOption
  const selectData = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.display_name,
      })),
    [members],
  );

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
          const isFinished = visibleChecks.length > 0;
          const checkedBySelected = selectedMemberId
            ? cell.checks.some((c) => c.member_id === selectedMemberId)
            : false;
          const canToggle = !!selectedMemberId && !readOnly;

          return (
            <Card
              key={cell.id}
              radius="lg"
              p={0}
              withBorder
              bg={checkedBySelected ? "green.0" : isFinished ? "gray.1" : "white"}
              style={{
                cursor: canToggle || !readOnly ? "pointer" : "default",
                border: checkedBySelected
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
              <Stack gap={6} p="md" style={{ minHeight: 122 }}>
                <Text
                  fw={800}
                  size="sm"
                  c={isFinished ? "dimmed" : undefined}
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
                  <Text size="xs" c="dimmed" fw={600}>
                    {cell.task.quantity}
                  </Text>
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
                  size="compact-xs"
                  variant="subtle"
                  color="gray"
                  aria-label="Visa uppgiftsdetaljer"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDetailsCellId(cell.id);
                  }}
                >
                  <IconInfoCircle size={16} />
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
        title={detailsCell?.task?.title ?? "Uppgift"}
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
          <div>
            <Text fw={700} mb="xs">
              Ikryssad av ({detailsCell?.checks.length ?? 0})
            </Text>
            <Stack gap="xs">
              {detailsCell?.checks.length ? (
                detailsCell.checks.map((check) => {
                  const member = memberMap.get(check.member_id);
                  return (
                    <Group key={check.member_id} gap="xs">
                      <div
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          backgroundColor: member?.color ?? "#ccc",
                        }}
                      />
                      <Text size="sm">
                        {member?.display_name ?? "Okänd spelare"}
                      </Text>
                    </Group>
                  );
                })
              ) : (
                <Text size="sm" c="dimmed">
                  Ingen ännu.
                </Text>
              )}
            </Stack>
          </div>
          {!readOnly && selectedMemberId && detailsCell ? (
            <Button
              color={detailsCheckedBySelected ? "red" : "green"}
              variant={detailsCheckedBySelected ? "light" : "filled"}
              onClick={() => {
                void handleCellClick(detailsCell.id);
                setDetailsCellId(null);
              }}
            >
              {detailsCheckedBySelected ? "Ångra mitt kryss" : "Kryssa av"}
            </Button>
          ) : null}
        </Stack>
      </Modal>
    </Stack>
  );
}
