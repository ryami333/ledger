import { Paper, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

/** One section of the settings page, with a title and an optional description. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper withBorder p="md" component="section">
      <Stack gap="md">
        <Stack gap={4}>
          <Title order={2} size="h3">
            {title}
          </Title>
          {description && (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
        {children}
      </Stack>
    </Paper>
  );
}
