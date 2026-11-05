import { isSupportedCurrency } from "../../../core/currencies/isSupportedCurrency.ts";
import { transactionFormSchema } from "../../../core/forms/transactionFormSchema.ts";
import { formatAmountInput } from "../../../core/money/formatAmountInput.ts";
import { getCurrencyDecimals } from "../../../core/money/getCurrencyDecimals.ts";
import { parseAmount } from "../../../core/money/parseAmount.ts";
import {
  type CustomSplit,
  customSplitFromShares,
  resolveCustomSplit,
} from "../../../core/splits/customSplitHelpers.ts";
import { describeTransactionPreview } from "../../../core/transactions/describeTransactionPreview.ts";
import { getPartyName } from "../../../core/transactions/getPartyName.ts";
import {
  parsePartyValue,
  toPartyRow,
  toPartyValue,
} from "../../../core/transactions/partyValueHelpers.ts";
import { saveTransactionServerFn } from "../../../serverFunctions/saveTransactionServerFn.ts";
import { Drawer } from "../../ui/Drawer.tsx";
import { CustomSplitModal } from "./CustomSplitModal.tsx";
import type {
  SpaceAlias,
  SpaceCurrency,
  SpaceMember,
  SpaceTransaction,
} from "./SpaceView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./TransactionForm.module.css";

const cx = classNames.bind(styles);

type TransactionFormInput = z.input<typeof transactionFormSchema>;
type TransactionFormOutput = z.output<typeof transactionFormSchema>;

type SplitSide = "paid_by" | "paid_for";

const SIDE_LABELS: Record<SplitSide, string> = {
  paid_by: "Paid by",
  paid_for: "Paid for",
};

/** Converts the values of a party picker to party rows for the preview. */
const toPartyRows = (values: readonly string[]) =>
  values.flatMap((value) => {
    const reference = parsePartyValue(value);
    return reference === null ? [] : [toPartyRow(reference)];
  });

/**
 * The form of the transaction drawer (PLAN.md, UI). It adds a transaction,
 * or changes a transaction when `transaction` is not null. Give it a new
 * `key` each time the drawer opens.
 *
 * An archived member is an option only when the transaction has the member
 * (D8).
 */
