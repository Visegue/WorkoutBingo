"use client";

import {
  ActionIcon,
  Card,
  ColorSwatch,
  Group,
  Popover,
  SimpleGrid,
  Text,
  TextInput,
} from "@mantine/core";
import { IconCheck, IconTrash } from "@tabler/icons-react";
import { useRef, useState } from "react";
import {
  deleteMember,
  renameMember,
  updateMemberColor,
} from "@/app/actions";
import { MEMBER_PALETTE } from "@/lib/constants";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function MemberCard({
  teamId,
  member,
}: {
  teamId: string;
  member: { id: string; display_name: string; color: string };
}) {
  const [editing, setEditing] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  return (
    <Card radius="lg" p="md" withBorder>
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          {/* Avatar — click to change color */}
          <Popover
            opened={colorOpen}
            onChange={setColorOpen}
            position="bottom-start"
            withArrow
          >
            <Popover.Target>
              <button
                type="button"
                style={{
                  alignItems: "center",
                  backgroundColor: member.color,
                  border: "2px solid rgba(255, 255, 255, 0.9)",
                  borderRadius: "999px",
                  boxShadow: "0 0 0 1px rgba(20, 33, 18, 0.18)",
                  color: "white",
                  cursor: "pointer",
                  display: "inline-flex",
                  flexShrink: 0,
                  height: 32,
                  justifyContent: "center",
                  padding: 0,
                  width: 32,
                }}
                onClick={() => setColorOpen(true)}
                aria-label={`Byt färg för ${member.display_name}`}
              >
                <Text size="xs" fw={700} c="white">
                  {getInitials(member.display_name)}
                </Text>
              </button>
            </Popover.Target>
            <Popover.Dropdown>
              <SimpleGrid cols={6} spacing={6}>
                {MEMBER_PALETTE.map((color) => (
                  <ColorSwatch
                    key={color}
                    color={color}
                    size={28}
                    style={{ cursor: "pointer" }}
                    onClick={() => {
                      setColorOpen(false);
                      const fd = new FormData();
                      fd.set("teamId", teamId);
                      fd.set("memberId", member.id);
                      fd.set("color", color);
                      updateMemberColor(fd);
                    }}
                  />
                ))}
              </SimpleGrid>
            </Popover.Dropdown>
          </Popover>

          {/* Name — click to edit inline */}
          {editing ? (
            <form
              action={renameMember}
              onSubmit={() => setEditing(false)}
              style={{ flex: 1, minWidth: 0 }}
            >
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="memberId" value={member.id} />
              <Group gap={4} wrap="nowrap">
                <TextInput
                  ref={nameRef}
                  name="displayName"
                  size="sm"
                  defaultValue={member.display_name}
                  autoFocus
                  style={{ flex: 1 }}
                  onBlur={() => setEditing(false)}
                />
                <ActionIcon
                  type="submit"
                  variant="light"
                  color="green"
                  size="sm"
                >
                  <IconCheck size={14} />
                </ActionIcon>
              </Group>
            </form>
          ) : (
            <Text
              fw={600}
              size="sm"
              style={{
                cursor: "pointer",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              onClick={() => setEditing(true)}
            >
              {member.display_name}
            </Text>
          )}
        </Group>

        {/* Delete — bin icon */}
        <form action={deleteMember}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="memberId" value={member.id} />
          <ActionIcon
            type="submit"
            variant="subtle"
            color="red"
            size="sm"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </form>
      </Group>
    </Card>
  );
}
