import { resolveRedirectPath } from "../../../core/auth/resolveRedirectPath.ts";
import { Alert, Button, Paper, Stack, Text, Title } from "@mantine/core";
import classNames from "classnames/bind";
import styles from "./MagicLinkConfirmView.module.css";

const cx = classNames.bind(styles);

/**
 * The page `/auth/magic-link`: the link in the magic-link email opens it
 * (PLAN.md, D18, rule 4). One button sends the token to the verify endpoint
 * of better-auth with a GET form. A mail scanner opens the page, but does
 * not submit the form, thus the token stays valid.
 */
export function MagicLinkConfirmView({
  token,
  next,
}: {
  token?: string;
  next?: string;
}) {
  const callbackPath = resolveRedirectPath({ next, fallback: "/" });
  return (
    <div className={cx("page")}>
      <Paper className={cx("panel")} withBorder shadow="sm" p="xl" radius="md">
        <Stack gap="md">
          <Title order={1}>ledger</Title>
          {token ? (
            <form method="get" action="/api/auth/magic-link/verify">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="callbackURL" value={callbackPath} />
              <input type="hidden" name="errorCallbackURL" value="/login" />
              <Stack gap="md">
                <Text>Select the button to sign in. The link works once.</Text>
                <Button type="submit" size="md" fullWidth>
                  Sign In to ledger
                </Button>
              </Stack>
            </form>
          ) : (
            <Alert color="red" title="Sign-in failed">
              The link is not valid. Ask for a new one on the{" "}
              <a href="/login">sign-in page</a>.
            </Alert>
          )}
        </Stack>
      </Paper>
    </div>
  );
}
