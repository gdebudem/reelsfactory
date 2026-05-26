import Stripe from "stripe";
import { PRICING } from "@reels-factory/shared";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
  : null;

export function getStripePriceId(tier: "basic" | "premium"): string | undefined {
  return tier === "premium"
    ? process.env.STRIPE_PRICE_PREMIUM
    : process.env.STRIPE_PRICE_BASIC;
}

export function getTierAmount(tier: "basic" | "premium"): number {
  return PRICING[tier].amount;
}
