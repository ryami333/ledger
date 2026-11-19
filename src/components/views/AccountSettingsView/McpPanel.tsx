import type { AccountSpace } from "./AccountSettingsView.types.ts";
import { AccountSection } from "./AccountSection.tsx";
import { CopyField } from "./CopyField.tsx";
import { SpacePreferencesSection } from "./SpacePreferencesSection.tsx";
import {
  Alert,
  Code,
  List,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";

/** Prompts to try after the connection, with the names of the seed data. */
const examplePrompts = [
  "Barack paid 90 euros for dinner with Donald.",
  "I paid 24 for the taxi, for me and Michelle.",
  "Kamala paid 60 for groceries for everyone.",
  "How much does Donald owe?",
  "Show the last five transactions.",
];

/**
 * The tab "MCP" of the page `/account` (PLAN.md, D15). It gives the URL of
 * the MCP server, the steps for each client, the choices that let Claude
 * understand "me" and "my space" (D16, D17), and prompts to try.
 */
export function McpPanel({
  mcpUrl,
  isLocalServer,
  spaces,
}: {
  mcpUrl: string;
  isLocalServer: boolean;
  spaces: AccountSpace[];
}) {
  const [client, setClient] = useState<"claude" | "claude-code">(
    isLocalServer ? "claude-code" : "claude",
  );
  const claudeCodeCommand = `claude mcp add --transport http ledger ${mcpUrl}`;

  return (
    <Stack gap="lg">
      <AccountSection
        title="Connect Claude"
        description="Tell Claude about a payment in your own words, and Claude adds the transaction to ledger. You connect one time, with no key or token."
      >
        <CopyField label="Server URL" value={mcpUrl} copyLabel="Copy URL" />
        {isLocalServer ? (
          <Alert color="yellow" title="Local server">
            The Claude apps cannot reach a server on your computer. Use Claude
            Code here, or the URL of the public server.
          </Alert>
        ) : null}
        <SegmentedControl
          value={client}
          onChange={(value) => {
            if (value === "claude" || value === "claude-code") {
              setClient(value);
            }
          }}
          data={[
            { value: "claude", label: "Claude (Web, Desktop, Mobile)" },
            { value: "claude-code", label: "Claude Code" },
          ]}
          fullWidth
        />
        {client === "claude" ? (
          <List type="ordered" spacing="xs" size="sm">
            <List.Item>
              Open claude.ai on a computer. Go to Settings, then Connectors.
            </List.Item>
            <List.Item>
              Add a custom connector. Enter the name <Code>ledger</Code> and the
              server URL above.
            </List.Item>
            <List.Item>
              Connect. ledger asks you to sign in, then asks you to allow the
              access.
            </List.Item>
            <List.Item>
              The connector then also works in Claude Desktop and in the Claude
              mobile app. You do not connect again there.
            </List.Item>
          </List>
        ) : (
          <Stack gap="sm">
            <Text size="sm">Run this command in a terminal:</Text>
            <CopyField
              label="Command"
              value={claudeCodeCommand}
              copyLabel="Copy Command"
            />
            <Text size="sm">
              Then start Claude Code, type <Code>/mcp</Code>, and select{" "}
              <Code>ledger</Code> to sign in.
            </Text>
          </Stack>
        )}
        <Text size="sm" c="dimmed">
          To sign in, ledger sends a code to your email. You can read the email
          on a different device, for example your phone.
        </Text>
      </AccountSection>
      <SpacePreferencesSection spaces={spaces} />
      <AccountSection
        title="Try it"
        description="After you connect, ask Claude for example:"
      >
        <List spacing="xs" size="sm">
          {examplePrompts.map((prompt) => (
            <List.Item key={prompt}>“{prompt}”</List.Item>
          ))}
        </List>
      </AccountSection>
    </Stack>
  );
}
