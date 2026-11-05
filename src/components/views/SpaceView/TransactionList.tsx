import { formatAmount } from "../../../core/money/formatAmount.ts";
import { describeTransaction } from "../../../core/transactions/describeTransaction.ts";
import type {
  SpaceAlias,
  SpaceAliasMember,
  SpaceMember,
  SpaceTransaction,
  TransactionFilterValues,
} from "./SpaceView.types.ts";
import { TransactionFilters } from "./TransactionFilters.tsx";
import { Card, Group, Pagination, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Temporal } from "temporal-polyfill";
import classNames from "classnames/bind";
import styles from "./TransactionList.module.css";

const cx = classNames.bind(styles);

/**
 * The transactions of the space, the newest first (PLAN.md, D11), with the
 * filters and the pagination. `transactions` is the current page only. Each
 * row links to the search param `transaction`, which opens the transaction
 * drawer. An amount in a different currency also shows the converted amount.
 */
export function TransactionList({
  locale,
  defaultCurrency,
  spaceId,
  members,
  aliases,
  aliasMembers,
  totalCount,
  filteredCount,
  transactions,
  filters,
  onFiltersChange,
  page,
  pageCount,
  onPageChange,
}: {
  locale: string;
  defaultCurrency: string;
  spaceId: string;
  members: SpaceMember[];
  aliases: SpaceAlias[];
  aliasMembers: SpaceAliasMember[];
  /** The number of transactions of the space, with no filter. */
  totalCount: number;
  /** The number of transactions that match the filters. */
  filteredCount: number;
  transactions: SpaceTransaction[];
  filters: TransactionFilterValues;
  onFiltersChange: React.ComponentProps<typeof TransactionFilters>["onChange"];
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const isFiltered = filteredCount !== totalCount;
  const countFormat = new Intl.NumberFormat(locale);
  return (
    <Stack gap="xs" component="section" aria-labelledby="transactions-title">
      <Group justify="space-between" align="baseline">
        <Title order={2} size="h3" id="transactions-title">
          Transactions
        </Title>
        {totalCount > 0 && (
          <Text c="dimmed" size="sm" aria-live="polite">
            {isFiltered
              ? `${countFormat.format(filteredCount)} of ${countFormat.format(totalCount)}`
              : countFormat.format(totalCount)}
          </Text>
        )}
      </Group>
      {totalCount > 0 && (
        <TransactionFilters filters={filters} onChange={onFiltersChange} />
      )}
      {transactions.length === 0 ? (
        <Text c="dimmed" size="sm">
          {totalCount === 0
            ? "No transactions yet."
            : "No transactions match the search and the dates."}
        </Text>
      ) : (
        <Card withBorder padding={0}>
          <ul className={cx("list")}>
            {transactions.map((transaction) => {
              const amount = formatAmount({
                amountMinor: transaction.amount_minor,
                currency: transaction.currency,
                locale,
              });
              const convertedAmount =
                transaction.currency === defaultCurrency
                  ? null
                  : formatAmount({
                      amountMinor: transaction.converted_amount_minor,
                      currency: defaultCurrency,
                      locale,
                    });
              return (
                <li key={transaction.id} className={cx("item")}>
                  <Link
                    className={cx("row")}
                    to="/spaces/$spaceId"
                    params={{ spaceId }}
                    search={(prev) => ({
                      ...prev,
                      transaction: transaction.id,
                    })}
                    resetScroll={false}
                  >
                    <span className={cx("date")}>
                      {Temporal.PlainDate.from(
                        transaction.transaction_date,
                      ).toLocaleString(locale, { dateStyle: "medium" })}
                    </span>
                    <span className={cx("main")}>
                      <span className={cx("title")}>{transaction.title}</span>
                      <span className={cx("summary")}>
                        {describeTransaction({
                          parties: transaction.parties,
                          members,
                          aliases,
                          aliasMembers,
                          locale,
                        })}
                      </span>
                    </span>
                    <span className={cx("amount")}>
                      {amount}
                      {convertedAmount && (
                        <span className={cx("convertedAmount")}>
                          {" "}
                          ({convertedAmount})
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {pageCount > 1 && (
        <Group justify="center">
          <Pagination
            total={pageCount}
            value={page}
            onChange={(nextPage) => {
              onPageChange(nextPage);
              document
                .getElementById("transactions-title")
                ?.scrollIntoView({ block: "start" });
            }}
            getControlProps={(control) => {
              if (control === "previous")
                return { "aria-label": "Previous page" };
              if (control === "next") return { "aria-label": "Next page" };
              return {};
            }}
          />
        </Group>
      )}
    </Stack>
  );
}
