import { guestSpacesSchema } from "../../../core/forms/guestSpacesSchema.ts";
import { setGuestSpacesServerFn } from "../../../serverFunctions/setGuestSpacesServerFn.ts";
import { Modal } from "../../ui/Modal.tsx";
import { GuestSpacesInput } from "./GuestSpacesInput.tsx";
import type { SpaceOption, UserRow } from "./UsersView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Stack } from "@mantine/core";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./EditGuestSpacesModal.module.css";

const cx = classNames.bind(styles);

type GuestSpacesFormInput = z.input<typeof guestSpacesSchema>;
type GuestSpacesFormOutput = z.output<typeof guestSpacesSchema>;

/**
 * The modal to change the spaces of a guest (PLAN.md, D20). Give it a new
 * `key` each time it opens. The modal closes only after a successful save.
 */
export function EditGuestSpacesModal({
  isOpen,
  onRequestClose,
  guest,
  spaces,
  onSave,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  /** The guest. It stays set after the close, for the fade-out. */
  guest: UserRow | null;
  /** All spaces, the options of the spaces input. */
  spaces: SpaceOption[];
  /** Runs after a successful save, for example to load the list again. */
  onSave: () => Promise<void>;
}) {
  const form = useForm<GuestSpacesFormInput, unknown, GuestSpacesFormOutput>({
    resolver: zodResolver(guestSpacesSchema),
    defaultValues: { space_ids: guest?.spaceIds ?? [] },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = async (values: GuestSpacesFormOutput): Promise<void> => {
    if (!guest) return;
    try {
      await setGuestSpacesServerFn({
        data: { ...values, userId: guest.id },
      });
      onRequestClose();
      await onSave();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error
            ? err.message
            : "The spaces of the guest cannot be saved.",
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
          <Modal.Title>Spaces of {guest?.name ?? "the guest"}</Modal.Title>
          <Modal.Description>
            A guest with no spaces can still sign in, but sees no space.
          </Modal.Description>
        </Modal.Header>
        <Modal.Inner>
          <Stack gap="sm">
            {errors.root?.message ? (
              <Alert color="red">{errors.root.message}</Alert>
            ) : null}
            <Controller
              control={form.control}
              name="space_ids"
              render={({ field }) => (
                <GuestSpacesInput
                  spaces={spaces}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.space_ids?.message}
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
            Save Spaces
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Container>
  );
}
