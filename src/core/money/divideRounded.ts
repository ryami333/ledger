/**
 * Divides two integers and rounds half away from zero, for example 5 / 2
 * gives 3 and -5 / 2 gives -3. The divisor must not be zero.
 */
export const divideRounded = ({
  dividend,
  divisor,
}: {
  dividend: bigint;
  divisor: bigint;
}): bigint => {
  if (divisor === 0n) {
    throw new Error("divideRounded cannot divide by zero");
  }
  const isNegative = dividend < 0n !== divisor < 0n;
  const absoluteDividend = dividend < 0n ? -dividend : dividend;
  const absoluteDivisor = divisor < 0n ? -divisor : divisor;
  const quotient =
    (absoluteDividend * 2n + absoluteDivisor) / (absoluteDivisor * 2n);
  return isNegative ? -quotient : quotient;
};
