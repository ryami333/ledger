import { deleteTransactionServerFn } from "../../../serverFunctions/deleteTransactionServerFn.ts";
import { ConfirmModal } from "../../ui/ConfirmModal.tsx";
import { Drawer } from "../../ui/Drawer.tsx";
import { Modal } from "../../ui/Modal.tsx";
import type {
  SpaceAlias,
  SpaceCurrency,
  SpaceMember,
  SpaceTransaction,
} from "./SpaceView.types.ts";
import { TransactionForm } from "./TransactionForm.tsx";
import { Text } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

/**
 * The drawer to add a transaction, or to change or delete a transaction
 * (`transaction` is not null). The delete opens a `ConfirmModal` on top of
 * the drawer, in one `Modal.Stack`. Thus Escape closes only the top layer.
 */
export function TransactionDrawer({
  isOpen,
  onRequestClose,
  formKey,
  locale,
  defaultTransactionDate,
  spaceId,
  members,
  aliases,
  spaceCurrencies,
  transaction,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  /** A new key each time the drawer opens. The form then starts again. */
  formKey: number;
  locale: string;
  defaultTransactionDate: string;
  spaceId: string;
  members: SpaceMember[];
  aliases: SpaceAlias[];
  spaceCurrencies: SpaceCurrency[];
  transaction: SpaceTransaction | null;
}) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // A close of the drawer, for example with the back button of the browser,
  // also closes the confirmation. The next open then shows only the drawer.
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setIsDeleteOpen(false);
  }

  const confirmDelete = async () => {
    if (!transaction) return;
    setDeleteError(null);
    setIsDeletePending(true);
    try {
      await deleteTransactionServerFn({
        data: { transactionId: transaction.id },
      });
      setIsDeleteOpen(false);
      onRequestClose();
      await router.invalidate();
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message
          : "The transaction cannot be deleted.",
      );
    } finally {
      setIsDeletePending(false);
    }
  };

  return (
    <Modal.Stack>
      <Drawer.Container
        isOpen={isOpen}
        onRequestClose={onRequestClose}
        stackId="transaction-drawer"
      >
        <TransactionForm
          key={formKey}
          onRequestClose={onRequestClose}
          onRequestDelete={() => {
            setDeleteError(null);
            setIsDeleteOpen(true);
          }}
          locale={locale}
          defaultTransactionDate={defaultTransactionDate}
          spaceId={spaceId}
          members={members}
          aliases={aliases}
          spaceCurrencies={spaceCurrencies}
          transaction={transaction}
        />
      </Drawer.Container>
      <ConfirmModal
        isOpen={isDeleteOpen}
        onRequestClose={() => setIsDeleteOpen(false)}
        stackId="transaction-delete"
        title={`Delete ${transaction?.title ?? "the transaction"}?`}
        description={
          <>
            The transaction goes away from the space, and the balances change.
            You cannot undo this.
            {deleteError && (
              <Text span c="red" display="block" mt="xs">
                {deleteError}
              </Text>
            )}
          </>
        }
        confirmLabel="Delete Transaction"
        cancelLabel="Cancel"
        closeLabel="Close"
        onConfirm={confirmDelete}
        isDestructive
        isConfirmPending={isDeletePending}
      />
    </Modal.Stack>
  );
}
