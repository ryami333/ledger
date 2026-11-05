import {
  type CustomSplit,
  convertCustomSplit,
  createEqualCustomSplit,
  getSharePercent,
  resolveCustomSplit,
} from "../../../core/splits/customSplitHelpers.ts";
import { formatAmount } from "../../../core/money/formatAmount.ts";
import { getCurrencyDecimals } from "../../../core/money/getCurrencyDecimals.ts";
import { parseAmount } from "../../../core/money/parseAmount.ts";
import { Modal } from "../../ui/Modal.tsx";
import {
  Alert,
  Button,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import classNames from "classnames/bind";
import styles from "./CustomSplitModal.module.css";

const cx = classNames.bind(styles);

/**
 * The modal to set a custom split of one side of a transaction (PLAN.md,
 * D6). It opens on top of the transaction drawer, in the same `Modal.Stack`.
 *
 * Each party except the last gets an input, in the transaction currency or
 * in percent. The last party gets the remainder, and has no input. Give the
 * modal a new `formKey` each time it opens, so that it starts again from
 * `split`.
 */
export function CustomSplitModal({
  isOpen,
  onRequestClose,
  onApply,
  formKey,
  sideLabel,
  partyNames,
  amountMinor,
  currency,
  locale,
  split,
}: {
  isOpen: boolean;
  onRequestClose: () => void;
  /** Gets the new split, or `null` for an equal split. */
  onApply: (split: CustomSplit | null) => void;
  formKey: number;
  /** "Paid by" or "Paid for". */
  sideLabel: string;
  /** The names of the parties of the side, in the order of the side. */
  partyNames: string[];
  amountMinor: bigint;
  currency: string;
  locale: string;
  /** The current split of the side, or `null` for an equal split. */
  split: CustomSplit | null;
}) {
  return (
    <Modal.Container
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      stackId="transaction-split"
    >
      <CustomSplitForm
        key={formKey}
        onRequestClose={onRequestClose}
        onApply={onApply}
        sideLabel={sideLabel}
        partyNames={partyNames}
        amountMinor={amountMinor}
        currency={currency}
        locale={locale}
        split={split}
      />
    </Modal.Container>
  );
}

function CustomSplitForm({
  onRequestClose,
  onApply,
  sideLabel,
  partyNames,
  amountMinor,
  currency,
  locale,
  split,
}: Omit<React.ComponentProps<typeof CustomSplitModal>, "isOpen" | "formKey">) {
  const [draft, setDraft] = useState<CustomSplit>(
    () => split ?? createEqualCustomSplit(partyNames.length),
  );
  const [isApplied, setIsApplied] = useState(false);

  const result = resolveCustomSplit({
    split: draft,
    amountMinor,
    currency,
    partyCount: partyNames.length,
  });
  const format = (shareMinor: bigint) =>
    formatAmount({ amountMinor: shareMinor, currency, locale });

  // The hint of each input gives the share in the other mode.
  const otherModeValues = convertCustomSplit({
    split: draft,
    amountMinor,
    currency,
  }).values;
  const getHint = (valueIndex: number): string => {
    const otherValue = otherModeValues[valueIndex] ?? "";
    if (otherValue === "") return "";
    if (draft.mode === "amount") return `${otherValue}%`;
    const shareMinor = parseAmount({ text: otherValue, currency });
    return shareMinor === null ? "" : format(shareMinor);
  };

  // The last party has no input. Its row gives the remainder in the mode of
  // the split, and in the other mode as the hint.
  const remainder = (() => {
    const shareMinor = "shares" in result ? result.shares.at(-1) : undefined;
    if (shareMinor === undefined) return { value: "—", hint: "" };
    const amountText = format(shareMinor);
    const percentText = `${getSharePercent({ shareMinor, amountMinor })}%`;
    if (draft.mode === "amount")
      return { value: amountText, hint: percentText };
    return { value: percentText, hint: amountText };
  })();

  const setValue = ({
    valueIndex,
    value,
  }: {
    valueIndex: number;
    value: string;
  }) =>
    setDraft((prev) => ({
      mode: prev.mode,
      values: prev.values.map((oldValue, oldIndex) =>
        oldIndex === valueIndex ? value : oldValue,
      ),
    }));

  // The modal is in the React tree of the form of the drawer. A submit event
  // goes up the React tree, thus the submit must not reach that form.
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsApplied(true);
    if ("error" in result) return;
    onApply(draft);
  };

  return (
    <form className={cx("form")} onSubmit={onSubmit} noValidate>
      <Modal.Header closeLabel="Close">
        <Modal.Title>Custom split: {sideLabel}</Modal.Title>
        <Modal.Description>
          Set the share of each party. The last party gets the remainder of{" "}
          {format(amountMinor)}.
        </Modal.Description>
      </Modal.Header>
      <Modal.Inner>
        <Stack gap="md">
          {isApplied && "error" in result && (
            <Alert color="red">{result.error}</Alert>
          )}
          <SegmentedControl
            fullWidth
            aria-label="Split by"
            value={draft.mode}
            onChange={(mode) => {
              if (mode === draft.mode) return;
              setDraft(
                convertCustomSplit({ split: draft, amountMinor, currency }),
              );
            }}
            data={[
              { value: "percent", label: "Percent" },
              { value: "amount", label: `Amount (${currency})` },
            ]}
          />
          <div className={cx("rows")}>
            {draft.values.map((value, valueIndex) => (
              <div className={cx("row")} key={valueIndex}>
                <Text className={cx("name")} size="sm">
                  {partyNames[valueIndex]}
                </Text>
                <NumberInput
                  aria-label={`Share of ${partyNames[valueIndex] ?? ""}`}
                  data-autofocus={valueIndex === 0 ? true : undefined}
                  min={0}
                  max={draft.mode === "percent" ? 100 : undefined}
                  allowNegative={false}
                  decimalScale={
                    draft.mode === "percent" ? 2 : getCurrencyDecimals(currency)
                  }
                  hideControls
                  rightSection={
                    <Text size="sm" c="dimmed">
                      {draft.mode === "percent" ? "%" : currency}
                    </Text>
                  }
                  rightSectionWidth={48}
                  value={value}
                  onChange={(newValue) =>
                    setValue({ valueIndex, value: String(newValue) })
                  }
                />
                <Text className={cx("hint")} size="sm" c="dimmed">
                  {getHint(valueIndex)}
                </Text>
              </div>
            ))}
            <div className={cx("row")}>
              <Text className={cx("name")} size="sm">
                {partyNames.at(-1)}{" "}
                <Text span size="sm" c="dimmed">
                  (remainder)
                </Text>
              </Text>
              <Text className={cx("remainder")} size="sm" aria-live="polite">
                {remainder.value}
              </Text>
              <Text className={cx("hint")} size="sm" c="dimmed">
                {remainder.hint}
              </Text>
            </div>
          </div>
        </Stack>
      </Modal.Inner>
      <Modal.Footer>
        <Button variant="subtle" me="auto" onClick={() => onApply(null)}>
          Split equally
        </Button>
        <Button variant="default" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit">Apply split</Button>
      </Modal.Footer>
    </form>
  );
}
