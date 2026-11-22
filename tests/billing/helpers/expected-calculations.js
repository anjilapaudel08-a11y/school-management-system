export function roundCents(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100);
}

export function centsToAmount(cents) {
  return cents / 100;
}

export function calculateLine({ quantity, rate, discountPercent = 0 }) {
  const amountCents = roundCents(Number(quantity) * Number(rate));
  const discountCents = roundCents(
    (amountCents * Number(discountPercent)) / 100,
  );
  return {
    amount: centsToAmount(amountCents),
    discountAmount: centsToAmount(discountCents),
    netAmount: centsToAmount(amountCents - discountCents),
  };
}

export function calculateOutstanding({
  totalAmount,
  payments = [],
  waivers = [],
  credits = [],
}) {
  const paidCents = payments.reduce(
    (sum, payment) => sum + roundCents(payment.amount),
    0,
  );
  const waivedCents = waivers.reduce(
    (sum, waiver) => sum + roundCents(waiver.amount),
    0,
  );
  const creditedCents = credits.reduce(
    (sum, credit) => sum + roundCents(credit.amount),
    0,
  );

  return centsToAmount(
    roundCents(totalAmount) - paidCents - waivedCents - creditedCents,
  );
}

export function statusForOutstanding(totalAmount, outstanding) {
  if (totalAmount <= 0) return "BLOCKED_ZERO_VALUE";
  if (outstanding <= 0) return "PAID";
  if (outstanding < totalAmount) return "PARTIAL";
  return "UNPAID";
}
