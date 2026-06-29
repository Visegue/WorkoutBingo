import { ActionIcon } from "@mantine/core";
import { IconHelpCircle } from "@tabler/icons-react";

export function HelpIconLink() {
  return (
    <ActionIcon
      component="a"
      href="/help"
      target="_blank"
      rel="noreferrer"
      size="xl"
      radius="xl"
      variant="light"
      color="green"
      aria-label="Öppna hjälp"
    >
      <IconHelpCircle size={30} stroke={2.4} />
    </ActionIcon>
  );
}
