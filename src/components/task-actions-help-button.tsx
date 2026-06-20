"use client";

import { ActionIcon, Group, Modal, Stack, Text } from "@mantine/core";
import {
  IconAdjustments,
  IconFileImport,
  IconHelp,
  IconPlus,
  IconRefresh,
  IconWand,
} from "@tabler/icons-react";
import { useState } from "react";

export function TaskActionsHelpButton({ isDraft }: { isDraft: boolean }) {
  const [opened, setOpened] = useState(false);

  return (
    <>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="xl"
        radius="md"
        onClick={() => setOpened(true)}
        aria-label="Visa knappförklaring"
      >
        <IconHelp size={22} />
      </ActionIcon>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Knappförklaring" centered>
        <Stack gap="sm">
          {isDraft ? (
            <Group gap="sm" wrap="nowrap">
              <IconPlus size={18} />
              <Text size="sm">Lägg till en uppgift.</Text>
            </Group>
          ) : null}
          {isDraft ? (
            <Group gap="sm" wrap="nowrap">
              <IconFileImport size={18} />
              <Text size="sm">Importera flera uppgifter från CSV.</Text>
            </Group>
          ) : null}
          {isDraft ? (
            <Group gap="sm" wrap="nowrap">
              <IconWand size={18} />
              <Text size="sm">Autofyll tomma rutor med exempeluppgifter.</Text>
            </Group>
          ) : null}
          {isDraft ? (
            <Group gap="sm" wrap="nowrap">
              <IconAdjustments size={18} />
              <Text size="sm">Anpassa antal så uppgifterna matchar antalet rutor.</Text>
            </Group>
          ) : null}
          <Group gap="sm" wrap="nowrap">
            <IconRefresh size={18} />
            <Text size="sm">
              {isDraft
                ? "Generera bingobrickan när uppgifterna fyller alla rutor."
                : "Nollställ framsteg och lås upp brickan som utkast."}
            </Text>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
