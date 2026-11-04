import { isSupportedCurrency } from "../../../core/currencies/isSupportedCurrency.ts";
import { transactionFormSchema } from "../../../core/forms/transactionFormSchema.ts";
import { formatAmountInput } from "../../../core/money/formatAmountInput.ts";
import { getCurrencyDecimals } from "../../../core/money/getCurrencyDecimals.ts";
import { parseAmount } from "../../../core/money/parseAmount.ts";
import { describeTransactionPreview } from "../../../core/transactions/describeTransactionPreview.ts";
import {
  parsePartyValue,
  toPartyRow,
  toPartyValue,
} from "../../../core/transactions/partyValueHelpers.ts";
import { saveTransactionServerFn } from "../../../serverFunctions/saveTransactionServerFn.ts";
import { Drawer } from "../../ui/Drawer.tsx";
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
import { Controller, useForm, useWatch } from "react-hook-form";
import { type z } from "zod";
import classNames from "classnames/bind";
import styles from "./TransactionForm.module.css";

const cx = classNames.bind(styles);

type TransactionFormInput = z.input<typeof transactionFormSchema>;
type TransactionFormOutput = z.output<typeof transactionFormSchema>;

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
  const partyValuesOfSide = (side: "paid_by" | "paid_for") =>
    (transaction?.parties ?? [])
      .filter((party) => party.side === side)
      .map(toPartyValue);
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
      paid_for: partyValuesOfSide("paid_for"),
    },
  });
  const { errors, isSubmitting, isSubmitted } = form.formState;
  const [amount, currency, paidBy, paidFor] = useWatch({
    control: form.control,
    name: ["amount", "currency", "paid_by", "paid_for"],
  });

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

  const preview = (() => {
    if (!isSupportedCurrency(currency)) return null;
    const amountMinor = parseAmount({ text: String(amount), currency });
    if (amountMinor === null) return null;
    return describeTransactionPreview({
      amountMinor,
      currency,
      locale,
      paidBy: toPartyRows(paidBy),
      paidFor: toPartyRows(paidFor),
      members,
      aliases,
    });
  })();

  const selectEveryone = () =>
    form.setValue(
      "paid_for",
      activeMembers.map((member) =>
        toPartyValue({ member_id: member.id, alias_id: null }),
      ),
      { shouldDirty: true, shouldValidate: isSubmitted },
    );

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
          <Textarea
            label="Description"
            autosize
            minRows={2}
            error={errors.description?.message}
            {...form.register("description")}
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
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={errors.paid_by?.message}
              />
            )}
          />
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
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.paid_for?.message}
                />
              )}
            />
            <Group>
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
          Save transaction
        </Button>
      </Drawer.Footer>
    </form>
  );
}
