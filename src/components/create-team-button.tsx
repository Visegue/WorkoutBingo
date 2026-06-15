"use client";

import { ActionIcon, Button, Modal, Stack, TextInput } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { createTeam } from "@/app/actions";

export function CreateTeamButton() {
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
          aria-label="Skapa nytt lag"
        >
          <IconPlus size={22} stroke={2.5} />
        </ActionIcon>
      </div>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Nytt lag"
        centered
        withinPortal={false}
      >
        <form ref={formRef} action={createTeam}>
          <Stack>
            <TextInput
              name="name"
              label="Lagnamn"
              required
              placeholder="Flickor 2013"
            />
            <Button type="submit" color="green">
              Skapa som ledare
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
