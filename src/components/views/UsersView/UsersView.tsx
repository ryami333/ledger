import { removeUserServerFn } from "../../../serverFunctions/removeUserServerFn.ts";
import { useEntityModalState } from "../../../lib/useEntityModalState.ts";
import { ConfirmModal } from "../../ui/ConfirmModal.tsx";
import { InviteUserModal } from "./InviteUserModal.tsx";
import type { UserRow } from "./UsersView.types.ts";
import {
  Badge,
  Button,
  Group,
  Stack,
  Table,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";

/**
 * The page `/users` (PLAN.md, D19, rule 3). An admin sees all users with
 * their role, invites a guest, and removes a guest. A guest gets the state
 * `"not-found"`.
 */
export function UsersView(
  props:
    | { state: "not-found" }
    | {
        state: "ready";
        locale: string;
        currentUserId: string;
        users: UserRow[];
      },
) {
  if (props.state === "not-found") {
    return (
      <Stack gap="md">
        <Title order={1}>Page not found</Title>
        <Text c="dimmed">This page does not exist.</Text>
      </Stack>
    );
  }
  return (
    <UserList
      locale={props.locale}
      currentUserId={props.currentUserId}
      users={props.users}
    />
  );
}

function UserList({
  locale,
  currentUserId,
  users,
}: {
  locale: string;
  currentUserId: string;
  users: UserRow[];
}) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const removeModalState = useEntityModalState<UserRow>();
  const [isRemovePending, setIsRemovePending] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const confirmRemove = async () => {
    const selectedUser = removeModalState.selectedEntity;
    if (!selectedUser) return;
    setRemoveError(null);
    setIsRemovePending(true);
    try {
      await removeUserServerFn({ data: { userId: selectedUser.id } });
      removeModalState.close();
      await router.invalidate();
    } catch (err) {
      setRemoveError(
        err instanceof Error ? err.message : "The guest cannot be removed.",
      );
    } finally {
      setIsRemovePending(false);
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={1}>Users</Title>
        <Button onClick={() => setIsInviteOpen(true)}>Invite User</Button>
      </Group>
      <Text c="dimmed" size="sm">
        An admin signs in with Pocket ID. A guest gets an invitation, and signs
        in with a link in an email. All users can read and change all spaces.
      </Text>
      <Table.ScrollContainer minWidth={560}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Since</Table.Th>
              <Table.Th>
                <VisuallyHidden>Actions</VisuallyHidden>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {users.map((user) => (
              <Table.Tr key={user.id}>
                <Table.Td>{user.name}</Table.Td>
                <Table.Td>{user.email}</Table.Td>
                <Table.Td>
                  <Badge
                    variant="light"
                    color={user.role === "admin" ? "blue" : "gray"}
                  >
                    {user.role === "admin" ? "Admin" : "Guest"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {Temporal.PlainDate.from(user.createdDate).toLocaleString(
                    locale,
                    { dateStyle: "medium" },
                  )}
                </Table.Td>
                <Table.Td>
                  {user.role === "guest" && user.id !== currentUserId ? (
                    <Button
                      variant="subtle"
                      color="red"
                      size="compact-sm"
                      onClick={() => {
                        setRemoveError(null);
                        removeModalState.open({ selectedEntity: user });
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <InviteUserModal
        isOpen={isInviteOpen}
        onRequestClose={() => setIsInviteOpen(false)}
        onInvite={() => router.invalidate()}
      />
      <ConfirmModal
        isOpen={removeModalState.isOpen}
        onRequestClose={removeModalState.close}
        title={`Remove ${removeModalState.selectedEntity?.name ?? "guest"}?`}
        description={
          <>
            {removeError ? (
              <Text span c="red" fw={600}>
                {removeError}{" "}
              </Text>
            ) : null}
            The guest can no longer sign in. This also removes the sessions, the
            MCP connections, and the linked members of the guest. The
            transactions of the guest stay.
          </>
        }
        confirmLabel="Remove Guest"
        cancelLabel="Cancel"
        closeLabel="Close"
        onConfirm={confirmRemove}
        isDestructive
        isConfirmPending={isRemovePending}
      />
    </Stack>
  );
}
