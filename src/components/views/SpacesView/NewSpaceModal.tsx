import { getCurrencyOptions } from "../../../core/currencies/getCurrencyOptions.ts";
import { spaceFormSchema } from "../../../core/forms/spaceFormSchema.ts";
import { createSpaceServerFn } from "../../../serverFunctions/createSpaceServerFn.ts";
import { Modal } from "../../ui/Modal.tsx";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Select,
  Stack,
  TagsInput,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useNavigate } from "@tanstack/react-router";
import { Controller, useForm } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./NewSpaceModal.module.css";

const cx = classNames.bind(styles);

type SpaceFormInput = z.input<typeof spaceFormSchema>;
type SpaceFormOutput = z.output<typeof spaceFormSchema>;

const defaultValues: SpaceFormInput = {
  title: "",
  description: "",
  default_currency: "EUR",
  member_names: [],
};

/**
 * The "New space" modal: the title, the description, the default currency,
 * and the first member names (PLAN.md, UI). After the save, it opens the new
 * space.
 */
export function NewSpaceModal({
  isOpen,
  onRequestClose,
  locale,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  locale: string;
}) {
  const navigate = useNavigate();
  const form = useForm<SpaceFormInput, unknown, SpaceFormOutput>({
    resolver: zodResolver(spaceFormSchema),
    defaultValues,
  });
  const currencyOptions = getCurrencyOptions(locale);
  const { errors, isSubmitting } = form.formState;
  // The schema can refuse one name of the list. TagsInput shows one error.
  const memberNamesError =
    errors.member_names?.message ??
    (Array.isArray(errors.member_names)
      ? errors.member_names.find((nameError) => nameError?.message)?.message
      : undefined);

  const onSubmit = async (values: SpaceFormOutput): Promise<void> => {
    try {
      const { spaceSlug } = await createSpaceServerFn({ data: values });
      onRequestClose();
      form.reset(defaultValues);
      await navigate({ to: "/spaces/$spaceSlug", params: { spaceSlug } });
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error ? err.message : "The space cannot be made.",
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
          <Modal.Title>New space</Modal.Title>
        </Modal.Header>
        <Modal.Inner>
          <Stack gap="sm">
            {errors.root?.message && (
              <Alert color="red">{errors.root.message}</Alert>
            )}
            <TextInput
              label="Title"
              placeholder="Trip to Rome"
              required
              data-autofocus
              error={errors.title?.message}
              {...form.register("title")}
            />
            <Textarea
              label="Description"
              autosize
              minRows={2}
              error={errors.description?.message}
              {...form.register("description")}
            />
            <Controller
              control={form.control}
              name="default_currency"
              render={({ field }) => (
                <Select
                  label="Default currency"
                  description="The balances use this currency. You can add more currencies later."
                  required
                  searchable
                  selectFirstOptionOnChange
                  allowDeselect={false}
                  data={currencyOptions}
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  onBlur={field.onBlur}
                  error={errors.default_currency?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="member_names"
              render={({ field }) => (
                <TagsInput
                  label="Members"
                  description="Type a name, then push Enter."
                  placeholder="Barack"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={memberNamesError}
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
            Make Space
          </Button>
        </Modal.Footer>
      </form>
    </Modal.Container>
  );
}
