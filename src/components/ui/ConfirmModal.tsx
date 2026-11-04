import { Modal } from "./Modal.tsx";
import { Button } from "@mantine/core";
import { useId } from "react";

/**
 * A modal that asks the user to confirm an action. It is an `alertdialog`:
 * the description is its message, and the initial focus goes to Cancel.
 */
export function ConfirmModal({
  isOpen,
  onRequestClose,
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onConfirm,
  isDestructive = false,
  isConfirmPending = false,
  stackId,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** The accessible name of the close button (×). */
  closeLabel: string;
  onConfirm: () => void;
  /** Shows the confirm button as a destructive action, for example a delete. */
  isDestructive?: boolean;
  /** Disables both buttons, and keeps the modal open, while the action runs. */
  isConfirmPending?: boolean;
  stackId?: string;
}) {
  const descriptionId = useId();

  const requestCloseUnlessPending = () => {
    if (!isConfirmPending) onRequestClose();
  };

  return (
    <Modal.Container
      isOpen={isOpen}
      onRequestClose={requestCloseUnlessPending}
      role="alertdialog"
      aria={{ describedby: descriptionId }}
      stackId={stackId}
    >
      <Modal.Header closeLabel={closeLabel}>
        <Modal.Title>{title}</Modal.Title>
        <Modal.Description id={descriptionId}>{description}</Modal.Description>
      </Modal.Header>
      <Modal.Footer>
        <Button
          variant="default"
          onClick={requestCloseUnlessPending}
          disabled={isConfirmPending}
          data-autofocus
        >
          {cancelLabel}
        </Button>
        <Button
          color={isDestructive ? "red" : undefined}
          onClick={onConfirm}
          loading={isConfirmPending}
          disabled={isConfirmPending}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal.Container>
  );
}
