"use client";

import { ActionIcon, Alert, Button, Modal, Paper, Stack, Text } from "@mantine/core";
import { IconFileImport, IconUpload } from "@tabler/icons-react";
import { useRef, useState } from "react";
import type { DragEvent, FormEvent } from "react";
import { importTasksCsvState } from "@/app/actions";

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
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function resetImport() {
    setFileName("");
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const result = await importTasksCsvState(
      { ok: false, error: null },
      new FormData(event.currentTarget),
    );

    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOpened(false);
    resetImport();
  }

  function setDroppedFile(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file || !inputRef.current) return;

    const transfer = new DataTransfer();
    transfer.items.add(file);
    inputRef.current.files = transfer.files;
    setFileName(file.name);
    setError(null);
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
      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setError(null);
        }}
        title="Importera CSV"
        centered
      >
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="boardId" value={boardId} />
          <Stack>
            {error ? (
              <Alert color="red" title="Importen misslyckades">
                {error}
              </Alert>
            ) : null}
            <Text size="sm" c="dimmed">
              CSV:n kan ha kolumnerna Uppgift, beskrivning och antal, eller
              Uppgift, beskrivning, mängd och antal. Beskrivning och mängd kan
              vara tomma.
            </Text>
            <input
              ref={inputRef}
              name="csvFile"
              type="file"
              accept=".csv,text/csv"
              required
              style={{ display: "none" }}
              onChange={(event) => {
                setFileName(event.currentTarget.files?.[0]?.name ?? "");
                setError(null);
              }}
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
            <Button type="submit" color="green" loading={pending} disabled={!fileName}>
              {pending ? "Importerar..." : "Importera uppgifter"}
            </Button>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
