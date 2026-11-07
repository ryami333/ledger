import { setDefaultSpaceServerFn } from "../../../serverFunctions/setDefaultSpaceServerFn.ts";
import { SettingsSection } from "./SettingsSection.tsx";
import { Alert, Badge, Button, Group, Text } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

/**
 * The default space of the signed-in user (PLAN.md, D17). An assistant such
 * as Claude adds a transaction to the default space when the user names no
 * space.
 */
export function DefaultSpaceSection({
  spaceId,
  isDefault,
}: {
  spaceId: string;
  isDefault: boolean;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setDefault = async ({ makeDefault }: { makeDefault: boolean }) => {
    setErrorMessage(null);
    setIsPending(true);
    try {
      await setDefaultSpaceServerFn({
        data: { spaceId: makeDefault ? spaceId : null },
      });
      await router.invalidate();
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "The default space cannot be saved.",
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <SettingsSection
      title="Default space"
      description="When you tell an assistant such as Claude about a payment and name no space, it adds the transaction to your default space. Each user has one default space."
    >
      {errorMessage && (
        <Alert
          color="red"
          withCloseButton
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}
      <Group justify="space-between">
        {isDefault ? (
          <Badge variant="light">Your default space</Badge>
        ) : (
          <Text size="sm" c="dimmed">
            This space is not your default space.
          </Text>
        )}
        <Button
          variant={isDefault ? "default" : "filled"}
          loading={isPending}
          onClick={() => setDefault({ makeDefault: !isDefault })}
        >
          {isDefault ? "Remove Default" : "Make Default"}
        </Button>
      </Group>
    </SettingsSection>
  );
}
