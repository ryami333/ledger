import { splitByWeight } from "../balances/splitByWeight.ts";
import { formatRate } from "../currencies/formatRate.ts";
import { isSupportedCurrency } from "../currencies/isSupportedCurrency.ts";
import { SCALED_RATE_ONE } from "../currencies/parseRate.ts";
import { MAX_AMOUNT_MINOR } from "../forms/transactionFormSchema.ts";
import { divideRounded } from "../money/divideRounded.ts";
import { getCurrencyDecimals } from "../money/getCurrencyDecimals.ts";
import { parseDecimalText } from "../money/parseDecimalText.ts";
import type { SplidExport, SplidExportRow } from "./parseSplidExport.ts";
import { Temporal } from "temporal-polyfill";

/** The description of each imported transaction. */
export const SPLID_IMPORT_DESCRIPTION = "Imported from Splid";

/**
 * One party of an imported transaction, in the form of `save_transaction`.
 * `share_minor` is in minor units of the transaction currency, or `null`
 * for an equal split.
 */
export type ImportParty = {
  member_id: string;
  alias_id: null;
  share_minor: bigint | null;
};

/** One transaction that the import adds. */
export type PlannedTransaction = {
  lineNumber: number;
  title: string;
  description: string;
  amount_minor: bigint;
  currency: string;
  /** The rate of the transaction, from its member amounts, as text. */
  rate: string;
  /** The text `YYYY-MM-DD`. */
  transaction_date: string;
  paid_by: ImportParty[];
  paid_for: ImportParty[];
};

/** A row that the import cannot add, with the reason. */
export type ImportProblem = {
  lineNumber: number;
  title: string;
  message: string;
};

/** A currency that the import adds to the space, with its rate as text. */
export type ImportCurrency = { currency: string; rate: string };

export type SplidImportPlan = {
  transactions: PlannedTransaction[];
  newCurrencies: ImportCurrency[];
  /** The number of rows that the space has already. */
  duplicateCount: number;
  problems: ImportProblem[];
};

/** Digits, then an optional point and digits. Splid writes ".85" for 0.85. */
const exportAmountPattern = /^(\d*)(?:\.(\d+))?$/;

/** The date format of a Splid export: `DD/MM/YYYY`. */
const splidDatePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converts an amount of the export to minor units. An empty text gives 0.
 * The function accepts zeros after the decimals of the currency, for
 * example "44000.00" in IDR. A minus sign at the start gives the amount with
 * no sign. It returns `null` for a text that is not an amount.
 */
const parseExportAmount = ({
  text,
  currency,
}: {
  text: string;
  currency: string;
}): bigint | null => {
  const unsignedText = text.startsWith("-") ? text.slice(1) : text;
  if (unsignedText === "") return 0n;
  const match = exportAmountPattern.exec(unsignedText);
  if (!match) return null;
  const wholePart = match[1] || "0";
  const fractionPart = (match[2] ?? "").replace(/0+$/, "");
  return parseDecimalText({
    text: fractionPart === "" ? wholePart : `${wholePart}.${fractionPart}`,
    decimals: getCurrencyDecimals(currency),
  });
};

/**
 * Converts a date of the export to `YYYY-MM-DD`. Splid writes `DD/MM/YYYY`.
 * It returns `null` for a text that is not a date.
 */
const parseExportDate = (text: string): string | null => {
  try {
    if (isoDatePattern.test(text)) {
      return Temporal.PlainDate.from(text).toString();
    }
    const match = splidDatePattern.exec(text);
    if (!match) return null;
    return Temporal.PlainDate.from(
      {
        day: Number(match[1]),
        month: Number(match[2]),
        year: Number(match[3]),
      },
      { overflow: "reject" },
    ).toString();
  } catch {
    return null;
  }
};

/**
 * Gives the parties of one side. Splid rounds each part to the minor unit.
 * Thus parts that differ by one minor unit or less are an equal split. Other
 * parts give custom shares of the amount of the transaction, in proportion
 * to the parts. It returns `null` when a share is zero.
 */
const planSide = ({
  amountMinor,
  parts,
}: {
  amountMinor: bigint;
  parts: readonly { memberId: string; partMinor: bigint }[];
}): ImportParty[] | null => {
  const partValues = parts.map((part) => part.partMinor);
  const largest = partValues.reduce(
    (accumulator, value) => (value > accumulator ? value : accumulator),
    0n,
  );
  const smallest = partValues.reduce(
    (accumulator, value) => (value < accumulator ? value : accumulator),
    largest,
  );
  if (largest - smallest <= 1n) {
    return parts.map((part) => ({
      member_id: part.memberId,
      alias_id: null,
      share_minor: null,
    }));
  }
  const shares = new Map(
    splitByWeight({
      amountMinor,
      recipients: parts.map((part) => ({
        recipientId: part.memberId,
        weight: part.partMinor,
      })),
    }).map((share) => [share.recipientId, share.amountMinor]),
  );
  const parties = parts.map((part) => ({
    member_id: part.memberId,
    alias_id: null,
    share_minor: shares.get(part.memberId) ?? 0n,
  }));
  return parties.some((party) => party.share_minor <= 0n) ? null : parties;
};

