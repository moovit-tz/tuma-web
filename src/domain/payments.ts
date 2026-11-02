/**
 * Payment options for parcels.
 *
 * Two independent questions, as most operators in the region run them:
 *  1. Who pays for delivery?  sender prepaid · sender on account · receiver pays on delivery
 *  2. Collect the goods value too (COD)?  optional amount, combinable with any of the above
 *
 * Whatever is due at the door (goods + delivery fee when the receiver pays) is collected in one go,
 * by cash, mobile money or card. Money movement itself is posted in Hudumika FinOps (FR-FIN-02).
 */
export const DELIVERY_PAYERS = ["prepaid", "account", "pay_on_delivery"] as const;
export type DeliveryPayer = (typeof DELIVERY_PAYERS)[number];

export const PREPAY_METHODS = ["mobile_money", "card", "bank_transfer"] as const;
export const COLLECT_METHODS = ["cash", "mobile_money", "card"] as const;
export type PrepayMethod = (typeof PREPAY_METHODS)[number];
export type CollectMethod = (typeof COLLECT_METHODS)[number];

/** Amount the rider or Wakala agent must collect at handover. */
export function amountToCollect(s: { paymentTerms: string; codAmount?: number | null; totalCharge: number }) {
  const goods = s.codAmount ?? 0;
  const fee = s.paymentTerms === "pay_on_delivery" ? s.totalCharge : 0;
  return { goods, fee, total: goods + fee };
}

/** Receiver pays → no sender credit check (FR-FIN-03 applies to the paying account). */
export function senderPays(terms: string) {
  return terms === "prepaid" || terms === "account";
}
