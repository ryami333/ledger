import { getCurrencyOptions } from "../../../core/currencies/getCurrencyOptions.ts";
import { rebaseRates } from "../../../core/currencies/rebaseRates.ts";
import { currencyFormSchema } from "../../../core/forms/currencyFormSchema.ts";
import { saveSpaceCurrenciesServerFn } from "../../../serverFunctions/saveSpaceCurrenciesServerFn.ts";
import { SettingsSection } from "./SettingsSection.tsx";
import type { SettingsCurrency } from "./SpaceSettingsView.types.ts";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  Button,
  Group,
  Radio,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { type z } from "zod";

type CurrencyFormInput = z.input<typeof currencyFormSchema>;
type CurrencyFormOutput = z.output<typeof currencyFormSchema>;

/**
 * The space currencies: add, remove, set the rate, and select the default
 * currency (PLAN.md, D5). A new default currency gives each rate again,
 * relative to the new default currency (`rebaseRates`). The user can correct
 * the rates before the save.
 */
export function CurrenciesSection({
  spaceId,
  locale,
  currencies,
}: {
  spaceId: string;
  locale: string;
  currencies: SettingsCurrency[];
}) {
  const router = useRouter();
  const transactionCounts = new Map(
    currencies.map((currency) => [
      currency.currency,
      currency.transactionCount,
    ]),
  );
  const form = useForm<CurrencyFormInput, unknown, CurrencyFormOutput>({
    resolver: zodResolver(currencyFormSchema),
    defaultValues: {
      currencies: currencies.map((currency) => ({
        currency: currency.currency,
        rate: currency.rate,
        is_default: currency.isDefault,
      })),
    },
  });
  const fieldArray = useFieldArray({
    control: form.control,
    name: "currencies",
  });
  const [newCurrency, setNewCurrency] = useState<string | null>(null);
  const { errors, isSubmitting, isDirty } = form.formState;

  const rows = useWatch({ control: form.control, name: "currencies" });
  const defaultCurrency = rows.find((row) => row.is_default)?.currency ?? "";
  const currencyOptions = getCurrencyOptions(locale).filter(
    (option) => !rows.some((row) => row.currency === option.value),
  );

  const selectDefault = (currency: string) => {
    const rebased = rebaseRates({
      currencies: form.getValues("currencies"),
      defaultCurrency: currency,
    });
    if (rebased === null) {
      form.setError("root", {
        message: `Enter a valid rate for ${currency} first.`,
      });
      return;
    }
    form.clearErrors("root");
    fieldArray.replace(rebased);
  };

  const addCurrency = () => {
    if (!newCurrency) return;
    fieldArray.append({ currency: newCurrency, rate: "", is_default: false });
    setNewCurrency(null);
  };

  const onSubmit = async (values: CurrencyFormOutput): Promise<void> => {
    try {
      await saveSpaceCurrenciesServerFn({
        data: { spaceId, currencies: values.currencies },
      });
      await router.invalidate();
    } catch (err) {
      form.setError("root", {
        message:
          err instanceof Error
            ? err.message
            : "The currencies cannot be saved.",
      });
    }
  };

  const listError =
    errors.currencies?.message ?? errors.currencies?.root?.message;

  return (
    <SettingsSection
      title="Currencies"
      description="The balances use the default currency. A change of a rate changes the balances of all transactions in that currency."
    >
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Stack gap="sm">
          {errors.root?.message && (
            <Alert color="red">{errors.root.message}</Alert>
          )}
          {listError && <Alert color="red">{listError}</Alert>}
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Currency</Table.Th>
                <Table.Th>Rate</Table.Th>
                <Table.Th>Default</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fieldArray.fields.map((field, rowIndex) => {
                const row = rows[rowIndex];
                const isDefault = row?.is_default ?? false;
                const transactionCount =
                  transactionCounts.get(field.currency) ?? 0;
                const removeBlocker = (() => {
                  if (isDefault)
                    return "Select a different default currency first.";
                  if (transactionCount > 0)
                    return "The currency has transactions.";
                  return null;
                })();
                return (
                  <Table.Tr key={field.id}>
                    <Table.Td>
                      <Text fw={500}>{field.currency}</Text>
                    </Table.Td>
                    <Table.Td>
                      <TextInput
                        aria-label={`Rate of ${field.currency}`}
                        inputMode="decimal"
                        disabled={isDefault}
                        leftSection={
                          <Text size="sm" c="dimmed">
                            1 {field.currency} =
                          </Text>
                        }
                        leftSectionWidth={80}
                        rightSection={
                          <Text size="sm" c="dimmed">
                            {defaultCurrency}
                          </Text>
                        }
                        rightSectionWidth={48}
                        error={errors.currencies?.[rowIndex]?.rate?.message}
                        {...form.register(`currencies.${rowIndex}.rate`)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Radio
                        aria-label={`${field.currency} is the default currency`}
                        checked={isDefault}
                        onChange={() => selectDefault(field.currency)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Tooltip
                        label={removeBlocker}
                        disabled={removeBlocker === null}
                      >
                        <Button
                          variant="subtle"
                          color="red"
                          size="compact-sm"
                          data-disabled={removeBlocker !== null || undefined}
                          onClick={(event) => {
                            if (removeBlocker !== null) {
                              event.preventDefault();
                              return;
                            }
                            fieldArray.remove(rowIndex);
                          }}
                        >
                          Remove
                        </Button>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
          <Group align="flex-end" gap="xs">
            <Select
              label="Add a currency"
              placeholder="Select a currency"
              searchable
              selectFirstOptionOnChange
              flex={1}
              data={currencyOptions}
              value={newCurrency}
              onChange={setNewCurrency}
            />
            <Button
              variant="default"
              onClick={addCurrency}
              disabled={!newCurrency}
            >
              Add
            </Button>
          </Group>
          <Group justify="flex-end">
            <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
              Save Currencies
            </Button>
          </Group>
        </Stack>
      </form>
    </SettingsSection>
  );
}
