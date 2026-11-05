import { AliasesSection } from "./AliasesSection.tsx";
import { CurrenciesSection } from "./CurrenciesSection.tsx";
import { DangerZoneSection } from "./DangerZoneSection.tsx";
import { ImportSection } from "./ImportSection.tsx";
import { MembersSection } from "./MembersSection.tsx";
import { SpaceDetailsSection } from "./SpaceDetailsSection.tsx";
import type {
  SettingsAlias,
  SettingsCurrency,
  SettingsMember,
  SettingsSpace,
} from "./SpaceSettingsView.types.ts";
import { Anchor, Stack, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";

/**
 * The page `/spaces/$spaceSlug/settings`: the details, the members, the
 * aliases, and the currencies of a space, the CSV import, and the delete of
 * the space (PLAN.md, UI).
 */
export function SpaceSettingsView({
  locale,
  space,
  members,
  aliases,
  currencies,
}: {
  locale: string;
  space: SettingsSpace;
  members: SettingsMember[];
  aliases: SettingsAlias[];
  currencies: SettingsCurrency[];
}) {
  return (
    <Stack gap="xl">
      <Stack gap={4}>
        <Anchor
          size="sm"
          renderRoot={(props) => (
            <Link
              {...props}
              to="/spaces/$spaceSlug"
              params={{ spaceSlug: space.slug }}
            />
          )}
        >
          ← {space.title}
        </Anchor>
        <Title order={1}>Settings</Title>
      </Stack>
      <SpaceDetailsSection
        key={`${space.title}\n${space.description}\n${space.slug}`}
        space={space}
      />
      <MembersSection spaceId={space.id} members={members} />
      <AliasesSection spaceId={space.id} members={members} aliases={aliases} />
      <CurrenciesSection
        key={currencies
          .map((currency) => `${currency.currency}=${currency.rate}`)
          .join(",")}
        spaceId={space.id}
        locale={locale}
        currencies={currencies}
      />
      <ImportSection
        spaceId={space.id}
        spaceSlug={space.slug}
        locale={locale}
        defaultCurrency={
          currencies.find((currency) => currency.isDefault)?.currency ?? ""
        }
        members={members}
      />
      <DangerZoneSection space={space} />
    </Stack>
  );
}
