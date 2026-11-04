import { memberFormSchema } from "../../../core/forms/memberFormSchema.ts";
import { saveMemberServerFn } from "../../../serverFunctions/saveMemberServerFn.ts";
import { Modal } from "../../ui/Modal.tsx";
import type { SettingsMember } from "./SpaceSettingsView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Stack, TextInput } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./RenameMemberModal.module.css";

const cx = classNames.bind(styles);

/** The modal to rename a member. Give it a new `key` each time it opens. */
export function RenameMemberModal({
  isOpen,
  onRequestClose,
  spaceId,
  member,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  spaceId: string;
  member: SettingsMember | null;
}) {
  const router = useRouter();
  const form = useForm<
    z.input<typeof memberFormSchema>,
    unknown,
    z.output<typeof memberFormSchema>
  >({
    resolver: zodResolver(memberFormSchema),
    defaultValues: { name: member?.name ?? "" },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (
    values: z.output<typeof memberFormSchema>,
  ): Promise<void> => {
    if (!member) return;
    try {
      await saveMemberServerFn({
        data: { ...values, spaceId, memberId: member.id },
      });
      onRequestClose();
      await router.invalidate();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error ? err.message : "The member cannot be saved.",
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
          <Modal.Title>Rename {member?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Inner>
          <Stack gap="sm">
            {errors.root?.message && (
              <Alert color="red">{errors.root.message}</Alert>
            )}
            <TextInput
              label="Name"
              required
              data-autofocus
              error={errors.name?.message}
              {...form.register("name")}
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
            Save
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Container>
  );
}
