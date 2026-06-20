"use client";

import { ActionIcon, Button, Modal, Stack, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { createMember } from "@/app/actions";

export function CreateMemberButton({ teamId }: { teamId: string }) {
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
          aria-label="Lägg till spelare"
        >
          <IconPlus size={22} stroke={2.5} />
        </ActionIcon>
      </div>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Ny spelare"
        centered
      >
        <form ref={formRef} action={createMember}>
          <input type="hidden" name="teamId" value={teamId} />
          <Stack>
            <TextInput
              name="displayName"
              label="Namn"
              required
              placeholder="Spelarnamn"
            />
            <Button type="submit" color="green">
              Lägg till spelare
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
