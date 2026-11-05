import { spaceDetailsFormSchema } from "../../../core/forms/spaceDetailsFormSchema.ts";
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
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { type z } from "zod";

/**
 * The title, the description, and the slug of the space. A new slug changes
 * the URL of the space, thus the page goes to the new URL.
 */
export function SpaceDetailsSection({ space }: { space: SettingsSpace }) {
  const router = useRouter();
  const navigate = useNavigate();
  const form = useForm<
    z.input<typeof spaceDetailsFormSchema>,
    unknown,
    z.output<typeof spaceDetailsFormSchema>
  >({
    resolver: zodResolver(spaceDetailsFormSchema),
    defaultValues: {
      title: space.title,
      description: space.description ?? "",
      slug: space.slug,
    },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = async (
    values: z.output<typeof spaceDetailsFormSchema>,
  ): Promise<void> => {
    try {
      await updateSpaceServerFn({ data: { ...values, spaceId: space.id } });
      if (values.slug === space.slug) {
        await router.invalidate();
      } else {
        await navigate({
          to: "/spaces/$spaceSlug/settings",
          params: { spaceSlug: values.slug },
          replace: true,
        });
      }
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
          <TextInput
            label="Slug"
            description="The name of the space in its URL, for example road-trip-2026."
            required
            error={errors.slug?.message}
            {...form.register("slug")}
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
