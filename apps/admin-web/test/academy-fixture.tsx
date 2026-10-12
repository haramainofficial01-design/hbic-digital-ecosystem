// Browser-only synthetic fixtures. No Firebase credential or live payment request.
import { createRoot } from "react-dom/client";
import { AcademyPanel } from "../components/AcademyPanel";
import type { AcademyPublicFamily } from "@hbic/shared";

const period = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit" }).format(new Date()).slice(0, 7);
const make = (id: string, method: "cash" | "card", names: string[], cents = 5000): AcademyPublicFamily => ({ id, reference: `QA-${id.toUpperCase().padEnd(10, "0")}`,
  guardianName: `${id} Fixture Parent`, email: `${id}@example.invalid`, phone: "4035550100", whatsappConsent: false,
  children: names.map((name, index) => ({ id: `${id}-${index}`, name, age: 9, level: "quran", classId: "fixture-class" })),
  paymentChoice: method, billingMethod: method, enrollmentState: "active", billingPeriod: period, amountCents: cents,
  paymentState: "paid", passToken: id.repeat(50).slice(0,43), cashReminderEligible: false, createdAt: "2026-10-05T18:00:00Z" });
const families = [make("cash", "cash", ["Abdullah Fixture"]), make("card", "card", ["Aisha Fixture"]),
  make("exempt", "cash", ["Hafsa Fixture"]), make("mixed", "cash", ["Bilal Fixture", "Fatima Fixture"], 10000),
  make("withdrawn", "cash", ["History Fixture"], 2500), make("future", "cash", ["Future Fixture"]),
  make("due", "cash", ["Pending Fixture"])];
families[2].children[0].tuitionExempt = true;
families[3].children[1].tuitionExempt = true;
families[4].enrollmentState = "withdrawn";
families[5].billingPeriod = new Date(Date.UTC(Number(period.slice(0,4)), Number(period.slice(5)), 1)).toISOString().slice(0,7);
families[5].enrollmentStartPeriod = families[5].billingPeriod;
families[5].enrollmentState = "conditional"; families[5].paymentState = "cash_due";
families[6].enrollmentState = "conditional"; families[6].paymentState = "cash_due";
const requests: { path: string; method: string; body: Record<string, unknown> }[] = [];
(window as unknown as { academyTestRequests: typeof requests }).academyTestRequests = requests;
const snapshot = (family: AcademyPublicFamily) => ({ ...structuredClone(family), noTuitionDue: family.children.every(child => child.tuitionExempt) });
const attendance: Record<string, string> = {};
async function adminRequest(path: string, init?: RequestInit): Promise<Record<string, any>> {
  const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
  requests.push({ path, method: init?.method ?? "GET", body });
  if (path === "/api/admin/academy") return { families: families.map(snapshot) };
  if (path.endsWith("/pricing")) return { pricing: { tuitionMode: "per_child", monthlyCents: 5000, stripePriceId: "price_fixture" }, billingMode: "live" };
  if (path.endsWith("/content") && !init?.method) return { content: { classes: [{ id: "fixture-class", name: "Monday Quran", teacher: "Fixture Teacher", dayOfWeek: 1, startTime: "17:30", endTime: "19:00", room: "Fixture Room", level: "quran", capacity: 20, active: true }], calendar: [], announcements: [] } };
  if (path.includes("/attendance?")) return { records: Object.entries(attendance).map(([id, status]) => ({ id, status })) };
  if (path.endsWith("/attendance")) { attendance[`${body.familyId}_${body.childId}`] = body.status; return { ok: true }; }
  if (path.includes("/family?")) return { payments: [], receipts: [], audit: [] };
  if (path.endsWith("/scan")) { const family = families.find(f => f.passToken === body.token || f.reference === body.reference); if (!family) throw Error("Fixture pass missing"); return { family: snapshot(family) }; }
  if (path.endsWith("/content") && body.kind === "attendance_group") {
    const child = families.find(f => f.id === body.familyId)?.children.find(c => c.id === body.childId);
    if (child) child.attendanceGroup = body.group; return { ok: true };
  }
  if (path.endsWith("/tuition-exemption")) {
    const family = families.find(f => f.id === body.familyId)!;
    family.children.find(c => c.id === body.childId)!.tuitionExempt = body.exempt;
    return { family: snapshot(family) };
  }
  throw Error(`Unexpected fixture request: ${path}`);
}
createRoot(document.getElementById("root")!).render(<main style={{ padding: 16 }}><AcademyPanel personalSession adminRequest={adminRequest} /></main>);
