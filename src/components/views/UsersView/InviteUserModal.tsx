import { inviteUserSchema } from "../../../core/forms/inviteUserSchema.ts";
import { inviteUserServerFn } from "../../../serverFunctions/inviteUserServerFn.ts";
import { Modal } from "../../ui/Modal.tsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Stack, TextInput } from "@mantine/core";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./InviteUserModal.module.css";

const cx = classNames.bind(styles);

type InviteUserFormInput = z.input<typeof inviteUserSchema>;
type InviteUserFormOutput = z.output<typeof inviteUserSchema>;

const defaultValues: InviteUserFormInput = { name: "", email: "" };

/**
 * The invitation of a guest (PLAN.md, D19, rule 4): a name and an email.
 * ledger makes the guest and sends the invitation email. The modal closes
 * only after a successful send.
 */
export function InviteUserModal({
  isOpen,
  onRequestClose,
  onInvite,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  /** Runs after a successful invitation, for example to load the list again. */
  onInvite: () => Promise<void>;
}) {
  const form = useForm<InviteUserFormInput, unknown, InviteUserFormOutput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (values: InviteUserFormOutput): Promise<void> => {
    try {
      await inviteUserServerFn({ data: values });
      onRequestClose();
      form.reset(defaultValues);
      await onInvite();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "The invitation failed.",
      });
    }
  };

  return (
    <Modal.Container isOpen={isOpen} onRequestClose={onRequestClose}>
      <form
        className={cx("form")}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <Modal.Header closeLabel="Close">
          <Modal.Title>Invite a user</Modal.Title>
          <Modal.Description>
            The user gets an email with a link to the sign-in page, and signs in
            with a link in an email. The user is a guest.
          </Modal.Description>
        </Modal.Header>
        <Modal.Inner>
          <Stack gap="sm">
            {errors.root?.message ? (
              <Alert color="red">{errors.root.message}</Alert>
            ) : null}
            <TextInput
              label="Name"
              required
              data-autofocus
              error={errors.name?.message}
              {...form.register("name")}
            />
            <TextInput
              label="Email"
              type="email"
              required
              error={errors.email?.message}
              {...form.register("email")}
            />
          </Stack>
        </Modal.Inner>
        <Modal.Footer>
          <Button
            variant="default"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            Send Invitation
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Container>
  );
}
