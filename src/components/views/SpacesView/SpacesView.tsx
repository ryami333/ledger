import { Stack, Text, Title } from "@mantine/core";

/**
 * The page `/`. Phase 4 of PLAN.md adds the list of the spaces and the "New
 * space" modal.
 */
export function SpacesView() {
  return (
    <Stack gap="md">
      <Title order={1}>Spaces</Title>
      <Text c="dimmed">No spaces yet.</Text>
    </Stack>
  );
}