/**
 * Gives the scaled rate that converts `amountMinor` of `currency` to
 * `convertedMinor` of `defaultCurrency`, rounded half away from zero to 8
 * decimals. A very small rate can round to zero.
 */
const scaledRateOfAmounts = ({
  convertedMinor,
  amountMinor,
  currency,
  defaultCurrency,
}: {
  convertedMinor: bigint;
  amountMinor: bigint;
  currency: string;
  defaultCurrency: string;
}): bigint =>
  divideRounded({
    dividend:
      convertedMinor *
      10n ** BigInt(getCurrencyDecimals(currency)) *
      SCALED_RATE_ONE,
    divisor: amountMinor * 10n ** BigInt(getCurrencyDecimals(defaultCurrency)),
  });

/** The key of a transaction for the search of duplicates. */
const duplicateKey = ({
  title,
  amountMinor,
  currency,
  transactionDate,
}: {
  title: string;
  amountMinor: bigint;
  currency: string;
  transactionDate: string;
}) => [transactionDate, title.trim(), amountMinor, currency].join("\n");

/**
 * Plans the import of a Splid export into a space. It gives the
 * transactions to add, the currencies to add, the number of duplicates, and
 * the rows that it cannot add.
 *
 * - `memberIds` gives the space member of each name in `memberNames`, or
 *   `null`. A row with an amount of a name with no member is a problem.
 * - The member amounts of the export are in `defaultCurrency`. They give
 *   the shares of each side, and the rate of each transaction: the sum of
 *   the paid member amounts, divided by the amount (PLAN.md, D5). Thus the
 *   balances agree with Splid.
 * - A new currency gets the rate of all its rows: the sum of the converted
 *   amounts, divided by the sum of the amounts. A new transaction then gets
 *   this rate. The import keeps the rate of a currency that the space has.
 * - A row with the same date, title, amount, and currency as a transaction
 *   of the space is a duplicate. Each transaction of the space matches one
 *   row only.
 * - The date is the column "Date", or "Created on" when "Date" is empty.
 */
