"use client";

import { Button, Card, Select, Stack, Text } from "@mantine/core";
import { useMemo, useSyncExternalStore } from "react";
import { checkCell, uncheckCell } from "@/app/actions";

type CellData = {
  id: string;
  position: number;
  task: { title: string; description: string | null } | null;
  checks: { member_id: string }[];
};

type LinkedMember = {
  id: string;
  display_name: string;
};

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

export function BingoGrid({
  teamId,
  boardId,
  boardWidth,
  cells,
  linkedMembers,
}: {
  teamId: string;
  boardId: string;
  boardWidth: number;
  cells: CellData[];
  linkedMembers: LinkedMember[];
}) {
  const storageKey = `board-${boardId}-selected-member`;
  const storedValue = useLocalStorage(storageKey);

  // Determine selected member: stored value if valid, else first linked member
  const selectedMemberId = useMemo(() => {
    if (storedValue && linkedMembers.some((m) => m.id === storedValue)) {
      return storedValue;
    }
    if (linkedMembers.length === 1) return linkedMembers[0].id;
    return null;
  }, [storedValue, linkedMembers]);

  const handleMemberChange = (val: string | null) => {
    if (val) {
      localStorage.setItem(storageKey, val);
      // Trigger re-render by dispatching a storage event manually
      window.dispatchEvent(
        new StorageEvent("storage", { key: storageKey, newValue: val }),
      );
    }
  };

  const noMembers = linkedMembers.length === 0;

  return (
    <Stack gap="md">
      {/* Member selector */}
      {noMembers ? (
        <Card radius="lg" p="md" withBorder bg="yellow.0">
          <Text size="sm">
            Du är inte kopplad till någon spelare i detta lag. Be en ledare
            koppla dig, eller gå till lagsidan för att koppla dig själv.
          </Text>
        </Card>
      ) : linkedMembers.length > 1 ? (
        <Select
          label="Kryssa av som"
          data={linkedMembers.map((m) => ({
            value: m.id,
            label: m.display_name,
          }))}
          value={selectedMemberId}
          onChange={handleMemberChange}
          placeholder="Välj spelare..."
        />
      ) : null}

      {/* Bingo grid */}
      <div
        className="bingo-grid"
        style={{ "--bingo-width": boardWidth } as React.CSSProperties}
      >
        {cells.map((cell) => {
          const checkedBySelected = selectedMemberId
            ? cell.checks.some((c) => c.member_id === selectedMemberId)
            : false;

          return (
            <Card
              key={cell.id}
              radius="lg"
              p="sm"
              withBorder
              bg={checkedBySelected ? "green.0" : "white"}
            >
              <Stack gap="xs" justify="space-between" h="100%">
                <div>
                  <Text fw={800} size="sm">
                    {cell.task?.title}
                  </Text>
                  {cell.task?.description ? (
                    <Text size="xs" c="dimmed">
                      {cell.task.description}
                    </Text>
                  ) : null}
                </div>
                <Text size="xs" c="dimmed">
                  {cell.checks.length} kryss
                </Text>
                {selectedMemberId ? (
                  <form action={checkedBySelected ? uncheckCell : checkCell}>
                    <input type="hidden" name="teamId" value={teamId} />
                    <input type="hidden" name="boardId" value={boardId} />
                    <input type="hidden" name="cellId" value={cell.id} />
                    <input
                      type="hidden"
                      name="memberId"
                      value={selectedMemberId}
                    />
                    <Button
                      type="submit"
                      size="xs"
                      fullWidth
                      color={checkedBySelected ? "red" : "green"}
                      variant={checkedBySelected ? "light" : "filled"}
                    >
                      {checkedBySelected ? "Ta bort" : "Klar!"}
                    </Button>
                  </form>
                ) : (
                  <Button size="xs" fullWidth disabled>
                    Välj spelare
                  </Button>
                )}
              </Stack>
            </Card>
          );
        })}
      </div>
    </Stack>
  );
}
