/**
 * Shared money constants — must match the API (api/ai_guard.py).
 * FX: 1 USD = 194.50 LRD · Ezri platform fee: 2% of every transaction.
 */
export const USD_LRD = 194.5;
export const FEE_PCT = 0.02;

/** Ezri service fee (2%) rounded to cents. */
export function feeOf(amountUsd: number): number {
  return Math.round(amountUsd * FEE_PCT * 100) / 100;
}

/** What the sender is actually charged: transfer + 2% fee. */
export function totalOf(amountUsd: number): number {
  return Math.round((amountUsd + feeOf(amountUsd)) * 100) / 100;
}

/** Receiver payout in LRD at the live demo rate. */
export function lrdOf(amountUsd: number): number {
  return Math.round(amountUsd * USD_LRD * 100) / 100;
}

/** e.g. "2" for badge labels. */
export const FEE_PCT_LABEL = String(FEE_PCT * 100).replace(/\.0$/, "");
