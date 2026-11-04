import classNames from "classnames/bind";
import { Alert, Button, Paper, Stack, Title } from "@mantine/core";
import styles from "./LoginView.module.css";

const cx = classNames.bind(styles);

const errorMessages: Record<string, string> = {
  sign_in_failed: "The sign-in cannot start. Is the Pocket ID provider set up?",
  callback_failed: "The sign-in failed. Try again.",
};

/** The page `/login`: one button that starts the sign-in with Pocket ID. */
export function LoginView({ next, error }: { next?: string; error?: string }) {
  const signInHref = `/auth/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`;
  return (
    <div className={cx("page")}>
      <Paper className={cx("panel")} withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Title order={1}>ledger</Title>
          {error ? (
            <Alert color="red" title="Sign-in failed">
              {errorMessages[error] ?? errorMessages.callback_failed}
            </Alert>
          ) : null}
          <Button component="a" href={signInHref} size="md" fullWidth>
            Sign in with Pocket ID
          </Button>
        </Stack>
      </Paper>
    </div>
  );
}
