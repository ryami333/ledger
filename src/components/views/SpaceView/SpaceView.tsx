import { paginateItems } from "../../../core/pagination/paginateItems.ts";
import { filterTransactions } from "../../../core/transactions/filterTransactions.ts";
import { BalancesPanel } from "./BalancesPanel.tsx";
import type {
  SpaceAlias,
  SpaceAliasMember,
  SpaceBalance,
  SpaceCurrency,
  SpaceDetails,
  SpaceMember,
  SpaceTransaction,
  TransactionFilterValues,
} from "./SpaceView.types.ts";
import { TransactionDrawer } from "./TransactionDrawer.tsx";
import { TransactionList } from "./TransactionList.tsx";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Temporal } from "temporal-polyfill";

/** The number of transactions on one page of the transaction list. */
const TRANSACTIONS_PAGE_SIZE = 50;

/**
 * The page `/spaces/$spaceSlug` (PLAN.md, UI): the header, the balances panel,
 * the transaction list, and the transaction drawer.
 *
 * `openTransaction` is the search param `transaction`: the ID of the open
 * transaction, `"new"`, or `null` when the drawer is closed.
 * `transactionFilters` holds the other search params: the filters and the
 * page of the transaction list.
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
  transactionFilters,
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
  transactionFilters: TransactionFilterValues;
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

  // The drawer keeps the filters and the page of the transaction list.
  const setOpenTransaction = (transaction: string | null) =>
    navigate({
      to: "/spaces/$spaceSlug",
      params: { spaceSlug: space.slug },
      search: (prev) => ({ ...prev, transaction: transaction ?? undefined }),
      resetScroll: false,
    });

  const filteredTransactions = filterTransactions({
    transactions,
    searchText: transactionFilters.searchText,
    fromDate:
      transactionFilters.fromDate === null
        ? null
        : Temporal.PlainDate.from(transactionFilters.fromDate),
    toDate:
      transactionFilters.toDate === null
        ? null
        : Temporal.PlainDate.from(transactionFilters.toDate),
    defaultCurrency,
    locale,
  });
  const transactionPage = paginateItems({
    items: filteredTransactions,
    page: transactionFilters.page,
    pageSize: TRANSACTIONS_PAGE_SIZE,
  });

  // A change of a filter goes back to the first page. The search param of a
  // value with no effect goes away, so the URL stays short.
  const setTransactionFilters = (
    change: Partial<Omit<TransactionFilterValues, "page">>,
  ) => {
    const filters = { ...transactionFilters, ...change };
    return navigate({
      to: "/spaces/$spaceSlug",
      params: { spaceSlug: space.slug },
      search: (prev) => ({
        ...prev,
        query:
          filters.searchText.trim() === "" ? undefined : filters.searchText,
        from: filters.fromDate ?? undefined,
        to: filters.toDate ?? undefined,
        page: undefined,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  const setTransactionPage = (page: number) =>
    navigate({
      to: "/spaces/$spaceSlug",
      params: { spaceSlug: space.slug },
      search: (prev) => ({ ...prev, page: page === 1 ? undefined : page }),
      resetScroll: false,
    });

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={1}>{space.title}</Title>
          {space.description && <Text c="dimmed">{space.description}</Text>}
        </Stack>
        <Group gap="xs">
          <Button
            variant="default"
            renderRoot={(props) => (
              <Link
                {...props}
                to="/spaces/$spaceSlug/settings"
                params={{ spaceSlug: space.slug }}
              />
            )}
          >
            Space Settings
          </Button>
          <Button
            disabled={members.length === 0}
            onClick={() => setOpenTransaction("new")}
          >
            Add Transaction
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
        spaceSlug={space.slug}
        members={members}
        aliases={aliases}
        aliasMembers={aliasMembers}
        totalCount={transactions.length}
        filteredCount={filteredTransactions.length}
        transactions={transactionPage.pageItems}
        filters={transactionFilters}
        onFiltersChange={setTransactionFilters}
        page={transactionPage.page}
        pageCount={transactionPage.pageCount}
        onPageChange={setTransactionPage}
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
