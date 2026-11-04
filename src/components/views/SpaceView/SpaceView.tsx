import { BalancesPanel } from "./BalancesPanel.tsx";
import type {
  SpaceAlias,
  SpaceAliasMember,
  SpaceBalance,
  SpaceCurrency,
  SpaceDetails,
  SpaceMember,
  SpaceTransaction,
} from "./SpaceView.types.ts";
import { TransactionDrawer } from "./TransactionDrawer.tsx";
import { TransactionList } from "./TransactionList.tsx";
import { Button, Group, Menu, Stack, Text, Title } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

/**
 * The page `/spaces/$spaceId` (PLAN.md, UI): the header, the balances panel,
 * the transaction list, and the transaction drawer.
 *
 * `openTransaction` is the search param `transaction`: the ID of the open
 * transaction, `"new"`, or `null` when the drawer is closed.
 */
export function SpaceView({
  locale,
  defaultTransactionDate,
  defaultCurrency,
  space,
  members,
  aliases,
  aliasMembers,
  spaceCurrencies,
  transactions,
  balances,
  openTransaction,
}: {
  locale: string;
  /** Today in `APP_TIME_ZONE`, as `YYYY-MM-DD`. */
  defaultTransactionDate: string;
  defaultCurrency: string;
  space: SpaceDetails;
  members: SpaceMember[];
  aliases: SpaceAlias[];
  aliasMembers: SpaceAliasMember[];
  spaceCurrencies: SpaceCurrency[];
  transactions: SpaceTransaction[];
  balances: SpaceBalance[];
  openTransaction: string | null;
}) {
  const navigate = useNavigate();
  const selectedTransaction =
    openTransaction === null || openTransaction === "new"
      ? null
      : (transactions.find(
          (transaction) => transaction.id === openTransaction,
        ) ?? null);
  const isDrawerOpen =
    openTransaction === "new" || selectedTransaction !== null;

  // The drawer keeps the last transaction while it slides out. Each open
  // gives a new form key, so the form starts again from its default values.
  const [drawerState, setDrawerState] = useState({
    wasOpen: isDrawerOpen,
    transaction: selectedTransaction,
    formKey: 0,
  });
  if (isDrawerOpen !== drawerState.wasOpen) {
    setDrawerState((current) => ({
      wasOpen: isDrawerOpen,
      transaction: isDrawerOpen ? selectedTransaction : current.transaction,
      formKey: isDrawerOpen ? current.formKey + 1 : current.formKey,
    }));
  } else if (
    isDrawerOpen &&
    selectedTransaction?.id !== drawerState.transaction?.id
  ) {
    setDrawerState((current) => ({
      ...current,
      transaction: selectedTransaction,
      formKey: current.formKey + 1,
    }));
  }

  const setOpenTransaction = (transaction: string | null) =>
    navigate({
      to: "/spaces/$spaceId",
      params: { spaceId: space.id },
      search: transaction === null ? {} : { transaction },
    });

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={1}>{space.title}</Title>
          {space.description && <Text c="dimmed">{space.description}</Text>}
        </Stack>
        <Group gap="xs">
          <Menu position="bottom-end">
            <Menu.Target>
              <Button variant="default">Edit space</Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                renderRoot={(props) => (
                  <Link
                    {...props}
                    to="/spaces/$spaceId/settings"
                    params={{ spaceId: space.id }}
                  />
                )}
              >
                Details, members, aliases, and currencies
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <Button
            disabled={members.length === 0}
            onClick={() => setOpenTransaction("new")}
          >
            Add transaction
          </Button>
        </Group>
      </Group>
      <BalancesPanel
        locale={locale}
        defaultCurrency={defaultCurrency}
        balances={balances}
      />
      <TransactionList
        locale={locale}
        defaultCurrency={defaultCurrency}
        spaceId={space.id}
        members={members}
        aliases={aliases}
        aliasMembers={aliasMembers}
        transactions={transactions}
      />
      <TransactionDrawer
        isOpen={isDrawerOpen}
        onRequestClose={() => setOpenTransaction(null)}
        formKey={drawerState.formKey}
        locale={locale}
        defaultTransactionDate={defaultTransactionDate}
        spaceId={space.id}
        members={members}
        aliases={aliases}
        spaceCurrencies={spaceCurrencies}
        transaction={drawerState.transaction}
      />
    </Stack>
  );
}
