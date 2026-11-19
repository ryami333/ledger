import { removeUserServerFn } from "../../../serverFunctions/removeUserServerFn.ts";
import { useEntityModalState } from "../../../lib/useEntityModalState.ts";
import { ConfirmModal } from "../../ui/ConfirmModal.tsx";
import { EditGuestSpacesModal } from "./EditGuestSpacesModal.tsx";
import { InviteUserModal } from "./InviteUserModal.tsx";
import type { SpaceOption, UserRow } from "./UsersView.types.ts";
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
 * their role and spaces, invites a guest, changes the spaces of a guest
 * (D20), and removes a guest. A guest gets the state `"not-found"`.
 */
export function UsersView(
  props:
    | { state: "not-found" }
    | {
        state: "ready";
        locale: string;
        currentUserId: string;
        users: UserRow[];
        spaces: SpaceOption[];
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
      spaces={props.spaces}
    />
  );
}

function UserList({
  locale,
  currentUserId,
  users,
  spaces,
}: {
  locale: string;
  currentUserId: string;
  users: UserRow[];
  spaces: SpaceOption[];
}) {
  const router = useRouter();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const editSpacesModalState = useEntityModalState<UserRow>();
  const spaceTitles = new Map(spaces.map((space) => [space.id, space.title]));
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
        An admin signs in with Pocket ID, and reads and changes all spaces. A
        guest gets an invitation, and signs in with a code in an email. A guest
        reads and changes only the spaces that an admin gives the guest.
      </Text>
      <Table.ScrollContainer minWidth={560}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Role</Table.Th>
              <Table.Th>Spaces</Table.Th>
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
                  <SpacesCell
                    role={user.role}
                    spaceTitles={user.spaceIds.flatMap((spaceId) => {
                      const title = spaceTitles.get(spaceId);
                      return title === undefined ? [] : [title];
                    })}
                  />
                </Table.Td>
                <Table.Td>
                  {Temporal.PlainDate.from(user.createdDate).toLocaleString(
                    locale,
                    { dateStyle: "medium" },
                  )}
                </Table.Td>
                <Table.Td>
                  {user.role === "guest" && user.id !== currentUserId ? (
                    <Group gap="xs" wrap="nowrap" justify="flex-end">
                      <Button
                        variant="subtle"
                        size="compact-sm"
                        onClick={() =>
                          editSpacesModalState.open({ selectedEntity: user })
                        }
                      >
                        Edit Spaces
                      </Button>
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
                    </Group>
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
        spaces={spaces}
        onInvite={() => router.invalidate()}
      />
      <EditGuestSpacesModal
        key={editSpacesModalState.key}
        isOpen={editSpacesModalState.isOpen}
        onRequestClose={editSpacesModalState.close}
        guest={editSpacesModalState.selectedEntity}
        spaces={spaces}
        onSave={() => router.invalidate()}
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
            MCP connections, the spaces, and the linked members of the guest.
            The transactions of the guest stay.
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

/** The spaces of one user: "All spaces" for an admin (PLAN.md, D20). */
function SpacesCell({
  role,
  spaceTitles,
}: {
  role: UserRow["role"];
  spaceTitles: string[];
}) {
  if (role === "admin") {
    return (
      <Text size="sm" c="dimmed">
        All spaces
      </Text>
    );
  }
  if (spaceTitles.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No spaces
      </Text>
    );
  }
  return (
    <Group gap={4}>
      {spaceTitles.map((title) => (
        <Badge key={title} variant="outline" color="gray" tt="none">
          {title}
        </Badge>
      ))}
    </Group>
  );
}
