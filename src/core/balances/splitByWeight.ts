/**
 * Splits an amount in parts in proportion to the weight of each recipient
 * (PLAN.md, D6, rule 4). Each recipient gets
 * `floor(amount × weight / total weight)`. The minor units that are left go
 * one each to the recipients with the largest rest of that division. On a
 * tie, the first recipient by ID gets the unit. Thus equal weights give
 * `floor(amount / count)`, and the first `amount % count` recipients by ID
 * get one more minor unit.
 */
export const splitByWeight = ({
  amountMinor,
  recipients,
}: {
  amountMinor: bigint;
  recipients: readonly { recipientId: string; weight: bigint }[];
}): { recipientId: string; amountMinor: bigint }[] => {
  const totalWeight = recipients.reduce(
    (accumulator, recipient) => accumulator + recipient.weight,
    0n,
  );
  if (totalWeight <= 0n) {
    throw new Error("splitByWeight needs a total weight larger than zero");
  }
  const parts = recipients
    // The code unit order, the same as the sort of the result of splitSide.
    .toSorted((first, second) => {
      if (first.recipientId === second.recipientId) return 0;
      return first.recipientId < second.recipientId ? -1 : 1;
    })
    .map((recipient) => ({
      recipientId: recipient.recipientId,
      amountMinor: (amountMinor * recipient.weight) / totalWeight,
      rest: (amountMinor * recipient.weight) % totalWeight,
    }));
  const leftover =
    amountMinor -
    parts.reduce((accumulator, part) => accumulator + part.amountMinor, 0n);
  const extraUnitIds = new Set(
    // The sort is stable, thus a tie keeps the order by ID.
    parts
      .toSorted((first, second) => {
        if (first.rest === second.rest) return 0;
        return first.rest > second.rest ? -1 : 1;
      })
      .slice(0, Number(leftover))
      .map((part) => part.recipientId),
  );
  return parts.map((part) => ({
    recipientId: part.recipientId,
    amountMinor: extraUnitIds.has(part.recipientId)
      ? part.amountMinor + 1n
      : part.amountMinor,
  }));
};
