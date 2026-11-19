import { setDefaultSpaceServerFn } from "../../../serverFunctions/setDefaultSpaceServerFn.ts";
import { setLinkedMemberServerFn } from "../../../serverFunctions/setLinkedMemberServerFn.ts";
import type { AccountSpace } from "./AccountSettingsView.types.ts";
import { AccountSection } from "./AccountSection.tsx";
import { Alert, Select, Stack, Text } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/**
 * The default space (PLAN.md, D17) and the linked member in each space
 * (D16) of the signed-in user, on one form. With these, Claude knows which
 * space "I paid 20 for lunch" means, and who "I" is.
 */
export function SpacePreferencesSection({
  spaces,
}: {
  spaces: AccountSpace[];
}) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const defaultSpaceId = spaces.find((space) => space.isDefault)?.id ?? null;

  const save = async ({
    key,
    action,
    fallbackMessage,
  }: {
    key: string;
    action: () => Promise<void>;
    fallbackMessage: string;
  }) => {
    setErrorMessage(null);
    setPendingKey(key);
    try {
      await action();
      await router.invalidate();
    } catch (err) {
      setErrorMessage(errorText(err, fallbackMessage));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <AccountSection
      title="Get ready for Claude"
      description="Answer these two questions here, so that Claude does not ask them later."
    >
      {errorMessage ? (
        <Alert
          color="red"
          withCloseButton
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      ) : null}
      {spaces.length === 0 ? (
        <Text size="sm" c="dimmed">
          There are no spaces yet. Make a space first.
        </Text>
      ) : (
        <Stack gap="lg">
          <Select
            label="Default space"
            description="Claude uses this space when you name no space."
            placeholder="No default space"
            data={spaces.map((space) => ({
              value: space.id,
              label: space.title,
            }))}
            value={defaultSpaceId}
            clearable
            allowDeselect={false}
            disabled={pendingKey === "default"}
            onChange={(spaceId) =>
              save({
                key: "default",
                action: () => setDefaultSpaceServerFn({ data: { spaceId } }),
                fallbackMessage: "The default space cannot be saved.",
              })
            }
          />
          <Stack gap="sm">
            <Stack gap={2}>
              <Text size="sm" fw={500}>
                Who are you in each space?
              </Text>
              <Text size="xs" c="dimmed">
                Claude then understands “me” and “I”, for example in “Michelle
                paid for me”.
              </Text>
            </Stack>
            {spaces.map((space) => (
              <Select
                key={space.id}
                label={space.title}
                placeholder="Not selected"
                data={space.members.map((member) => ({
                  value: member.id,
                  label: member.isLinkedToOtherUser
                    ? `${member.name} (a different user)`
                    : member.name,
                  disabled: member.isLinkedToOtherUser,
                }))}
                value={space.linkedMemberId}
                clearable
                allowDeselect={false}
                searchable={space.members.length > 8}
                disabled={pendingKey === space.id}
                onChange={(memberId) =>
                  save({
                    key: space.id,
                    action: () =>
                      setLinkedMemberServerFn({
                        data: { spaceId: space.id, memberId },
                      }),
                    fallbackMessage: "The member cannot be saved.",
                  })
                }
              />
            ))}
          </Stack>
        </Stack>
      )}
    </AccountSection>
  );
}
