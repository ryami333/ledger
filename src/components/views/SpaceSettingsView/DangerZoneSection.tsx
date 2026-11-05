import { DeleteSpaceModal } from "./DeleteSpaceModal.tsx";
import { SettingsSection } from "./SettingsSection.tsx";
import type { SettingsSpace } from "./SpaceSettingsView.types.ts";
import { Button, Group } from "@mantine/core";
import { useState } from "react";

/** The delete of the space. The confirmation asks for the title of the space. */
export function DangerZoneSection({ space }: { space: SettingsSpace }) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  return (
    <SettingsSection
      title="Danger zone"
      description="A delete of the space deletes all its members, aliases, currencies, and transactions."
    >
      <Group>
        <Button
          color="red"
          variant="outline"
          onClick={() => setIsDeleteOpen(true)}
        >
          Delete Space
        </Button>
      </Group>
      <DeleteSpaceModal
        isOpen={isDeleteOpen}
        onRequestClose={() => setIsDeleteOpen(false)}
        space={space}
      />
    </SettingsSection>
  );
}
