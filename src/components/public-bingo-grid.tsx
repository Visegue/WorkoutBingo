"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Indicator,
  Group,
  Modal,
  Popover,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconFilter, IconSearch } from "@tabler/icons-react";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { HelpIconLink } from "@/components/help-icon-link";

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

function useViewportWidth() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener("resize", callback);
      return () => window.removeEventListener("resize", callback);
    },
    () => window.innerWidth,
    () => 1024,
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
  const latestMemberStorageKey = `board-${slug}-latest-check-member`;
  const router = useRouter();
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>([]);
  const [filterOpened, setFilterOpened] = useState(false);
  const [cardSize, setCardSize] = useState<"small" | "medium" | "large">("small");
  const [optimisticCells, setOptimisticCells] = useState<CellData[]>(cells);
  const [pendingChecks, setPendingChecks] = useState<string[]>([]);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [detailsCellId, setDetailsCellId] = useState<string | null>(null);
  const [addCheckCellId, setAddCheckCellId] = useState<string | null>(null);
  const [checkSearch, setCheckSearch] = useState("");
  const [latestMemberId, setLatestMemberId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(latestMemberStorageKey);
  });
  const viewportWidth = useViewportWidth();

  // Map member id -> member data for quick lookup
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => map.set(m.id, m));
    return map;
  }, [members]);

  const noMembers = members.length === 0;
  const boardFitsViewport = boardWidth * 120 + (boardWidth - 1) * 10 <= viewportWidth - 28;
  const showSizeControl = !boardFitsViewport;
  const detailsCell = detailsCellId
    ? optimisticCells.find((cell) => cell.id === detailsCellId)
    : null;
  const addCheckCell = addCheckCellId
    ? optimisticCells.find((cell) => cell.id === addCheckCellId)
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
  const normalizedCheckSearch = checkSearch.trim().toLowerCase();
  const visibleAddCheckMembers = useMemo(
    () =>
      normalizedCheckSearch
        ? addCheckMembers.filter((member) =>
            member.display_name.toLowerCase().includes(normalizedCheckSearch),
          )
        : addCheckMembers,
    [addCheckMembers, normalizedCheckSearch],
  );
  const visibleRemoveCheckMembers = useMemo(
    () =>
      normalizedCheckSearch
        ? removeCheckMembers.filter((member) =>
            member.display_name.toLowerCase().includes(normalizedCheckSearch),
          )
        : removeCheckMembers,
    [normalizedCheckSearch, removeCheckMembers],
  );

  const openAddCheckModal = useCallback((cell: CellData) => {
    setAddCheckCellId(cell.id);
    setCheckSearch("");
  }, []);

  const handleAddCheck = useCallback(async (memberId: string) => {
    if (!addCheckCellId) return;

    const pendingKey = `${addCheckCellId}:${memberId}`;
    const previousCells = optimisticCells;
    localStorage.setItem(latestMemberStorageKey, memberId);
    setLatestMemberId(memberId);
    setCheckError(null);
    setPendingChecks((current) => [...current, pendingKey]);
    setOptimisticCells((current) =>
      current.map((cell) =>
        cell.id === addCheckCellId &&
        !cell.checks.some((check) => check.member_id === memberId)
          ? { ...cell, checks: [...cell.checks, { member_id: memberId }] }
          : cell,
      ),
    );
    setAddCheckCellId(null);
    setCheckSearch("");

    try {
      const response = await fetch(`/api/boards/${slug}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cellId: addCheckCellId, memberId }),
      });
      if (!response.ok) throw new Error("Krysset kunde inte sparas.");
      router.refresh();
    } catch {
      setOptimisticCells(previousCells);
      setCheckError("Krysset kunde inte sparas. Försök igen.");
    } finally {
      setPendingChecks((current) => current.filter((key) => key !== pendingKey));
    }
  }, [addCheckCellId, latestMemberStorageKey, optimisticCells, router, slug]);

  const handleRemoveCheck = useCallback(
    async (memberId: string) => {
      if (!addCheckCellId) return;

      const pendingKey = `${addCheckCellId}:${memberId}`;
      const previousCells = optimisticCells;
      localStorage.setItem(latestMemberStorageKey, memberId);
      setLatestMemberId(memberId);
      setCheckError(null);
      setPendingChecks((current) => [...current, pendingKey]);
      setOptimisticCells((current) =>
        current.map((cell) =>
          cell.id === addCheckCellId
            ? {
                ...cell,
                checks: cell.checks.filter((check) => check.member_id !== memberId),
              }
            : cell,
        ),
      );
      setAddCheckCellId(null);
      setCheckSearch("");

      try {
        const response = await fetch(`/api/boards/${slug}/check`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cellId: addCheckCellId, memberId }),
        });
        if (!response.ok) throw new Error("Krysset kunde inte tas bort.");
        router.refresh();
      } catch {
        setOptimisticCells(previousCells);
        setCheckError("Krysset kunde inte uppdateras. Försök igen.");
      } finally {
        setPendingChecks((current) => current.filter((key) => key !== pendingKey));
      }
    },
    [addCheckCellId, latestMemberStorageKey, optimisticCells, router, slug],
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
        <Group justify="space-between" align="center">
          <Group gap="xs">
            {showSizeControl ? (
              <SegmentedControl
                className="mobile-board-size-control"
                size="xs"
                value={cardSize}
                onChange={(value) => setCardSize(value as "small" | "medium" | "large")}
                data={[
                  { label: "Liten", value: "small" },
                  { label: "Mellan", value: "medium" },
                  { label: "Stor", value: "large" },
                ]}
              />
            ) : null}
          </Group>
          <Group gap="xs" wrap="nowrap">
            <HelpIconLink />
            <Popover
              opened={filterOpened}
              onChange={setFilterOpened}
              position="bottom-end"
              withArrow
              shadow="md"
            >
              <Popover.Target>
                <Tooltip label="Filtrera spelare">
                  <Indicator
                    disabled={allMembersVisible}
                    color="green"
                    size={10}
                    offset={4}
                    withBorder
                  >
                    <ActionIcon
                      variant={allMembersVisible ? "light" : "filled"}
                      color="green"
                      size="lg"
                      aria-label="Filtrera spelare"
                      onClick={() => setFilterOpened((opened) => !opened)}
                    >
                      <IconFilter size={20} />
                    </ActionIcon>
                  </Indicator>
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
                  <Divider />
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
        </Group>
      ) : null}
      {checkError ? (
        <Alert color="red" variant="light" onClose={() => setCheckError(null)} withCloseButton>
          {checkError}
        </Alert>
      ) : null}

      {/* Bingo grid */}
      <div
        className={`bingo-grid ${showSizeControl ? `bingo-grid--flow bingo-grid--${cardSize}` : ""}`}
        style={{ "--bingo-width": boardWidth } as React.CSSProperties}
      >
        {optimisticCells.map((cell) => {
          const visibleChecks = cell.checks.filter((check) =>
            !hiddenMemberIds.includes(check.member_id),
          );
          const isFinished = hiddenMemberIds.length
            ? visibleChecks.length > 0
            : cell.checks.length > 0;

          return (
            <Card
              className="bingo-card"
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
                height: "100%",
              }}
              onClick={() => {
                setDetailsCellId(cell.id);
              }}
            >
              <Stack
                className="bingo-card-header"
                gap={4}
                p="sm"
                style={{
                  height: "var(--bingo-card-header-height, 122px)",
                  flexShrink: 0,
                  paddingRight: "var(--bingo-card-header-right-padding)",
                }}
              >
                <div>
                  <Text
                    fw={700}
                    size="sm"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: "var(--bingo-title-line-clamp, 4)",
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: 1.25,
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
                    className="bingo-card-check"
                    style={{
                      width: "var(--bingo-check-size, 28px)",
                      height: "var(--bingo-check-size, 28px)",
                      borderRadius: "50%",
                      backgroundColor: "var(--mantine-color-green-6)",
                      color: "white",
                      fontSize: "var(--bingo-check-font-size, 19px)",
                      fontWeight: 800,
                      lineHeight: 1,
                      flexShrink: 0,
                      marginInline: "var(--bingo-check-margin-inline, auto)",
                      marginTop: "var(--bingo-check-margin-top, auto)",
                    }}
                  >
                    ✓
                  </div>
                ) : null}
              </Stack>
              <div
                className="bingo-card-members"
                style={{
                  borderTop: "1px solid var(--mantine-color-gray-2)",
                  minHeight: 44,
                  padding: "var(--bingo-member-padding, 10px 16px)",
                  flex: 1,
                }}
              >
                <Group gap={6} wrap="wrap" style={{ minHeight: 26 }}>
                    {visibleChecks.map((check) => {
                      const member = memberMap.get(check.member_id);
                      const name = member?.display_name ?? "?";
                      const color = member?.color ?? "#ccc";
                      return (
                        <Tooltip key={check.member_id} label={name}>
                          <div
                            style={{
                              width: "var(--bingo-member-size, 24px)",
                              height: "var(--bingo-member-size, 24px)",
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
                                fontSize: "var(--bingo-member-font-size, 10px)",
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
                            fontSize: "var(--bingo-plus-font-size, 18px)",
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
          setCheckSearch("");
        }}
        centered
      >
        <Stack>
          <TextInput
            placeholder="Skriv namn..."
            leftSection={<IconSearch size={16} />}
            value={checkSearch}
            onChange={(event) => setCheckSearch(event.currentTarget.value)}
            autoFocus
          />
          <ScrollArea.Autosize mah="60vh" type="auto" offsetScrollbars>
            <Stack gap="md" pr="xs">
              {visibleAddCheckMembers.length ? (
                <Stack gap="xs">
                  <Text size="sm" fw={700}>
                    Lägg till kryss
                  </Text>
                  {visibleAddCheckMembers.map((member) => (
                    <Button
                      key={member.id}
                      variant="light"
                      color="green"
                      justify="flex-start"
                      fullWidth
                      styles={{ label: { width: "100%" } }}
                      disabled={pendingChecks.includes(`${addCheckCellId}:${member.id}`)}
                      onClick={() => void handleAddCheck(member.id)}
                    >
                      <Group justify="space-between" w="100%" wrap="nowrap">
                        <MemberBadge name={member.display_name} color={member.color} />
                        {latestMemberId === member.id ? (
                          <Badge color="green" variant="light" size="sm">
                            Senast vald
                          </Badge>
                        ) : null}
                      </Group>
                    </Button>
                  ))}
                </Stack>
              ) : normalizedCheckSearch ? (
                <Text size="sm" c="dimmed">
                  Inga spelare att lägga till matchar sökningen.
                </Text>
              ) : (
                <Text size="sm" c="dimmed">
                  Alla spelare är redan ikryssade på den här aktiviteten.
                </Text>
              )}
              {visibleRemoveCheckMembers.length ? (
                <Stack gap="xs">
                  <Text size="sm" fw={700}>
                    Ta bort kryss
                  </Text>
                  {visibleRemoveCheckMembers.map((member) => (
                    <Button
                      key={member.id}
                      variant="light"
                      color="red"
                      justify="flex-start"
                      fullWidth
                      styles={{ label: { width: "100%" } }}
                      disabled={pendingChecks.includes(`${addCheckCellId}:${member.id}`)}
                      onClick={() => void handleRemoveCheck(member.id)}
                    >
                      <Group justify="space-between" w="100%" wrap="nowrap">
                        <MemberBadge name={member.display_name} color={member.color} />
                        {latestMemberId === member.id ? (
                          <Badge color="green" variant="light" size="sm">
                            Senast vald
                          </Badge>
                        ) : null}
                      </Group>
                    </Button>
                  ))}
                </Stack>
              ) : normalizedCheckSearch && removeCheckMembers.length ? (
                <Text size="sm" c="dimmed">
                  Inga ikryssade spelare matchar sökningen.
                </Text>
              ) : null}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Modal>
    </Stack>
  );
}