export const planSplidImport = ({
  splidExport,
  memberIds,
  defaultCurrency,
  spaceCurrencies,
  existingTransactions,
}: {
  splidExport: SplidExport;
  memberIds: readonly (string | null)[];
  defaultCurrency: string;
  /** The currency codes of the space currencies. */
  spaceCurrencies: readonly string[];
  existingTransactions: readonly {
    title: string;
    amount_minor: bigint;
    currency: string;
    transaction_date: string;
  }[];
}): SplidImportPlan => {
  const problems: ImportProblem[] = [];
  const addProblem = ({
    row,
    message,
  }: {
    row: SplidExportRow;
    message: string;
  }) => {
    problems.push({ lineNumber: row.lineNumber, title: row.title, message });
    return [];
  };

  /** Gives the member amounts of one column of a row, or a problem text. */
  const readMemberParts = ({
    texts,
  }: {
    texts: readonly string[];
  }): { memberId: string; partMinor: bigint }[] | string => {
    const parts: { memberId: string; partMinor: bigint }[] = [];
    for (const [memberIndex, text] of texts.entries()) {
      const partMinor = parseExportAmount({ text, currency: defaultCurrency });
      const memberName = splidExport.memberNames[memberIndex] ?? "";
      if (partMinor === null) {
        return `The amount "${text}" of ${memberName} is not valid.`;
      }
      if (partMinor === 0n) continue;
      const memberId = memberIds[memberIndex] ?? null;
      if (memberId === null) {
        return `${memberName} has no member in the space.`;
      }
      parts.push({ memberId, partMinor });
    }
    return parts;
  };

  const candidates = splidExport.rows.flatMap((row) => {
    if (row.title === "") {
      return addProblem({ row, message: "The row has no title." });
    }
    if (!isSupportedCurrency(row.currency)) {
      return addProblem({
        row,
        message: `The currency "${row.currency}" is not valid.`,
      });
    }
    const amountMinor = parseExportAmount({
      text: row.amountText,
      currency: row.currency,
    });
    if (amountMinor === null || amountMinor <= 0n) {
      return addProblem({
        row,
        message: `The amount "${row.amountText}" is not valid.`,
      });
    }
    if (amountMinor > MAX_AMOUNT_MINOR) {
      return addProblem({ row, message: "The amount is too large." });
    }
    const dateText =
      row.dateText === "" || row.dateText === "–"
        ? row.createdOnText
        : row.dateText;
    const transactionDate = parseExportDate(dateText);
    if (transactionDate === null) {
      return addProblem({
        row,
        message: `The date "${dateText}" is not valid.`,
      });
    }
    const paidParts = readMemberParts({ texts: row.paidTexts });
    if (typeof paidParts === "string") {
      return addProblem({ row, message: paidParts });
    }
    const receivedParts = readMemberParts({ texts: row.receivedTexts });
    if (typeof receivedParts === "string") {
      return addProblem({ row, message: receivedParts });
    }
    if (paidParts.length === 0 || receivedParts.length === 0) {
      return addProblem({
        row,
        message: "The row needs a payer and a recipient.",
      });
    }
    const paidTotalMinor = paidParts.reduce(
      (accumulator, part) => accumulator + part.partMinor,
      0n,
    );
    if (row.currency === defaultCurrency && paidTotalMinor !== amountMinor) {
      return addProblem({
        row,
        message: `The payments of the members are not the amount. Are the member amounts in ${defaultCurrency}?`,
      });
    }
    const paidBy = planSide({ amountMinor, parts: paidParts });
    const paidFor = planSide({ amountMinor, parts: receivedParts });
    if (paidBy === null || paidFor === null) {
      return addProblem({
        row,
        message: "A share is too small for the currency.",
      });
    }
    const scaledRate =
      row.currency === defaultCurrency
        ? SCALED_RATE_ONE
        : scaledRateOfAmounts({
            convertedMinor: paidTotalMinor,
            amountMinor,
            currency: row.currency,
            defaultCurrency,
          });
    if (scaledRate === 0n) {
      return addProblem({
        row,
        message: `The rate of ${row.currency} is too small.`,
      });
    }
    return [
      {
        row,
        paidTotalMinor,
        transaction: {
          lineNumber: row.lineNumber,
          title: row.title,
          description: SPLID_IMPORT_DESCRIPTION,
          amount_minor: amountMinor,
          currency: row.currency,
          rate: formatRate(scaledRate),
          transaction_date: transactionDate,
          paid_by: paidBy,
          paid_for: paidFor,
        },
      },
    ];
  });

  // The rate of each new currency, from all of its rows.
  const knownCurrencies = new Set([defaultCurrency, ...spaceCurrencies]);
  const newCurrencyTotals = new Map<
    string,
    { convertedMinor: bigint; amountMinor: bigint }
  >();
  for (const candidate of candidates) {
    const { currency, amount_minor: amountMinor } = candidate.transaction;
    if (knownCurrencies.has(currency)) continue;
    const totals = newCurrencyTotals.get(currency) ?? {
      convertedMinor: 0n,
      amountMinor: 0n,
    };
    newCurrencyTotals.set(currency, {
      convertedMinor: totals.convertedMinor + candidate.paidTotalMinor,
      amountMinor: totals.amountMinor + amountMinor,
    });
  }
  const newCurrencies = [...newCurrencyTotals]
    .map(([currency, totals]) => ({
      currency,
      scaledRate: scaledRateOfAmounts({
        convertedMinor: totals.convertedMinor,
        amountMinor: totals.amountMinor,
        currency,
        defaultCurrency,
      }),
    }))
    .toSorted((first, second) => first.currency.localeCompare(second.currency));
  const zeroRateCurrencies = new Set(
    newCurrencies
      .filter((newCurrency) => newCurrency.scaledRate === 0n)
      .map((newCurrency) => newCurrency.currency),
  );

  const existingCounts = new Map<string, number>();
  for (const transaction of existingTransactions) {
    const key = duplicateKey({
      title: transaction.title,
      amountMinor: transaction.amount_minor,
      currency: transaction.currency,
      transactionDate: transaction.transaction_date,
    });
    existingCounts.set(key, (existingCounts.get(key) ?? 0) + 1);
  }

  const transactions: PlannedTransaction[] = [];
  const duplicateCount = candidates.reduce((accumulator, candidate) => {
    const { transaction, row } = candidate;
    if (zeroRateCurrencies.has(transaction.currency)) {
      addProblem({
        row,
        message: `The rate of ${transaction.currency} is too small.`,
      });
      return accumulator;
    }
    const key = duplicateKey({
      title: transaction.title,
      amountMinor: transaction.amount_minor,
      currency: transaction.currency,
      transactionDate: transaction.transaction_date,
    });
    const existingCount = existingCounts.get(key) ?? 0;
    if (existingCount > 0) {
      existingCounts.set(key, existingCount - 1);
      return accumulator + 1;
    }
    transactions.push(transaction);
    return accumulator;
  }, 0);

  return {
    transactions,
    newCurrencies: newCurrencies
      .filter((newCurrency) => newCurrency.scaledRate > 0n)
      .map((newCurrency) => ({
        currency: newCurrency.currency,
        rate: formatRate(newCurrency.scaledRate),
      })),
    duplicateCount,
    problems: problems.toSorted(
      (first, second) => first.lineNumber - second.lineNumber,
    ),
  };
};
