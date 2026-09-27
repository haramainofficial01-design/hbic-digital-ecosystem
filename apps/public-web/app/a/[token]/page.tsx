import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Academy pass | Masjid Bilal", robots: { index: false, follow: false } };

export default async function PassLookupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (process.env.ACADEMY_PREVIEW_ENABLED !== "true" || !/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  // Deliberately never resolve family details here. Only an MFA-protected desk scan can do that.
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#0b2637", color: "#fff" }}>
    <div style={{ maxWidth: 480, textAlign: "center" }}>
      <p style={{ color: "#ddb568", letterSpacing: ".18em", fontWeight: 800 }}>HBIC QURAN ACADEMY</p>
      <h1>Academy pass</h1>
      <p>Please show this QR to an authorized HBIC staff member. The current registration and payment status is only visible after a secure desk scan.</p>
    </div>
  </main>;
}
