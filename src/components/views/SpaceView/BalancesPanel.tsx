import { describeBalance } from "../../../core/balances/describeBalance.ts";
import type { SpaceBalance } from "./SpaceView.types.ts";
import { Card, Stack, Text, Title } from "@mantine/core";
import classNames from "classnames/bind";
import styles from "./BalancesPanel.module.css";

const cx = classNames.bind(styles);

/**
 * The balance of each member, in the default currency (PLAN.md, D10). The
 * server gives the balances in the order of D10.
 */
export function BalancesPanel({
  locale,
  defaultCurrency,
  balances,
}: {
  locale: string;
  defaultCurrency: string;
  balances: SpaceBalance[];
}) {
  return (
    <Card withBorder component="section" aria-labelledby="balances-title">
      <Stack gap="xs">
        <Title order={2} size="h3" id="balances-title">
          Balances
        </Title>
        {balances.length === 0 ? (
          <Text c="dimmed" size="sm">
            The space has no members yet. Add members in the settings.
          </Text>
        ) : (
          <ul className={cx("list")}>
            {balances.map((balance) => (
              <li
                key={balance.member_id}
                className={cx("balance")}
                data-direction={(() => {
                  if (balance.balance_minor > 0n) return "owed";
                  if (balance.balance_minor < 0n) return "owes";
                  return "settled";
                })()}
              >
                {describeBalance({
                  name: balance.name,
                  balanceMinor: balance.balance_minor,
                  currency: defaultCurrency,
                  locale,
                })}
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Card>
  );
}
