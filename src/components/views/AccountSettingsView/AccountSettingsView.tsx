import type { SessionUser } from "../../../server/getSessionUser.ts";
import type {
  AccountSettingsTab,
  AccountSpace,
} from "./AccountSettingsView.types.ts";
import { McpPanel } from "./McpPanel.tsx";
import { ProfilePanel } from "./ProfilePanel.tsx";
import { Stack, Tabs, Title } from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";

/**
 * The page `/account`: the profile of the signed-in user, and the tab "MCP",
 * which tells how to connect an MCP client such as Claude (PLAN.md, D15).
 * The search param `tab` holds the open tab, so a link can open it.
 */
export function AccountSettingsView({
  tab,
  user,
  mcpUrl,
  isLocalServer,
  spaces,
}: {
  tab: AccountSettingsTab;
  user: SessionUser;
  mcpUrl: string;
  isLocalServer: boolean;
  spaces: AccountSpace[];
}) {
  const navigate = useNavigate();

  return (
    <Stack gap="lg">
      <Title order={1}>Account settings</Title>
      <Tabs
        value={tab}
        onChange={(value) => {
          if (value === "profile" || value === "mcp") {
            void navigate({
              to: "/account",
              search: { tab: value },
              replace: true,
            });
          }
        }}
      >
        <Tabs.List>
          <Tabs.Tab value="profile">Profile</Tabs.Tab>
          <Tabs.Tab value="mcp">MCP</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="profile" pt="lg">
          <ProfilePanel user={user} />
        </Tabs.Panel>
        <Tabs.Panel value="mcp" pt="lg">
          <McpPanel
            mcpUrl={mcpUrl}
            isLocalServer={isLocalServer}
            spaces={spaces}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
