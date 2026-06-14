"use client";

import { Button, Card, Select, Stack, Text } from "@mantine/core";
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

export function PublicBingoGrid({
  slug,
  boardWidth,
  cells,
  members,
}: {
  slug: string;
  boardWidth: number;
  cells: CellData[];
  members: Member[];
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

  const handleCheck = useCallback(
    async (cellId: string, memberId: string, isChecked: boolean) => {
      const method = isChecked ? "DELETE" : "POST";
      await fetch(`/api/boards/${slug}/check`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellId, memberId }),
      });
      router.refresh();
    },
    [slug, router],
  );

  const noMembers = members.length === 0;

  return (
    <Stack gap="md">
      {/* Member selector */}
      {noMembers ? (
        <Card radius="lg" p="md" withBorder bg="yellow.0">
          <Text size="sm">
            Inga spelare har lagts till ännu. Be lagets ledare lägga till
            spelare.
          </Text>
        </Card>
      ) : (
        <Select
          label="Kryssa av som"
          data={members.map((m) => ({
            value: m.id,
            label: m.display_name,
          }))}
          value={selectedMemberId}
          onChange={handleMemberChange}
          placeholder="Välj spelare..."
          searchable
        />
      )}

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
                  <Button
                    size="xs"
                    fullWidth
                    color={checkedBySelected ? "red" : "green"}
                    variant={checkedBySelected ? "light" : "filled"}
                    onClick={() =>
                      handleCheck(cell.id, selectedMemberId, checkedBySelected)
                    }
                  >
                    {checkedBySelected ? "Ta bort" : "Klar!"}
                  </Button>
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
