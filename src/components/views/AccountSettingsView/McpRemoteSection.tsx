import { buildMcpRemoteDesktopConfig } from "../../../core/mcp/buildMcpRemoteDesktopConfig.ts";
import { useEntityModalState } from "../../../lib/useEntityModalState.ts";
import { createMcpRemoteClientServerFn } from "../../../serverFunctions/createMcpRemoteClientServerFn.ts";
import { deleteMcpRemoteClientServerFn } from "../../../serverFunctions/deleteMcpRemoteClientServerFn.ts";
import { ConfirmModal } from "../../ui/ConfirmModal.tsx";
import type { McpRemoteClient } from "./AccountSettingsView.types.ts";
import { AccountSection } from "./AccountSection.tsx";
import {
  Alert,
  Button,
  Code,
  CopyButton,
  Group,
  List,
  Stack,
  Text,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";

/**
 * The setup of mcp-remote (PLAN.md, D15), for a Claude organization that
 * does not allow custom connectors. The user makes an OAuth client here, and
 * gives its client ID to mcp-remote. mcp-remote then does not try Dynamic
 * Client Registration, which ledger does not have.
 */
export function McpRemoteSection({
  mcpUrl,
  locale,
  clients,
}: {
  mcpUrl: string;
  locale: string;
  clients: McpRemoteClient[];
}) {
  const router = useRouter();
  const [isCreatePending, setIsCreatePending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteModalState = useEntityModalState<McpRemoteClient>();
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const newestClient = clients.at(-1);

  const createClient = async () => {
    setErrorMessage(null);
    setIsCreatePending(true);
    try {
      await createMcpRemoteClientServerFn();
      await router.invalidate();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "The client cannot be created.",
      );
    } finally {
      setIsCreatePending(false);
    }
  };

  const confirmDelete = async () => {
    const selectedClient = deleteModalState.selectedEntity;
    if (!selectedClient) return;
    setDeleteError(null);
    setIsDeletePending(true);
    try {
      await deleteMcpRemoteClientServerFn({
        data: { clientId: selectedClient.clientId },
      });
      deleteModalState.close();
      await router.invalidate();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "The client cannot be deleted.",
      );
    } finally {
      setIsDeletePending(false);
    }
  };

  return (
    <AccountSection
      title="Connect Claude Desktop with mcp-remote"
      description="Use this setup when your Claude organization does not allow custom connectors. mcp-remote runs on your computer, and needs Node.js."
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
      <List type="ordered" spacing="xs" size="sm">
        <List.Item>Create a client. Each computer can have its own.</List.Item>
        <List.Item>
          In Claude Desktop, go to Settings, then Developer, and select Edit
          Config. Add the text below to <Code>claude_desktop_config.json</Code>.
          If the file has other servers, add only the entry <Code>ledger</Code>{" "}
          to <Code>mcpServers</Code>.
        </List.Item>
        <List.Item>
          Restart Claude Desktop. A browser opens. Sign in, then allow the
          access.
        </List.Item>
      </List>
      {newestClient ? (
        <Stack gap="xs">
          <Code block>
            {buildMcpRemoteDesktopConfig({
              mcpUrl,
              clientId: newestClient.clientId,
            })}
          </Code>
          <Group>
            <CopyButton
              value={buildMcpRemoteDesktopConfig({
                mcpUrl,
                clientId: newestClient.clientId,
              })}
            >
              {({ copied, copy }) => (
                <Button
                  variant={copied ? "light" : "filled"}
                  color={copied ? "teal" : undefined}
                  onClick={copy}
                >
                  {copied ? "Copied" : "Copy Config"}
                </Button>
              )}
            </CopyButton>
          </Group>
        </Stack>
      ) : null}
      {clients.length > 0 ? (
        <Stack gap="xs">
          <Text size="sm" fw={600}>
            Your clients
          </Text>
          {clients.map((client) => (
            <Group key={client.clientId} justify="space-between" wrap="nowrap">
              <Stack gap={0}>
                <Code>{client.clientId}</Code>
                {client.createdDate ? (
                  <Text size="xs" c="dimmed">
                    Created{" "}
                    {Temporal.PlainDate.from(client.createdDate).toLocaleString(
                      locale,
                      { dateStyle: "medium" },
                    )}
                  </Text>
                ) : null}
              </Stack>
              <Button
                variant="subtle"
                color="red"
                size="compact-sm"
                onClick={() => {
                  setDeleteError(null);
                  deleteModalState.open({ selectedEntity: client });
                }}
              >
                Delete Client
              </Button>
            </Group>
          ))}
        </Stack>
      ) : null}
      <Group>
        <Button
          variant={clients.length > 0 ? "default" : "filled"}
          onClick={() => void createClient()}
          loading={isCreatePending}
        >
          Create Client
        </Button>
      </Group>
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onRequestClose={deleteModalState.close}
        title="Delete the client?"
        description={
          <>
            {deleteError ? (
              <Text span c="red" fw={600}>
                {deleteError}{" "}
              </Text>
            ) : null}
            mcp-remote can no longer sign in with this client. Its access ends
            within one hour.
          </>
        }
        confirmLabel="Delete Client"
        cancelLabel="Cancel"
        closeLabel="Close"
        onConfirm={() => void confirmDelete()}
        isDestructive
        isConfirmPending={isDeletePending}
        stackId="mcp-remote-client-delete"
      />
    </AccountSection>
  );
}
