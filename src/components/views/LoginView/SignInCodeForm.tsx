import {
  SIGN_IN_CODE_LENGTH,
  signInCodeSchema,
} from "../../../core/forms/signInCodeSchema.ts";
import { signInCodeRequestSchema } from "../../../core/forms/signInCodeRequestSchema.ts";
import { requestSignInCodeServerFn } from "../../../serverFunctions/requestSignInCodeServerFn.ts";
import { signInWithCodeServerFn } from "../../../serverFunctions/signInWithCodeServerFn.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Anchor,
  Button,
  Group,
  PinInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";

type RequestFormInput = z.input<typeof signInCodeRequestSchema>;
type RequestFormOutput = z.output<typeof signInCodeRequestSchema>;
type CodeFormInput = z.input<typeof signInCodeSchema>;
type CodeFormOutput = z.output<typeof signInCodeSchema>;

const errorText = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback;

/**
 * The sign-in with a code in an email (PLAN.md, D18), in two steps: the
 * email, then the code. The user types the code in this browser, thus the
 * email can be read on a different device (D18, rule 6).
 */
export function SignInCodeForm({
  next,
  oauthQuery,
}: {
  next?: string;
  oauthQuery?: string;
}) {
  const [sentToEmail, setSentToEmail] = useState<string | null>(null);

  if (sentToEmail === null) {
    return (
      <EmailStep
        oauthQuery={oauthQuery}
        onSent={(email) => setSentToEmail(email)}
      />
    );
  }
  return (
    <CodeStep
      email={sentToEmail}
      next={next}
      oauthQuery={oauthQuery}
      onRequestOtherEmail={() => setSentToEmail(null)}
    />
  );
}

function EmailStep({
  oauthQuery,
  onSent,
}: {
  oauthQuery?: string;
  onSent: (email: string) => void;
}) {
  const form = useForm<RequestFormInput, unknown, RequestFormOutput>({
    resolver: zodResolver(signInCodeRequestSchema),
    defaultValues: { email: "", oauthQuery },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (values: RequestFormOutput): Promise<void> => {
    try {
      await requestSignInCodeServerFn({ data: values });
      onSent(values.email);
    } catch (err) {
      form.setError("root", {
        message: errorText(err, "The sign-in code cannot be sent. Try again."),
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Stack gap="sm">
        {errors.root?.message ? (
          <Alert color="red">{errors.root.message}</Alert>
        ) : null}
        <TextInput
          label="Email"
          type="email"
          autoComplete="email"
          size="md"
          required
          autoFocus
          error={errors.email?.message}
          {...form.register("email")}
        />
        <Button type="submit" size="md" fullWidth loading={isSubmitting}>
          Email Me a Sign-In Code
        </Button>
      </Stack>
    </form>
  );
}

function CodeStep({
  email,
  next,
  oauthQuery,
  onRequestOtherEmail,
}: {
  email: string;
  next?: string;
  oauthQuery?: string;
  onRequestOtherEmail: () => void;
}) {
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const [resendError, setResendError] = useState<string | null>(null);
  const form = useForm<CodeFormInput, unknown, CodeFormOutput>({
    resolver: zodResolver(signInCodeSchema),
    defaultValues: { email, code: "", next, oauthQuery },
  });
  const { errors, isSubmitting, isSubmitSuccessful } = form.formState;

  const onSubmit = async (values: CodeFormOutput): Promise<void> => {
    try {
      const { redirectPath } = await signInWithCodeServerFn({ data: values });
      // A full page load: the authorize endpoint of an MCP authorization is
      // not a route of the router, and each page must read the new session.
      window.location.assign(redirectPath);
    } catch (err) {
      form.resetField("code");
      form.setError("root", {
        message: errorText(err, "The sign-in failed. Try again."),
      });
    }
  };

  const resend = async () => {
    setResendState("sending");
    setResendError(null);
    try {
      await requestSignInCodeServerFn({ data: { email, oauthQuery } });
      form.resetField("code");
      form.clearErrors("root");
      setResendState("sent");
    } catch (err) {
      setResendError(
        errorText(err, "The sign-in code cannot be sent. Try again."),
      );
      setResendState("failed");
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Stack gap="md">
        <Text size="sm">
          If ledger knows <strong>{email}</strong>, you get an email with a
          code. Type the code here. You can read the email on a different
          device.
        </Text>
        {errors.root?.message ? (
          <Alert color="red">{errors.root.message}</Alert>
        ) : null}
        {resendState === "sent" ? (
          <Alert color="green">
            We sent a new code. The old code no longer works.
          </Alert>
        ) : null}
        {resendError ? <Alert color="red">{resendError}</Alert> : null}
        <Controller
          control={form.control}
          name="code"
          render={({ field }) => (
            <Stack gap={4}>
              <Text component="label" size="sm" fw={500} id="sign-in-code">
                Sign-in code
              </Text>
              <PinInput
                length={SIGN_IN_CODE_LENGTH}
                type="number"
                size="md"
                oneTimeCode
                autoFocus
                aria-labelledby="sign-in-code"
                error={Boolean(errors.code)}
                value={field.value}
                onChange={field.onChange}
                onComplete={(completedCode) => {
                  // PinInput calls onComplete before onChange. Thus set the
                  // value first, so that the submit reads all the digits.
                  form.setValue("code", completedCode);
                  if (!form.formState.isSubmitting) {
                    void form.handleSubmit(onSubmit)();
                  }
                }}
              />
              {errors.code?.message ? (
                <Text size="xs" c="red">
                  {errors.code.message}
                </Text>
              ) : null}
            </Stack>
          )}
        />
        <Button
          type="submit"
          size="md"
          fullWidth
          loading={isSubmitting || isSubmitSuccessful}
        >
          Sign In
        </Button>
        <Group justify="space-between" gap="xs">
          <Anchor
            component="button"
            type="button"
            size="sm"
            onClick={onRequestOtherEmail}
          >
            Use a Different Email
          </Anchor>
          <Anchor
            component="button"
            type="button"
            size="sm"
            disabled={resendState === "sending"}
            onClick={() => {
              void resend();
            }}
          >
            Send a New Code
          </Anchor>
        </Group>
      </Stack>
    </form>
  );
}
