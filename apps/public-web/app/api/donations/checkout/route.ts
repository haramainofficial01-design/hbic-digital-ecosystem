import { startDonationCheckout } from "../../../../lib/donationCheckout";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 2048) return Response.json({ error: "Invalid donation request." }, { status: 400 });
    const body = JSON.parse(raw);
    return Response.json({ url: await startDonationCheckout(request, body) });
  } catch (error) {
    // Never forward provider errors, credentials or request bodies to clients.
    const message = error instanceof Error && /^(Choose|Please|Donations|Secure donations|Secure Checkout)/.test(error.message)
      ? error.message : "Secure Checkout could not open. Please try again.";
    return Response.json({ error: message }, { status: 400 });
  }
}
