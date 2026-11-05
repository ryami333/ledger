import { spaceFormSchema } from "../../../core/forms/spaceFormSchema.ts";
import { updateSpaceServerFn } from "../../../serverFunctions/updateSpaceServerFn.ts";
import { SettingsSection } from "./SettingsSection.tsx";
import type { SettingsSpace } from "./SpaceSettingsView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  Stack,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { type z } from "zod";

const spaceDetailsSchema = spaceFormSchema.pick({
  title: true,
  description: true,
});

/** The title and the description of the space. */
export function SpaceDetailsSection({ space }: { space: SettingsSpace }) {
  const router = useRouter();
  const form = useForm<
    z.input<typeof spaceDetailsSchema>,
    unknown,
    z.output<typeof spaceDetailsSchema>
  >({
    resolver: zodResolver(spaceDetailsSchema),
    defaultValues: { title: space.title, description: space.description ?? "" },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = async (
    values: z.output<typeof spaceDetailsSchema>,
  ): Promise<void> => {
    try {
      await updateSpaceServerFn({ data: { ...values, spaceId: space.id } });
      await router.invalidate();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error ? err.message : "The space cannot be saved.",
      });
    }
  };

  return (
    <SettingsSection title="Details">
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          {errors.root?.message && (
            <Alert color="red">{errors.root.message}</Alert>
          )}
          <TextInput
            label="Title"
            required
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
          <Group justify="flex-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save Details
            </Button>
          </Group>
        </Stack>
      </form>
    </SettingsSection>
  );
}
