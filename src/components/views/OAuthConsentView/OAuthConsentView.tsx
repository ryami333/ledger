import { describeOAuthRedirect } from "../../../core/auth/describeOAuthRedirect.ts";
import { ledgerScopeDescriptions } from "../../../core/mcp/ledgerScopes.ts";
import { submitOAuthConsentServerFn } from "../../../serverFunctions/submitOAuthConsentServerFn.ts";
import classNames from "classnames/bind";
import { useState } from "react";
import {
  Alert,
  Button,
  Group,
  List,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import styles from "./OAuthConsentView.module.css";

const cx = classNames.bind(styles);

/**
 * The page `/oauth/consent`: an MCP client, for example Claude, asks for
 * access to ledger (PLAN.md, D15). The user selects "Allow" or "Deny".
 */
export function OAuthConsentView({
  client,
  clientId,
  scopes,
  redirectUri,
  userName,
}: {
  client: { name: string | null; uri: string | null } | null;
  clientId: string;
  scopes: string[];
  redirectUri: string | null;
  userName: string;
}) {
  const [pendingAnswer, setPendingAnswer] = useState<"allow" | "deny" | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clientName = client?.name ?? clientId;
  const redirect =
    redirectUri === null ? null : describeOAuthRedirect(redirectUri);

  const answer = async (accept: boolean) => {
    setPendingAnswer(accept ? "allow" : "deny");
    setErrorMessage(null);
    try {
      // The signature covers the query as the browser got it.
      const oauthQuery = window.location.search.slice(1);
      const { url } = await submitOAuthConsentServerFn({
        data: { accept, oauthQuery },
      });
      window.location.assign(url);
    } catch {
      setErrorMessage(
        "The answer cannot be saved. The request can be too old: connect again from the app.",
      );
      setPendingAnswer(null);
    }
  };

  if (client === null) {
    return (
      <div className={cx("page")}>
        <Paper
          className={cx("panel")}
          withBorder
          shadow="sm"
          p="xl"
          radius="md"
        >
          <Stack gap="md">
            <Title order={1}>ledger</Title>
            <Alert color="red" title="Unknown app">
              ledger does not know this app. Connect again from the app.
            </Alert>
          </Stack>
        </Paper>
      </div>
    );
  }

  return (
    <div className={cx("page")}>
      <Paper className={cx("panel")} withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Title order={1}>Connect {clientName} to ledger</Title>
          <Text>
            {clientName} asks for access to ledger as {userName}. It can:
          </Text>
          <List>
            {scopes.map((scope) => (
              <List.Item key={scope}>
                {ledgerScopeDescriptions[scope] ?? scope}
              </List.Item>
            ))}
          </List>
          {redirect ? (
            <Text size="sm" c="dimmed">
              After your answer, the browser goes to{" "}
              <Text span fw={600}>
                {redirect.host}
              </Text>
              .
            </Text>
          ) : null}
          {redirect?.isLoopback ? (
            <Alert color="yellow" title="An app on this computer">
              The app runs on this computer, for example Claude Code. Allow
              access only if you started the connection.
            </Alert>
          ) : null}
          {errorMessage ? (
            <Alert color="red" title="Error">
              {errorMessage}
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => void answer(false)}
              loading={pendingAnswer === "deny"}
              disabled={pendingAnswer !== null}
            >
              Deny
            </Button>
            <Button
              onClick={() => void answer(true)}
              loading={pendingAnswer === "allow"}
              disabled={pendingAnswer !== null}
            >
              Allow
            </Button>
          </Group>
        </Stack>
      </Paper>
    </div>
  );
}
