import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

/**
 * The page `/spaces/$spaceId`. Phase 5 of PLAN.md adds the balances panel,
 * the transaction list, and the transaction drawer.
 */
export function SpaceView({
  space,
}: {
  space: { id: string; title: string; description: string | null };
}) {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={1}>{space.title}</Title>
          {space.description && <Text c="dimmed">{space.description}</Text>}
        </Stack>
        <Button
          variant="default"
          renderRoot={(props) => (
            <Link
              {...props}
              to="/spaces/$spaceId/settings"
              params={{ spaceId: space.id }}
            />
          )}
        >
          Settings
        </Button>
      </Group>
      <Text c="dimmed">No transactions yet.</Text>
    </Stack>
  );
}
