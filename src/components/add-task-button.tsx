"use client";

import { ActionIcon, Button, Modal, Stack, TextInput, Textarea } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { addTask } from "@/app/actions";

export function AddTaskButton({
  teamId,
  boardId,
  disabled,
}: {
  teamId: string;
  boardId: string;
  disabled?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <ActionIcon
        variant="filled"
        color="green"
        size="xl"
        radius="md"
        onClick={() => setOpened(true)}
        disabled={disabled}
        aria-label="Lägg till uppgifter"
      >
        <IconPlus size={22} stroke={2.5} />
      </ActionIcon>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Lägg till uppgift" centered>
        <Stack>
          <form ref={formRef} action={addTask}>
            <input type="hidden" name="teamId" value={teamId} />
            <input type="hidden" name="boardId" value={boardId} />
            <Stack>
              <TextInput
                name="title"
                label="Uppgift"
                placeholder="20 jongleringar"
                required
              />
              <Textarea name="description" label="Beskrivning" />
              <TextInput
                name="appearanceCount"
                label="Antal gånger på bingobrickan"
                type="number"
                min={1}
                defaultValue={1}
                required
              />
              <Button type="submit" color="green">
                Lägg till uppgift
              </Button>
            </Stack>
          </form>
        </Stack>
      </Modal>
    </>
  );
}
