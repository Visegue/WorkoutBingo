"use client";

import { ActionIcon, Button, Modal, Paper, Stack, Text } from "@mantine/core";
import { IconFileImport, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { importTasksCsv } from "@/app/actions";

export function ImportTasksCsvButton({
  teamId,
  boardId,
  disabled,
}: {
  teamId: string;
  boardId: string;
  disabled?: boolean;
}) {
  const [opened, setOpened] = useState(false);
  const [fileName, setFileName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function setDroppedFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !inputRef.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFileName(file.name);
  }

  return (
    <>
      <ActionIcon
        variant="light"
        color="green"
        size="xl"
        radius="md"
        onClick={() => setOpened(true)}
        disabled={disabled}
        aria-label="Importera uppgifter från CSV"
      >
        <IconFileImport size={22} />
      </ActionIcon>
      <Modal opened={opened} onClose={() => setOpened(false)} title="Importera CSV" centered>
        <form action={importTasksCsv}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="boardId" value={boardId} />
          <Stack>
            <Text size="sm" c="dimmed">
              CSV:n ska ha kolumnerna Uppgift, beskrivning och antal. Beskrivning
              kan vara tom.
            </Text>
            <input
              ref={inputRef}
              name="csvFile"
              type="file"
              accept=".csv,text/csv"
              required
              style={{ display: "none" }}
              onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
            />
            <Paper
              component="button"
              type="button"
              withBorder
              radius="lg"
              p="xl"
              ta="center"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={setDroppedFile}
              style={{ cursor: "pointer" }}
            >
              <Stack align="center" gap="xs">
                <IconUpload size={34} />
                <Text fw={700}>Dra och släpp CSV-filen här</Text>
                <Text size="sm" c="dimmed">
                  eller klicka på ytan för att välja fil
                </Text>
                {fileName ? <Text size="sm">Vald fil: {fileName}</Text> : null}
              </Stack>
            </Paper>
            <Button type="submit" color="green">
              Importera uppgifter
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
