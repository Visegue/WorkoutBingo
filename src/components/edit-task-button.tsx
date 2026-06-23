"use client";

import { Button, Modal, Stack, TextInput, Textarea } from "@mantine/core";
import { useState } from "react";
import { updateTask } from "@/app/actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  quantity: string | null;
  appearance_count: number;
};

export function EditTaskButton({
  teamId,
  boardId,
  task,
}: {
  teamId: string;
  boardId: string;
  task: Task;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button size="xs" variant="subtle" color="green" onClick={() => setOpened(true)}>
        Redigera
      </Button>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Redigera uppgift" centered>
        <form action={updateTask}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="boardId" value={boardId} />
          <input type="hidden" name="taskId" value={task.id} />
          <Stack>
            <TextInput
              name="title"
              label="Uppgift"
              defaultValue={task.title}
              required
            />
            <TextInput
              name="quantity"
              label="Mängd"
              defaultValue={task.quantity ?? ""}
              placeholder="30 st"
              description="Valfritt, t.ex. 5 km, 20 min eller 3 x 1 minut."
            />
            <Textarea
              name="description"
              label="Beskrivning"
              defaultValue={task.description ?? ""}
            />
            <TextInput
              name="appearanceCount"
              label="Antal gånger på bingobrickan"
              type="number"
              min={1}
              defaultValue={task.appearance_count}
              required
            />
            <Button type="submit" color="green">
              Spara uppgift
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
