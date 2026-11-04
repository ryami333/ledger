import { formatAmount } from "../../../core/money/formatAmount.ts";
import { describeTransaction } from "../../../core/transactions/describeTransaction.ts";
import type {
  SpaceAlias,
  SpaceAliasMember,
  SpaceMember,
  SpaceTransaction,
} from "./SpaceView.types.ts";
import { Card, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { Temporal } from "temporal-polyfill";
import classNames from "classnames/bind";
import styles from "./TransactionList.module.css";

const cx = classNames.bind(styles);

/**
 * The transactions of the space, the newest first (PLAN.md, D11). Each row
 * links to the search param `transaction`, which opens the transaction
 * drawer. An amount in a different currency also shows the converted amount.
 */
export function TransactionList({
  locale,
  defaultCurrency,
  spaceId,
  members,
  aliases,
  aliasMembers,
  transactions,
}: {
  locale: string;
  defaultCurrency: string;
  spaceId: string;
  members: SpaceMember[];
  aliases: SpaceAlias[];
  aliasMembers: SpaceAliasMember[];
  transactions: SpaceTransaction[];
}) {
  return (
    <Stack gap="xs" component="section" aria-labelledby="transactions-title">
      <Title order={2} size="h3" id="transactions-title">
        Transactions
      </Title>
      {transactions.length === 0 ? (
        <Text c="dimmed" size="sm">
          No transactions yet.
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
                    search={{ transaction: transaction.id }}
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
    </Stack>
  );
}
