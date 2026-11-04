import { NewSpaceModal } from "./NewSpaceModal.tsx";
import type { SpaceSummary } from "./SpacesView.types.ts";
import classNames from "classnames/bind";
import {
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";
import styles from "./SpacesView.module.css";

const cx = classNames.bind(styles);

/** The page `/`: the spaces as cards, and the "New space" modal. */
export function SpacesView({
  locale,
  spaces,
}: {
  locale: string;
  spaces: SpaceSummary[];
}) {
  const [isNewSpaceOpen, setIsNewSpaceOpen] = useState(false);

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={1}>Spaces</Title>
        <Button onClick={() => setIsNewSpaceOpen(true)}>New space</Button>
      </Group>
      {spaces.length === 0 ? (
        <Text c="dimmed">
          No spaces yet. Make a space for a trip or a household.
        </Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {spaces.map((space) => (
            <Card
              key={space.id}
              withBorder
              className={cx("card")}
              renderRoot={(props) => (
                <Link
                  {...props}
                  to="/spaces/$spaceId"
                  params={{ spaceId: space.id }}
                />
              )}
            >
              <Stack gap={4}>
                <Text fw={600}>{space.title}</Text>
                {space.description && (
                  <Text size="sm" c="dimmed" lineClamp={2}>
                    {space.description}
                  </Text>
                )}
                <Text size="sm" c="dimmed">
                  {space.memberCount === 1
                    ? "1 member"
                    : `${space.memberCount} members`}
                  {" · "}
                  {space.lastTransactionDate
                    ? `Last transaction ${Temporal.PlainDate.from(
                        space.lastTransactionDate,
                      ).toLocaleString(locale, { dateStyle: "medium" })}`
                    : "No transactions"}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      )}
      <NewSpaceModal
        isOpen={isNewSpaceOpen}
        onRequestClose={() => setIsNewSpaceOpen(false)}
        locale={locale}
      />
    </Stack>
  );
}
