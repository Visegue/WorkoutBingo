"use client";

import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { createBoard } from "@/app/actions";

export function CreateBoardButton({ teamId }: { teamId: string }) {
  const [opened, setOpened] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <div style={{ marginLeft: "auto", flexShrink: 0 }}>
        <ActionIcon
          variant="filled"
          color="green"
          size="xl"
          radius="md"
          onClick={() => setOpened(true)}
          aria-label="Skapa ny bingobricka"
        >
          <IconPlus size={22} stroke={2.5} />
        </ActionIcon>
      </div>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Ny bingobricka"
        centered
      >
        <form ref={formRef} action={createBoard}>
          <input type="hidden" name="teamId" value={teamId} />
          <Stack>
            <TextInput
              name="title"
              label="Titel"
              required
              placeholder="Sommaren 2026"
            />
            <Group grow>
              <TextInput
                name="width"
                label="Bredd"
                type="number"
                min={2}
                max={10}
                defaultValue={5}
                required
              />
              <TextInput
                name="height"
                label="Höjd"
                type="number"
                min={2}
                max={10}
                defaultValue={5}
                required
              />
            </Group>
            <Textarea
              name="description"
              label="Beskrivning"
              placeholder="Vad ska spelarna göra i sommar?"
            />
            <TextInput
              name="endDate"
              label="Slutdatum"
              type="date"
              description="Valfritt. Efter detta datum stängs brickan för nya kryss."
            />
            <Button type="submit" color="green">
              Skapa utkast
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
