import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder_key_for_build";
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

// 하위 호환을 위해 유지 (런타임에만 사용)
export const stripe = { get: getStripe } as unknown as Stripe;

/** @deprecated `@/lib/plans` 사용 권장 */
export { PLANS } from "./plans";
