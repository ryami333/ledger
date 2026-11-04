import { aliasFormSchema } from "../../../core/forms/aliasFormSchema.ts";
import { saveAliasServerFn } from "../../../serverFunctions/saveAliasServerFn.ts";
import { Modal } from "../../ui/Modal.tsx";
import type {
  SettingsAlias,
  SettingsMember,
} from "./SpaceSettingsView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, MultiSelect, Stack, TextInput } from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./AliasModal.module.css";

const cx = classNames.bind(styles);

type AliasFormInput = z.input<typeof aliasFormSchema>;
type AliasFormOutput = z.output<typeof aliasFormSchema>;

/**
 * The modal to add an alias, or to change an alias (`alias` is not null).
 * Give it a new `key` each time it opens.
 */
export function AliasModal({
  isOpen,
  onRequestClose,
  spaceId,
  members,
  alias,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  spaceId: string;
  members: SettingsMember[];
  alias: SettingsAlias | null;
}) {
  const router = useRouter();
  const form = useForm<AliasFormInput, unknown, AliasFormOutput>({
    resolver: zodResolver(aliasFormSchema),
    defaultValues: {
      name: alias?.name ?? "",
      member_ids: alias?.memberIds ?? [],
    },
  });
  const { errors, isSubmitting } = form.formState;
  // An archived member is an option only when the alias has the member.
  const memberOptions = members
    .filter(
      (member) => !member.isArchived || alias?.memberIds.includes(member.id),
    )
    .map((member) => ({ value: member.id, label: member.name }));

  const onSubmit = async (values: AliasFormOutput): Promise<void> => {
    try {
      await saveAliasServerFn({
        data: { ...values, spaceId, aliasId: alias?.id ?? null },
      });
      onRequestClose();
      await router.invalidate();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error ? err.message : "The alias cannot be saved.",
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
          <Modal.Title>
            {alias ? `Edit ${alias.name}` : "New alias"}
          </Modal.Title>
          {alias && alias.transactionCount > 0 && (
            <Modal.Description>
              A change of the members changes the balances of all transactions
              of this alias.
            </Modal.Description>
          )}
        </Modal.Header>
        <Modal.Inner>
          <Stack gap="sm">
            {errors.root?.message && (
              <Alert color="red">{errors.root.message}</Alert>
            )}
            <TextInput
              label="Name"
              placeholder="Shared account"
              required
              data-autofocus
              error={errors.name?.message}
              {...form.register("name")}
            />
            <Controller
              control={form.control}
              name="member_ids"
              render={({ field }) => (
                <MultiSelect
                  label="Members"
                  required
                  searchable
                  selectFirstOptionOnChange
                  data={memberOptions}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.member_ids?.message}
                />
              )}
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
            Save alias
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Container>
  );
}
