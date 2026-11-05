import { useEntityModalState } from "../../../lib/useEntityModalState.ts";
import { deleteAliasServerFn } from "../../../serverFunctions/deleteAliasServerFn.ts";
import { ConfirmModal } from "../../ui/ConfirmModal.tsx";
import { AliasModal } from "./AliasModal.tsx";
import { SettingsSection } from "./SettingsSection.tsx";
import type {
  SettingsAlias,
  SettingsMember,
} from "./SpaceSettingsView.types.ts";
import { Button, Group, Table, Text, Tooltip } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

/**
 * The aliases of the space: add, rename, change the members, and delete
 * (PLAN.md, D7). An alias with transactions cannot be deleted.
 */
export function AliasesSection({
  spaceId,
  members,
  aliases,
}: {
  spaceId: string;
  members: SettingsMember[];
  aliases: SettingsAlias[];
}) {
  const router = useRouter();
  const aliasModalState = useEntityModalState<SettingsAlias | null>();
  const deleteModalState = useEntityModalState<SettingsAlias>();
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const memberNames = new Map(
    members.map((member) => [member.id, member.name]),
  );

  const confirmDelete = async () => {
    const alias = deleteModalState.selectedEntity;
    if (!alias) return;
    setDeleteError(null);
    setIsDeletePending(true);
    try {
      await deleteAliasServerFn({ data: { aliasId: alias.id } });
      deleteModalState.close();
      await router.invalidate();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "The alias cannot be deleted.",
      );
    } finally {
      setIsDeletePending(false);
    }
  };

  return (
    <SettingsSection
      title="Aliases"
      description="An alias is a name for a set of members, for example a shared account. A transaction of an alias splits among its members."
    >
      {aliases.length === 0 ? (
        <Text c="dimmed" size="sm">
          No aliases yet.
        </Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Tbody>
            {aliases.map((alias) => {
              const isInUse = alias.transactionCount > 0;
              return (
                <Table.Tr key={alias.id}>
                  <Table.Td>
                    <Text>{alias.name}</Text>
                    <Text size="sm" c="dimmed">
                      {alias.memberIds
                        .map((memberId) => memberNames.get(memberId) ?? "?")
                        .toSorted((first, second) =>
                          first.localeCompare(second),
                        )
                        .join(", ")}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end" wrap="nowrap">
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        onClick={() =>
                          aliasModalState.open({ selectedEntity: alias })
                        }
                      >
                        Edit
                      </Button>
                      <Tooltip
                        label="The alias has transactions."
                        disabled={!isInUse}
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
                            deleteModalState.open({ selectedEntity: alias });
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
      <Group>
        <Button
          variant="default"
          disabled={members.length === 0}
          onClick={() => aliasModalState.open({ selectedEntity: null })}
        >
          Add Alias
        </Button>
      </Group>
      <AliasModal
        key={aliasModalState.key}
        isOpen={aliasModalState.isOpen}
        onRequestClose={aliasModalState.close}
        spaceId={spaceId}
        members={members}
        alias={aliasModalState.selectedEntity}
      />
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onRequestClose={deleteModalState.close}
        title={`Delete ${deleteModalState.selectedEntity?.name ?? "the alias"}?`}
        description={
          <>
            The alias goes away from the space. Its members stay. You cannot
            undo this.
            {deleteError && (
              <Text span c="red" display="block" mt="xs">
                {deleteError}
              </Text>
            )}
          </>
        }
        confirmLabel="Delete Alias"
        cancelLabel="Cancel"
        closeLabel="Close"
        onConfirm={confirmDelete}
        isDestructive
        isConfirmPending={isDeletePending}
      />
    </SettingsSection>
  );
}
