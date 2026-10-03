import { academyParent, AcademyError } from "../../../../../lib/academyStore";
import { currentWalletFamily } from "../../../../../lib/academyWallet";
import { createGoogleAcademyPass } from "../../../../../lib/academyGoogleWallet";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };

export async function POST(request: Request) {
  try {
    const parent = await academyParent(request);
    const family = await currentWalletFamily(parent.uid);
    const googleUrl = await createGoogleAcademyPass(family);
    return Response.json({ ok: true, googleUrl }, { headers });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof AcademyError ? error.message : "Google Wallet could not be prepared." }, { status: error instanceof AcademyError ? error.status : 503, headers });
  }
}
