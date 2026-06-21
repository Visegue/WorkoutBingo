"use client";

import {
  Card,
  Group,
  Select,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

type CellData = {
  id: string;
  position: number;
  task: { title: string; description: string | null } | null;
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

      {/* Bingo grid */}
      <div
        className="bingo-grid"
        style={{ "--bingo-width": boardWidth } as React.CSSProperties}
      >
        {cells.map((cell) => {
          const isFinished = cell.checks.length > 0;
          const checkedBySelected = selectedMemberId
            ? cell.checks.some((c) => c.member_id === selectedMemberId)
            : false;
          const canClick = !!selectedMemberId && !readOnly;

          return (
            <Card
              key={cell.id}
              radius="lg"
              p="sm"
              withBorder
              bg={isFinished ? "gray.1" : "white"}
              style={{
                cursor: canClick ? "pointer" : "default",
                border: checkedBySelected
                  ? "2px solid var(--mantine-color-green-5)"
                  : undefined,
                transition: "background 0.15s",
                position: "relative",
              }}
              onClick={() => canClick && handleCellClick(cell.id)}
            >
              {isFinished && (
                <div
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    fontSize: 14,
                    lineHeight: 1,
                    color: "var(--mantine-color-green-6)",
                  }}
                >
                  ✓
                </div>
              )}
              <Stack gap={4} justify="space-between" h="100%">
                <div>
                  <Text
                    fw={800}
                    size="sm"
                    c={isFinished ? "dimmed" : undefined}
                  >
                    {cell.task?.title}
                  </Text>
                  {cell.task?.description ? (
                    <Text size="xs" c="dimmed">
                      {cell.task.description}
                    </Text>
                  ) : null}
                </div>
                {/* Member badges row - always rendered for consistent height */}
                <Group gap={4} mt={4} style={{ minHeight: 22 }}>
                  {cell.checks.map((check) => {
                    const member = memberMap.get(check.member_id);
                    const name = member?.display_name ?? "?";
                    const color = member?.color ?? "#ccc";
                    return (
                      <Tooltip key={check.member_id} label={name}>
                        <div
                          style={{
                            width: 22,
                            height: 22,
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
                              fontSize: 9,
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
                </Group>
              </Stack>
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
    </Stack>
  );
}
