/** Spaces and apostrophes that a locale can use as a thousands separator. */
const groupingPattern = /[\s'’]/gu;

/** A currency symbol, for example "€" or "$". */
const currencySymbolPattern = /\p{Sc}/gu;

/** Digits with points and commas only, and at least one digit. */
const numberTextPattern = /^(?=.*\d)[\d.,]+$/;

/**
 * Converts the text of a search to the decimal texts of the amounts that it
 * can mean. Each result has a point as the decimal separator and no
 * thousands separator, for `parseDecimalText`.
 *
 * The function accepts a point or a comma as the decimal separator, and a
 * point, a comma, a space, or an apostrophe as the thousands separator.
 * Examples:
 *
 * - "44,76" and "44.76" give `["44.76"]`.
 * - "1.234,56" and "1,234.56" give `["1234.56"]`.
 * - "1,234" gives `["1.234", "1234"]`, because the separator is ambiguous.
 *
 * It returns an empty array for a text that is not an amount.
 */
export const parseAmountSearchText = (input: string): string[] => {
  const text = input
    .replace(currencySymbolPattern, "")
    .replace(groupingPattern, "");
  if (!numberTextPattern.test(text)) return [];

  const lastPoint = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");

  // With a point and a comma, the last separator is the decimal separator.
  if (lastPoint !== -1 && lastComma !== -1) {
    const decimalSeparator = lastPoint > lastComma ? "." : ",";
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";
    const decimalIndex = Math.max(lastPoint, lastComma);
    const wholePart = text.slice(0, decimalIndex);
    const fractionPart = text.slice(decimalIndex + 1);
    if (wholePart.includes(decimalSeparator)) return [];
    if (fractionPart.includes(thousandsSeparator)) return [];
    return [`${wholePart.replaceAll(thousandsSeparator, "")}.${fractionPart}`];
  }

  const separator = lastPoint === -1 ? "," : ".";
  const parts = text.split(separator);
  if (parts.length === 1) return [text];
  // A separator that occurs two or more times is a thousands separator.
  if (parts.length > 2) return [parts.join("")];

  const [wholePart = "", fractionPart = ""] = parts;
  const decimalText = `${wholePart}.${fractionPart}`;
  // "1,234" can be one thousand two hundred thirty-four, or 1.234.
  if (wholePart !== "" && fractionPart.length === 3) {
    return [decimalText, `${wholePart}${fractionPart}`];
  }
  return [decimalText];
};
