import { academyStripe } from "../../../../lib/academyStripe";
import { donationFund } from "@hbic/shared";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("session") ?? "";
  if (!/^cs_(live|test)_[A-Za-z0-9]{10,180}$/.test(id)) return Response.json({ error: "Invalid donation Checkout." }, { status: 400 });
  try {
    const session = await academyStripe().checkout.sessions.retrieve(id);
    const fund = donationFund(session.metadata?.donationCategory);
    if (session.metadata?.hbicPaymentKind !== "donation" || !fund || session.currency !== "cad")
      return Response.json({ error: "Donation Checkout not found." }, { status: 404 });
    return Response.json({ paid: session.payment_status === "paid", category: fund.title, amountCents: session.amount_total },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch { return Response.json({ error: "Your donation status could not be confirmed. Check your Stripe confirmation." }, { status: 503 }); }
}
