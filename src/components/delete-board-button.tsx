"use client";

import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { deleteBoard } from "@/app/actions";

export function DeleteBoardButton({
  teamId,
  boardId,
}: {
  teamId: string;
  boardId: string;
}) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button color="red" variant="light" onClick={() => setOpened(true)}>
        Ta bort bingobricka
      </Button>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Ta bort bingobricka"
        centered
      >
        <Stack>
          <Text size="sm">
            Är du säker? Detta tar bort brickan, alla uppgifter och alla kryss
            permanent. Det går inte att ångra.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setOpened(false)}>
              Avbryt
            </Button>
            <form action={deleteBoard}>
              <input type="hidden" name="teamId" value={teamId} />
              <input type="hidden" name="boardId" value={boardId} />
              <Button type="submit" color="red">
                Bekräfta borttagning
              </Button>
            </form>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
