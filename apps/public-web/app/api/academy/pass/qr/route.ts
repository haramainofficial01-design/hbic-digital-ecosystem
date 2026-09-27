import QRCode from "qrcode";
import { academyParent, getAcademyFamily, AcademyError } from "../../../../../lib/academyStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const parent = await academyParent(request);
    const family = await getAcademyFamily(parent.uid);
    if (!family) throw new AcademyError("Register before opening your Academy pass.", 404);
    if (!family.passToken) throw new AcademyError("This Academy pass is inactive. Please contact HBIC.", 410);
    const qr = await QRCode.toBuffer(`https://hbic.ca/a/${family.passToken}`, {
      type: "png", width: 720, margin: 3, errorCorrectionLevel: "M",
      color: { dark: "#0b2a3b", light: "#ffffff" }
    });
    return new Response(new Uint8Array(qr), {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'" }
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : "Unable to create pass." },
      { status: error instanceof AcademyError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
