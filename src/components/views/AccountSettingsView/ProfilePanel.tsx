import type { SessionUser } from "../../../server/getSessionUser.ts";
import { AccountSection } from "./AccountSection.tsx";
import { Badge, Group, Stack, Text } from "@mantine/core";

/** The tab "Profile" of the page `/account`. Nothing on it can change. */
export function ProfilePanel({ user }: { user: SessionUser }) {
  return (
    <AccountSection title="Profile">
      <Stack gap="xs">
        <Group gap="xs">
          <Text fw={500}>{user.name}</Text>
          <Badge
            variant="light"
            color={user.role === "admin" ? "blue" : "gray"}
          >
            {user.role === "admin" ? "Admin" : "Guest"}
          </Badge>
        </Group>
        <Text size="sm" c="dimmed">
          {user.email}
        </Text>
        <Text size="sm">
          {user.role === "admin"
            ? "You sign in with Pocket ID or with a code that ledger sends to your email."
            : "You sign in with a code that ledger sends to your email."}
        </Text>
      </Stack>
    </AccountSection>
  );
}
