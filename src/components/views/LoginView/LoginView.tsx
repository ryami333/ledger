import { magicLinkRequestSchema } from "../../../core/forms/magicLinkRequestSchema.ts";
import { requestMagicLinkServerFn } from "../../../serverFunctions/requestMagicLinkServerFn.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Divider,
  Paper,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./LoginView.module.css";

const cx = classNames.bind(styles);

type MagicLinkFormInput = z.input<typeof magicLinkRequestSchema>;
type MagicLinkFormOutput = z.output<typeof magicLinkRequestSchema>;

const invalidLinkMessage =
  "The link is not valid or has expired. Ask for a new one.";

const errorMessages: Record<string, string> = {
  sign_in_failed: "The sign-in cannot start. Is the Pocket ID provider set up?",
  callback_failed: "The sign-in failed. Try again.",
  // The error codes of the magic-link verify endpoint of better-auth.
  magic_link_failed: invalidLinkMessage,
  INVALID_TOKEN: invalidLinkMessage,
  EXPIRED_TOKEN: invalidLinkMessage,
  user_not_found: invalidLinkMessage,
  new_user_signup_disabled: invalidLinkMessage,
  failed_to_create_session: "The sign-in failed. Try again.",
};

/**
 * The page `/login`: "Sign In with Pocket ID", and the magic-link form when
 * email is on (PLAN.md, D18).
 *
 * `oauthQuery` is the signed query of an MCP authorization. `/auth/sign-in`
 * sends it here when the magic link is on. The Pocket ID button then goes
 * back to `/auth/sign-in` with the query, and the magic link continues the
 * authorization.
 */
export function LoginView({
  next,
  error,
  oauthQuery,
  isMagicLinkEnabled,
}: {
  next?: string;
  error?: string;
  oauthQuery?: string;
  isMagicLinkEnabled: boolean;
}) {
  const signInHref = (() => {
    if (oauthQuery !== undefined) {
      return `/auth/sign-in?${oauthQuery}&sign_in_with=pocket-id`;
    }
    if (next) return `/auth/sign-in?next=${encodeURIComponent(next)}`;
    return "/auth/sign-in";
  })();
  const [isSent, setIsSent] = useState(false);
  const form = useForm<MagicLinkFormInput, unknown, MagicLinkFormOutput>({
    resolver: zodResolver(magicLinkRequestSchema),
    defaultValues: { email: "", next, oauthQuery },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (values: MagicLinkFormOutput): Promise<void> => {
    setIsSent(false);
    try {
      await requestMagicLinkServerFn({ data: values });
      setIsSent(true);
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error
            ? err.message
            : "The sign-in link cannot be sent. Try again.",
      });
    }
  };

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
            Sign In with Pocket ID
          </Button>
          {isMagicLinkEnabled ? (
            <>
              <Divider label="or" labelPosition="center" />
              <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
                <Stack gap="sm">
                  {isSent ? (
                    <Alert color="green" title="Check your email">
                      If ledger knows this address, you get an email with a
                      link. The link expires in 15 minutes.
                    </Alert>
                  ) : null}
                  {errors.root?.message ? (
                    <Alert color="red">{errors.root.message}</Alert>
                  ) : null}
                  <TextInput
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    error={errors.email?.message}
                    {...form.register("email")}
                  />
                  <Button
                    type="submit"
                    variant="default"
                    fullWidth
                    loading={isSubmitting}
                  >
                    Email Me a Sign-In Link
                  </Button>
                </Stack>
              </form>
            </>
          ) : null}
        </Stack>
      </Paper>
    </div>
  );
}
