import type { SpaceOption } from "./UsersView.types.ts";
import { MultiSelect } from "@mantine/core";

/**
 * The spaces of a guest, as pills (PLAN.md, D20). The list shows all spaces.
 * The invitation and "Edit Spaces" use it.
 */
export function GuestSpacesInput({
  spaces,
  value,
  onChange,
  onBlur,
  error,
}: {
  spaces: SpaceOption[];
  value: string[];
  onChange: (spaceIds: string[]) => void;
  onBlur: () => void;
  error: string | undefined;
}) {
  return (
    <MultiSelect
      label="Spaces"
      description="The guest reads and changes only these spaces."
      placeholder={value.length === 0 ? "No spaces" : undefined}
      nothingFoundMessage="No space has this name."
      searchable
      clearable
      hidePickedOptions
      selectFirstOptionOnChange
      data={spaces.map((space) => ({ value: space.id, label: space.title }))}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      error={error}
    />
  );
}
