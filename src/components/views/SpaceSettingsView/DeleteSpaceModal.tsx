import { deleteSpaceServerFn } from "../../../serverFunctions/deleteSpaceServerFn.ts";
import { Modal } from "../../ui/Modal.tsx";
import type { SettingsSpace } from "./SpaceSettingsView.types.ts";
import { Alert, Button, Stack, TextInput } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { useId, useState } from "react";

/**
 * The confirmation of the delete of a space. The user must type the title of
 * the space. The initial focus goes to Cancel.
 */
export function DeleteSpaceModal({
  isOpen,
  onRequestClose,
  space,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  space: SettingsSpace;
}) {
  const navigate = useNavigate();
  const descriptionId = useId();
  const [typedTitle, setTypedTitle] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isTitleCorrect = typedTitle.trim() === space.title;

  const requestCloseUnlessPending = () => {
    if (!isPending) onRequestClose();
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    setIsPending(true);
    try {
      await deleteSpaceServerFn({ data: { spaceId: space.id } });
      onRequestClose();
      await navigate({ to: "/" });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "The space cannot be deleted.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal.Container
      isOpen={isOpen}
      onRequestClose={requestCloseUnlessPending}
      role="alertdialog"
      aria={{ describedby: descriptionId }}
    >
      <Modal.Header closeLabel="Close">
        <Modal.Title>Delete {space.title}?</Modal.Title>
        <Modal.Description id={descriptionId}>
          This deletes the space with all its members, aliases, currencies, and
          transactions. You cannot undo this.
        </Modal.Description>
      </Modal.Header>
      <Modal.Inner>
        <Stack gap="sm">
          {deleteError && <Alert color="red">{deleteError}</Alert>}
          <TextInput
            label={`Type "${space.title}" to confirm`}
            value={typedTitle}
            onChange={(event) => setTypedTitle(event.currentTarget.value)}
            disabled={isPending}
          />
        </Stack>
      </Modal.Inner>
      <Modal.Footer>
        <Button
          variant="default"
          onClick={requestCloseUnlessPending}
          disabled={isPending}
          data-autofocus
        >
          Cancel
        </Button>
        <Button
          color="red"
          onClick={confirmDelete}
          loading={isPending}
          disabled={!isTitleCorrect || isPending}
        >
          Delete Space
        </Button>
      </Modal.Footer>
    </Modal.Container>
  );
}
