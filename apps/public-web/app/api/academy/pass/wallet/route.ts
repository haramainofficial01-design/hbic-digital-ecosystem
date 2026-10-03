import { academyParent, academyDb, AcademyError } from "../../../../../lib/academyStore";
import { createAppleAcademyPass, currentWalletFamily, appleWalletTicketSecret, academyWalletExpiration } from "../../../../../lib/academyWallet";
import { createWalletTicket, readWalletTicket, walletPassHash } from "../../../../../lib/academyWalletTicket";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

function failure(error: unknown) {
  return Response.json({ ok: false, error: error instanceof AcademyError ? error.message : "Wallet pass could not be prepared. Return to your Academy pass and try again." },
    { status: error instanceof AcademyError ? error.status : 400, headers });
}

export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const family = await currentWalletFamily(parent.uid);
    // Do not expose an Add button based merely on the presence of credentials.
    await createAppleAcademyPass(family);
    const ticket = createWalletTicket(parent.uid, family.passToken, appleWalletTicketSecret());
    return Response.json({ ok: true, appleUrl: `https://hbic.ca/api/academy/pass/wallet?ticket=${ticket}` }, { headers });
  } catch (error) { return failure(error); }
}

export async function GET(request: Request) {
  try {
    const ticket = readWalletTicket(new URL(request.url).searchParams.get("ticket") ?? "", appleWalletTicketSecret());
    const family = await currentWalletFamily(ticket.uid, ticket.passHash);
    const pass = await createAppleAcademyPass(family);
    await academyDb().collection("academyPasses").doc(walletPassHash(family.passToken)).update({ walletExpiresAt: academyWalletExpiration });
    return new Response(new Uint8Array(pass), { headers: { ...headers, "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="HBIC-Academy-${family.reference}.pkpass"` } });
  } catch (error) { return failure(error); }
}
