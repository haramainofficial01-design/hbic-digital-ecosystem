import type Stripe from "stripe";
import { donationAmountCents, donationFund } from "@hbic/shared";
export function donationCheckoutParameters(fundId: unknown, amount: unknown): Stripe.Checkout.SessionCreateParams {
  const fund = donationFund(fundId), cents = donationAmountCents(amount);
  if (!fund || cents === null) throw new Error("Choose a donation category and an amount from CA$1 to CA$10,000.");
  const metadata = { hbicPaymentKind: "donation", donationCategory: fund.id, donationCategoryName: fund.title };
  return { mode: "payment", submit_type: "donate", metadata,
    custom_text: { submit: { message: `Your one-time CA$${(cents / 100).toFixed(2)} donation is for ${fund.title}. This is not Quran Academy tuition and does not enroll a child.` } },
    payment_intent_data: { metadata, description: `HBIC — ${fund.title}` },
    line_items: [{ quantity: 1, price_data: { currency: "cad", unit_amount: cents,
      product_data: { name: `HBIC — ${fund.title}`, description: fund.description, metadata } } }],
    success_url: "https://hbic.ca/donate?checkout={CHECKOUT_SESSION_ID}",
    cancel_url: `https://hbic.ca/donate?fund=${fund.id}&amount=${(cents / 100).toFixed(2)}&cancelled=1` };
}