export function TransactionForm({
  onRequestClose,
  onRequestDelete,
  locale,
  defaultTransactionDate,
  spaceId,
  members,
  aliases,
  spaceCurrencies,
  transaction,
}: {
  onRequestClose: () => void;
  onRequestDelete: () => void;
  locale: string;
  defaultTransactionDate: string;
  spaceId: string;
  members: SpaceMember[];
  aliases: SpaceAlias[];
  /** The default currency comes first. */
  spaceCurrencies: SpaceCurrency[];
  transaction: SpaceTransaction | null;
}) {
  const router = useRouter();
  const partiesOfSide = (side: SplitSide) =>
    (transaction?.parties ?? []).filter((party) => party.side === side);
  const partyValuesOfSide = (side: SplitSide) =>
    partiesOfSide(side).map(toPartyValue);
  // A saved custom split opens in the mode "amount", in the order of the
  // parties. The last party gets the remainder.
  const splitOfSide = (side: SplitSide): CustomSplit | null => {
    if (!transaction) return null;
    const shares = partiesOfSide(side).map((party) => party.share_minor);
    if (shares.length < 2 || shares.some((share) => share === null)) {
      return null;
    }
    return customSplitFromShares({
      shares: shares.filter((share) => share !== null),
      currency: transaction.currency,
    });
  };
  const form = useForm<TransactionFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      title: transaction?.title ?? "",
      description: transaction?.description ?? "",
      amount: transaction
        ? formatAmountInput({
            amountMinor: transaction.amount_minor,
            currency: transaction.currency,
          })
        : "",
      currency: transaction?.currency ?? spaceCurrencies[0]?.currency ?? "",
      transaction_date: transaction?.transaction_date ?? defaultTransactionDate,
      paid_by: partyValuesOfSide("paid_by"),
      paid_by_split: splitOfSide("paid_by"),
      paid_for: partyValuesOfSide("paid_for"),
      paid_for_split: splitOfSide("paid_for"),
    },
  });
  const { errors, isSubmitting, isSubmitted } = form.formState;
  const [amount, currency, paidBy, paidBySplit, paidFor, paidForSplit] =
    useWatch({
      control: form.control,
      name: [
        "amount",
        "currency",
        "paid_by",
        "paid_by_split",
        "paid_for",
        "paid_for_split",
      ],
    });
  const sides = {
    paid_by: { values: paidBy, split: paidBySplit ?? null },
    paid_for: { values: paidFor, split: paidForSplit ?? null },
  };

  // The custom split modal keeps its side after the close, so that it keeps
  // its text while it fades out.
  const [splitModal, setSplitModal] = useState<{
    side: SplitSide;
    isOpen: boolean;
    formKey: number;
  }>({ side: "paid_by", isOpen: false, formKey: 0 });

  const amountMinor = (() => {
    if (!isSupportedCurrency(currency)) return null;
    const parsedAmount = parseAmount({ text: String(amount), currency });
    if (parsedAmount === null || parsedAmount <= 0n) return null;
    return parsedAmount;
  })();

  const transactionMemberIds = new Set(
    (transaction?.parties ?? []).flatMap((party) =>
      party.member_id === null ? [] : [party.member_id],
    ),
  );
  const activeMembers = members.filter((member) => member.archived_at === null);
  const partyOptions = [
    {
      group: "Members",
      items: members
        .filter(
          (member) =>
            member.archived_at === null || transactionMemberIds.has(member.id),
        )
        .map((member) => ({
          value: toPartyValue({ member_id: member.id, alias_id: null }),
          label: member.name,
        })),
    },
    {
      group: "Aliases",
      items: aliases.map((alias) => ({
        value: toPartyValue({ member_id: null, alias_id: alias.id }),
        label: alias.name,
      })),
    },
  ].filter((group) => group.items.length > 0);

  /**
   * Gives the party rows of a side for the preview, with the custom shares.
   * It returns `null` when the custom split is not valid.
   */
  const previewRowsOfSide = ({
    side,
    validAmountMinor,
  }: {
    side: SplitSide;
    validAmountMinor: bigint;
  }) => {
    const rows = toPartyRows(sides[side].values);
    const split = sides[side].split;
    if (split === null) return rows;
    const result = resolveCustomSplit({
      split,
      amountMinor: validAmountMinor,
      currency,
      partyCount: rows.length,
    });
    if ("error" in result) return null;
    return rows.map((row, rowIndex) => ({
      ...row,
      share_minor: result.shares[rowIndex] ?? null,
    }));
  };

  const preview = (() => {
    if (amountMinor === null) return null;
    const paidByRows = previewRowsOfSide({
      side: "paid_by",
      validAmountMinor: amountMinor,
    });
    const paidForRows = previewRowsOfSide({
      side: "paid_for",
      validAmountMinor: amountMinor,
    });
    if (paidByRows === null || paidForRows === null) return null;
    return describeTransactionPreview({
      amountMinor,
      currency,
      locale,
      paidBy: paidByRows,
      paidFor: paidForRows,
      members,
      aliases,
    });
  })();

  const partyNamesOfSide = (side: SplitSide) =>
    toPartyRows(sides[side].values).map((party) =>
      getPartyName({ party, members, aliases }),
    );

  const setSplit = ({
    side,
    split,
  }: {
    side: SplitSide;
    split: CustomSplit | null;
  }) =>
    form.setValue(`${side}_split`, split, {
      shouldDirty: true,
      shouldValidate: isSubmitted,
    });

  // A change of the parties of a side gives the side an equal split again.
  // The values of a custom split belong to the old parties.
  const changeParties = ({
    side,
    values,
    onChange,
  }: {
    side: SplitSide;
    values: string[];
    onChange: (values: string[]) => void;
  }) => {
    onChange(values);
    if (sides[side].split !== null) setSplit({ side, split: null });
  };

  const openSplitModal = (side: SplitSide) =>
    setSplitModal((prev) => ({
      side,
      isOpen: true,
      formKey: prev.formKey + 1,
    }));
  const closeSplitModal = () =>
    setSplitModal((prev) => ({ ...prev, isOpen: false }));

  /** The button that opens the custom split modal of a side. */
  const renderSplitButton = (side: SplitSide) => {
    const isCustom = sides[side].split !== null;
    return (
      <Button
        variant={isCustom ? "light" : "subtle"}
        size="compact-sm"
        disabled={amountMinor === null || sides[side].values.length < 2}
        onClick={() => openSplitModal(side)}
      >
        Advanced Split
      </Button>
    );
  };

  const selectEveryone = () =>
    changeParties({
      side: "paid_for",
      values: activeMembers.map((member) =>
        toPartyValue({ member_id: member.id, alias_id: null }),
      ),
      onChange: (values) =>
        form.setValue("paid_for", values, {
          shouldDirty: true,
          shouldValidate: isSubmitted,
        }),
    });

  // The schema output has a bigint and a Temporal.PlainDate, and the schema
  // does not accept its own output. Thus the server function gets the form
  // input, and it parses the input with the same schema.
  const onSubmit = async (): Promise<void> => {
    try {
      await saveTransactionServerFn({
        data: {
          spaceId,
          transactionId: transaction?.id ?? null,
          values: form.getValues(),
        },
      });
      onRequestClose();
      await router.invalidate();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error
            ? err.message
            : "The transaction cannot be saved.",
      });
    }
  };

  return (
    <form
      className={cx("form")}
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      <Drawer.Header closeLabel="Close">
        <Drawer.Title>
          {transaction ? `Edit ${transaction.title}` : "New transaction"}
        </Drawer.Title>
      </Drawer.Header>
      <Drawer.Inner>
        <Stack gap="sm">
          {errors.root?.message && (
            <Alert color="red">{errors.root.message}</Alert>
          )}
          <TextInput
            label="Title"
            placeholder="Dinner"
            required
            data-autofocus
            error={errors.title?.message}
            {...form.register("title")}
          />
          <Group grow align="flex-start">
            <Controller
              control={form.control}
              name="amount"
              render={({ field }) => (
                <NumberInput
                  label="Amount"
                  required
                  min={0}
                  allowNegative={false}
                  decimalScale={
                    isSupportedCurrency(currency)
                      ? getCurrencyDecimals(currency)
                      : 2
                  }
                  hideControls
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.amount?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select
                  label="Currency"
                  required
                  allowDeselect={false}
                  data={spaceCurrencies.map(
                    (spaceCurrency) => spaceCurrency.currency,
                  )}
                  value={field.value}
                  onChange={(value) => field.onChange(value ?? "")}
                  onBlur={field.onBlur}
                  error={errors.currency?.message}
                />
              )}
            />
          </Group>
          <Controller
            control={form.control}
            name="transaction_date"
            render={({ field }) => (
              <DateInput
                label="Date"
                required
                valueFormat="D MMM YYYY"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.transaction_date?.message}
              />
            )}
          />
          <Stack gap={4}>
            <Controller
              control={form.control}
              name="paid_by"
              render={({ field }) => (
                <MultiSelect
                  label="Paid by"
                  required
                  searchable
                  selectFirstOptionOnChange
                  data={partyOptions}
                  value={field.value}
                  onChange={(values) =>
                    changeParties({
                      side: "paid_by",
                      values,
                      onChange: field.onChange,
                    })
                  }
                  onBlur={field.onBlur}
                  error={
                    errors.paid_by?.message ?? errors.paid_by_split?.message
                  }
                />
              )}
            />
            <Group>{renderSplitButton("paid_by")}</Group>
          </Stack>
          <Stack gap={4}>
            <Controller
              control={form.control}
              name="paid_for"
              render={({ field }) => (
                <MultiSelect
                  label="Paid for"
                  required
                  searchable
                  selectFirstOptionOnChange
                  data={partyOptions}
                  value={field.value}
                  onChange={(values) =>
                    changeParties({
                      side: "paid_for",
                      values,
                      onChange: field.onChange,
                    })
                  }
                  onBlur={field.onBlur}
                  error={
                    errors.paid_for?.message ?? errors.paid_for_split?.message
                  }
                />
              )}
            />
            <Group gap="xs">
              {renderSplitButton("paid_for")}
              <Button
                variant="subtle"
                size="compact-sm"
                disabled={activeMembers.length === 0}
                onClick={selectEveryone}
              >
                Everyone
              </Button>
            </Group>
          </Stack>
          {preview && (
            <Text size="sm" c="dimmed" aria-live="polite">
              {preview}
            </Text>
          )}
          <Textarea
            label="Additional notes"
            description="Any additional detail that might help to identify or contextualise a transaction – used in search results."
            autosize
            minRows={2}
            error={errors.description?.message}
            {...form.register("description")}
          />
        </Stack>
      </Drawer.Inner>
      <Drawer.Footer>
        {transaction && (
          <Button
            variant="subtle"
            color="red"
            me="auto"
            disabled={isSubmitting}
            onClick={onRequestDelete}
          >
            Delete
          </Button>
        )}
        <Button
          variant="default"
          onClick={onRequestClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save Transaction
        </Button>
      </Drawer.Footer>
      {amountMinor !== null && (
        <CustomSplitModal
          isOpen={splitModal.isOpen}
          onRequestClose={closeSplitModal}
          onApply={(split) => {
            setSplit({ side: splitModal.side, split });
            closeSplitModal();
          }}
          formKey={splitModal.formKey}
          sideLabel={SIDE_LABELS[splitModal.side]}
          partyNames={partyNamesOfSide(splitModal.side)}
          amountMinor={amountMinor}
          currency={currency}
          locale={locale}
          split={sides[splitModal.side].split}
        />
      )}
    </form>
  );
}
