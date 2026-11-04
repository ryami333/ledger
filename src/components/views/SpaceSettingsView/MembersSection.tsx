import { memberFormSchema } from "../../../core/forms/memberFormSchema.ts";
import { useEntityModalState } from "../../../lib/useEntityModalState.ts";
import { deleteMemberServerFn } from "../../../serverFunctions/deleteMemberServerFn.ts";
import { saveMemberServerFn } from "../../../serverFunctions/saveMemberServerFn.ts";
import { setMemberArchivedServerFn } from "../../../serverFunctions/setMemberArchivedServerFn.ts";
import { ConfirmModal } from "../../ui/ConfirmModal.tsx";
import { RenameMemberModal } from "./RenameMemberModal.tsx";
import { SettingsSection } from "./SettingsSection.tsx";
import type { SettingsMember } from "./SpaceSettingsView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Badge,
  Button,
  Group,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";

/**
 * The members of the space: add, rename, archive, and delete (PLAN.md, D8).
 * A member with transactions or aliases cannot be deleted.
 */
export function MembersSection({
  spaceId,
  members,
}: {
  spaceId: string;
  members: SettingsMember[];
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null);
  const renameModalState = useEntityModalState<SettingsMember>();
  const deleteModalState = useEntityModalState<SettingsMember>();
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const addForm = useForm<
    z.input<typeof memberFormSchema>,
    unknown,
    z.output<typeof memberFormSchema>
  >({
    resolver: zodResolver(memberFormSchema),
    defaultValues: { name: "" },
  });

  const onAdd = async (values: z.output<typeof memberFormSchema>) => {
    try {
      await saveMemberServerFn({
        data: { ...values, spaceId, memberId: null },
      });
      addForm.reset({ name: "" });
      await router.invalidate();
    } catch (err) {
      addForm.setError("name", {
        message:
          err instanceof Error ? err.message : "The member cannot be saved.",
      });
    }
  };

  const toggleArchived = async (member: SettingsMember) => {
    setActionError(null);
    setPendingMemberId(member.id);
    try {
      await setMemberArchivedServerFn({
        data: { memberId: member.id, isArchived: !member.isArchived },
      });
      await router.invalidate();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "The member cannot be saved.",
      );
    } finally {
      setPendingMemberId(null);
    }
  };

  const confirmDelete = async () => {
    const member = deleteModalState.selectedEntity;
    if (!member) return;
    setDeleteError(null);
    setIsDeletePending(true);
    try {
      await deleteMemberServerFn({ data: { memberId: member.id } });
      deleteModalState.close();
      await router.invalidate();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "The member cannot be deleted.",
      );
    } finally {
      setIsDeletePending(false);
    }
  };

  return (
    <SettingsSection
      title="Members"
      description="An archived member does not show in the party picker of a new transaction. Only a member with no transactions and no aliases can be deleted."
    >
      {actionError && (
        <Alert color="red" withCloseButton onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {members.length === 0 ? (
        <Text c="dimmed" size="sm">
          No members yet.
        </Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Tbody>
            {members.map((member) => {
              const isInUse =
                member.transactionCount > 0 || member.aliasCount > 0;
              return (
                <Table.Tr key={member.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text c={member.isArchived ? "dimmed" : undefined}>
                        {member.name}
                      </Text>
                      {member.isArchived && (
                        <Badge variant="light" color="gray" size="sm">
                          Archived
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        onClick={() =>
                          renameModalState.open({ selectedEntity: member })
                        }
                      >
                        Rename
                      </Button>
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        loading={pendingMemberId === member.id}
                        onClick={() => toggleArchived(member)}
                      >
                        {member.isArchived ? "Restore" : "Archive"}
                      </Button>
                      <Tooltip
                        label="The member has transactions or aliases. Archive the member instead."
                        disabled={!isInUse}
                        multiline
                        w={240}
                      >
                        <Button
                          variant="subtle"
                          color="red"
                          size="compact-sm"
                          data-disabled={isInUse || undefined}
                          onClick={(event) => {
                            if (isInUse) {
                              event.preventDefault();
                              return;
                            }
                            setDeleteError(null);
                            deleteModalState.open({ selectedEntity: member });
                          }}
                        >
                          Delete
                        </Button>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
      <form onSubmit={addForm.handleSubmit(onAdd)} noValidate>
        <Group align="flex-start" gap="xs">
          <TextInput
            aria-label="Name of the new member"
            placeholder="Name of the new member"
            flex={1}
            error={addForm.formState.errors.name?.message}
            {...addForm.register("name")}
          />
          <Button type="submit" loading={addForm.formState.isSubmitting}>
            Add member
          </Button>
        </Group>
      </form>
      <>
        <RenameMemberModal
          key={renameModalState.key}
          isOpen={renameModalState.isOpen}
          onRequestClose={renameModalState.close}
          spaceId={spaceId}
          member={renameModalState.selectedEntity}
        />
        <ConfirmModal
          isOpen={deleteModalState.isOpen}
          onRequestClose={deleteModalState.close}
          title={`Delete ${deleteModalState.selectedEntity?.name ?? "the member"}?`}
          description={
            <>
              The member goes away from the space. You cannot undo this.
              {deleteError && (
                <Text span c="red" display="block" mt="xs">
                  {deleteError}
                </Text>
              )}
            </>
          }
          confirmLabel="Delete member"
          cancelLabel="Cancel"
          closeLabel="Close"
          onConfirm={confirmDelete}
          isDestructive
          isConfirmPending={isDeletePending}
        />
      </>
    </SettingsSection>
  );
}
