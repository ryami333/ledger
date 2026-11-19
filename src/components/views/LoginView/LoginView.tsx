import { SignInCodeForm } from "./SignInCodeForm.tsx";
import {
  Alert,
  Anchor,
  Button,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import classNames from "classnames/bind";
import styles from "./LoginView.module.css";

const cx = classNames.bind(styles);

const errorMessages: Record<string, string> = {
  sign_in_failed: "The sign-in cannot start. Is the Pocket ID provider set up?",
  callback_failed: "The sign-in failed. Try again.",
};

/**
 * The page `/login` (PLAN.md, D18). The main sign-in is a code in an email.
 * "Sign In with Pocket ID" is a small link at the end, for the admins. With
 * no email (no API key of Resend), Pocket ID is the only sign-in, and the
 * page shows it as a button.
 *
 * `oauthQuery` is the signed query of an MCP authorization. `/auth/sign-in`
 * sends it here when email is on. The Pocket ID link then goes back to
 * `/auth/sign-in` with the query, and a sign-in with a code continues the
 * authorization.
 */
export function LoginView({
  next,
  error,
  oauthQuery,
  isSignInCodeEnabled,
}: {
  next?: string;
  error?: string;
  oauthQuery?: string;
  isSignInCodeEnabled: boolean;
}) {
  const pocketIdHref = (() => {
    if (oauthQuery !== undefined) {
      return `/auth/sign-in?${oauthQuery}&sign_in_with=pocket-id`;
    }
    if (next) return `/auth/sign-in?next=${encodeURIComponent(next)}`;
    return "/auth/sign-in";
  })();

  return (
    <div className={cx("page")}>
      <Paper className={cx("panel")} withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={1}>ledger</Title>
            <Text c="dimmed" size="sm">
              {oauthQuery === undefined
                ? "Sign in to see your spaces."
                : "Sign in to connect an app, for example Claude, to ledger."}
            </Text>
          </Stack>
          {error ? (
            <Alert color="red" title="Sign-in failed">
              {errorMessages[error] ?? errorMessages.callback_failed}
            </Alert>
          ) : null}
          {isSignInCodeEnabled ? (
            <SignInCodeForm next={next} oauthQuery={oauthQuery} />
          ) : (
            <Button component="a" href={pocketIdHref} size="md" fullWidth>
              Sign In with Pocket ID
            </Button>
          )}
        </Stack>
      </Paper>
      {isSignInCodeEnabled ? (
        <Text className={cx("adminLink")} size="xs" c="dimmed">
          Admin?{" "}
          <Anchor href={pocketIdHref} size="xs" inherit>
            Sign In with Pocket ID
          </Anchor>
        </Text>
      ) : null}
    </div>
  );
}
