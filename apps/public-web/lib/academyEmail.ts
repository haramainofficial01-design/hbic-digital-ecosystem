import "server-only";

import { createHash } from "node:crypto";
import type { Firestore, Transaction } from "firebase-admin/firestore";
import { academyDb } from "./academyStore";

type EmailKind = "card_receipt" | "cash_receipt" | "cash_reminder" | "enrollment_confirmed" | "registration" | "academy_update";
type EmailMessage = { kind: EmailKind; key: string; to: string; subject: string; html: string; text: string };

const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
const calgaryDate = (value: string) => new Date(value).toLocaleDateString("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "long", day: "numeric" });
const emailId = (key: string) => createHash("sha256").update(key).digest("hex");

function layout(title: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f5f7f6;font-family:Arial,sans-serif;color:#17313b"><div style="max-width:580px;margin:30px auto;padding:32px;background:#fff;border:1px solid #dbe5e1;border-radius:18px"><p style="margin:0 0 20px;color:#086b70;font-size:13px;font-weight:700;letter-spacing:.12em">MASJID BILAL · QURAN ACADEMY</p><h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:0 0 20px">${escape(title)}</h1>${body}<p style="border-top:1px solid #e5ece9;margin:26px 0 0;padding-top:18px;font-size:13px;color:#657b80">Hazrat Bilal Islamic Centre · Calgary, Alberta<br>Questions? Visit <a href="https://hbic.ca/contact">hbic.ca/contact</a>.</p></div></body></html>`;
}

export function cardReceiptEmail(input: { invoiceId: string; email: string; name: string; period: string; amountCents: number; paidAt: string; invoiceUrl: string | null; testMode: boolean }): EmailMessage {
  const safeUrl = input.invoiceUrl && /^https:\/\/(invoice\.stripe\.com|pay\.stripe\.com)\//.test(input.invoiceUrl) ? input.invoiceUrl : null;
  const link = safeUrl ? `<p><a href="${escape(safeUrl)}" style="color:#086b70;font-weight:700">View your secure Stripe invoice and receipt</a></p>` : "";
  return { kind: "card_receipt", key: `card-receipt:${input.invoiceId}`, to: input.email,
    subject: `${input.testMode ? "TEST · " : ""}HBIC Quran Academy · ${input.period} card payment receipt`,
    html: layout("Your tuition payment is confirmed", `${input.testMode ? "<p><strong>TEST PAYMENT — no real tuition was collected.</strong></p>" : ""}<p>Assalamu alaikum ${escape(input.name)},</p><p>Stripe has confirmed your Quran Academy card payment.</p><p style="font-size:20px"><strong>${escape(money(input.amountCents))}</strong> · ${escape(input.period)}</p><p>Recorded ${escape(calgaryDate(input.paidAt))} · No tax added.</p><p>Stripe invoice: ${escape(input.invoiceId)}</p>${link}<p>Thank you for supporting your child’s learning at Masjid Bilal.</p>`),
    text: `${input.testMode ? "TEST PAYMENT — no real tuition was collected.\n\n" : ""}Assalamu alaikum ${input.name},\n\nStripe has confirmed your HBIC Quran Academy card payment of ${money(input.amountCents)} for ${input.period}. Recorded ${calgaryDate(input.paidAt)}. No tax added.\nStripe invoice: ${input.invoiceId}${safeUrl ? `\nView your invoice: ${safeUrl}` : ""}\n\nThank you,\nMasjid Bilal Quran Academy` };
}

export function cashReceiptEmail(input: { receiptId: string; email: string; name: string; reference: string; period: string; amountCents: number; receivedAt: string; enrollmentState: string; testMode: boolean }): EmailMessage {
  return { kind: "cash_receipt", key: `cash-receipt:${input.receiptId}`, to: input.email,
    subject: `${input.testMode ? "TEST · " : ""}HBIC Quran Academy · ${input.period} cash receipt`,
    html: layout("Cash tuition received", `${input.testMode ? "<p><strong>TEST PAYMENT — no real tuition was collected.</strong></p>" : ""}<p>Assalamu alaikum ${escape(input.name)},</p><p>Authorized HBIC staff have recorded your cash tuition payment.</p><p style="font-size:20px"><strong>${escape(money(input.amountCents))}</strong> · ${escape(input.period)}</p><p>Received ${escape(calgaryDate(input.receivedAt))} · No tax added.</p><p>Receipt: ${escape(input.receiptId)}<br>Academy reference: ${escape(input.reference)}</p><p>Your enrollment is <strong>${escape(input.enrollmentState)}</strong>. Staff check-in is a separate step from payment confirmation.</p>`),
    text: `${input.testMode ? "TEST PAYMENT — no real tuition was collected.\n\n" : ""}Assalamu alaikum ${input.name},\n\nHBIC staff have recorded your cash tuition payment of ${money(input.amountCents)} for ${input.period}. Received ${calgaryDate(input.receivedAt)}. No tax added.\nReceipt: ${input.receiptId}\nAcademy reference: ${input.reference}\nEnrollment: ${input.enrollmentState}. Staff check-in is separate from payment.\n\nMasjid Bilal Quran Academy` };
}

export function cashReminderEmail(input: { uid: string; reference: string; email: string; name: string; period: string; amountCents: number; stage: "upcoming" | "due"; testMode: boolean }): EmailMessage {
  const due = input.stage === "due";
  return { kind: "cash_reminder", key: `cash-reminder:${input.uid}:${input.reference}:${input.period}:${input.stage}`, to: input.email,
    subject: `${input.testMode ? "TEST · " : ""}HBIC Quran Academy · ${input.period} cash tuition ${due ? "due today" : "reminder"}`,
    html: layout(due ? "Cash tuition is due today" : "Your next cash tuition is coming up", `${input.testMode ? "<p><strong>TEST REMINDER — no payment is due from this test.</strong></p>" : ""}<p>Assalamu alaikum ${escape(input.name)},</p><p>${due ? "Your monthly Quran Academy cash tuition is due today, the 1st." : "Your next monthly Quran Academy cash tuition is due on the 1st."}</p><p style="font-size:20px"><strong>${escape(money(input.amountCents))}</strong> · ${escape(input.period)}</p><p>Please pay in person at HBIC. Staff will record your payment and provide a receipt after receiving the cash. No payment is marked paid by this reminder.</p>`),
    text: `${input.testMode ? "TEST REMINDER — no payment is due from this test.\n\n" : ""}Assalamu alaikum ${input.name},\n\nYour HBIC Quran Academy cash tuition of ${money(input.amountCents)} for ${input.period} is ${due ? "due today" : "due on the 1st"}. Please pay in person at HBIC; staff will confirm payment and issue a receipt.\n\nMasjid Bilal Quran Academy` };
}

export function enrollmentConfirmedEmail(input: { uid: string; email: string; name: string; reference: string }): EmailMessage {
  return { kind: "enrollment_confirmed", key: `enrollment-confirmed:${input.uid}:${input.reference}`, to: input.email,
    subject: "HBIC Quran Academy · enrollment confirmed",
    html: layout("Enrollment confirmed", `<p>Assalamu alaikum ${escape(input.name)},</p><p>HBIC staff have confirmed your child’s Quran Academy enrollment. Your Academy reference is <strong>${escape(input.reference)}</strong>.</p><p>Payment standing is tracked separately. Please use your Academy pass for check-in and view your parent dashboard for the current payment status.</p>`),
    text: `Assalamu alaikum ${input.name},\n\nHBIC staff have confirmed your child’s Quran Academy enrollment. Reference: ${input.reference}. Payment standing is tracked separately; check your parent dashboard for its current status.\n\nMasjid Bilal Quran Academy` };
}

export function registrationEmail(input: { uid: string; email: string; name: string; reference: string; period: string; paymentChoice: "card" | "cash" }): EmailMessage {
  const status = input.paymentChoice === "cash"
    ? "Your registration is conditional. Cash tuition is due at HBIC; staff confirm payment only after receiving cash."
    : "Complete secure Stripe Checkout to authorize card tuition. Your enrollment remains awaiting Checkout until Stripe confirms it. This email is not proof of payment.";
  const whatsapp = "https://chat.whatsapp.com/IZhuemIDjR10DTluYIiSQq?mode=gi_t";
  return { kind: "registration", key: `registration:${input.uid}:${input.reference}`, to: input.email,
    subject: "HBIC Quran Academy · registration received",
    html: layout("Your registration has been received", `<p>Assalamu alaikum ${escape(input.name)},</p><p>${escape(status)}</p><p>Academy reference: <strong>${escape(input.reference)}</strong><br>Start month: ${escape(input.period)}</p><p>Classes: Mondays &amp; Thursdays, 5:30–7:00 PM. Staff enrollment confirmation is separate from payment.</p><p><a href="https://hbic.ca/quran-academy">Open your Academy dashboard</a></p><p><a href="${whatsapp}">Join the HBIC Quran Academy WhatsApp group</a> for class updates.</p>`),
    text: `Assalamu alaikum ${input.name},\n\n${status}\nReference: ${input.reference}\nStart month: ${input.period}\nClasses: Mondays & Thursdays, 5:30–7:00 PM. Staff enrollment confirmation is separate from payment.\nDashboard: https://hbic.ca/quran-academy\nJoin the HBIC Quran Academy WhatsApp group: ${whatsapp}` };
}

export function academyUpdateEmail(input: { eventKey: string; uid: string; reference: string; email: string; name: string; title: string; body: string }): EmailMessage {
  return { kind: "academy_update", key: `academy-update:${input.eventKey}:${input.uid}:${input.reference}`, to: input.email,
    subject: `HBIC Quran Academy · ${input.title.slice(0, 150).replace(/[\r\n]/g, " ")}`,
    html: layout(input.title, `<p>Assalamu alaikum ${escape(input.name)},</p><p style="white-space:pre-line">${escape(input.body)}</p><p><a href="https://hbic.ca/quran-academy">View your Academy calendar and updates</a></p><p>You opted into Academy announcement and schedule emails at registration.</p>`),
    text: `Assalamu alaikum ${input.name},\n\n${input.title}\n${input.body}\n\nView your Academy calendar: https://hbic.ca/quran-academy\nYou opted into Academy announcement and schedule emails at registration.` };
}

/** Queue within the same Firestore transaction as the authoritative payment/state update. */
export function queueAcademyEmail(tx: Transaction, db: Firestore, message: EmailMessage) {
  const now = new Date().toISOString();
  const id = emailId(message.key);
  tx.create(db.collection("academyEmailOutbox").doc(id), { ...message, status: "pending", attempts: 0, createdAt: now, nextAttemptAt: now });
  return id;
}

/** Idempotent enqueue for scheduled reminders, outside a payment transaction. */
export async function enqueueAcademyEmail(message: EmailMessage) {
  const db = academyDb();
  const now = new Date().toISOString();
  try {
    await db.collection("academyEmailOutbox").doc(emailId(message.key)).create({ ...message, status: "pending", attempts: 0, createdAt: now, nextAttemptAt: now });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code === 6) return false;
    throw error;
  }
}

export function academyEmailConfigured() {
  return /^re_[A-Za-z0-9_]+$/.test(process.env.ACADEMY_RESEND_API_KEY ?? "") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.ACADEMY_EMAIL_FROM ?? "");
}

/** Failures stay queued; neither a receipt nor a payment is changed by mail delivery. */
export async function dispatchAcademyEmails(limit = 20) {
  if (!academyEmailConfigured()) return { configured: false, sent: 0, failed: 0 };
  const db = academyDb();
  const now = new Date();
  const batch = await db.collection("academyEmailOutbox").where("status", "in", ["pending", "retry", "sending"]).limit(limit).get();
  let sent = 0, failed = 0;
  for (const doc of batch.docs) {
    if (String(doc.data().nextAttemptAt ?? "") > now.toISOString()) continue;
    const lease = `${now.getTime()}-${doc.id}`;
    const claimed = await db.runTransaction(async (tx) => {
      const current = await tx.get(doc.ref);
      if (!current.exists || !["pending", "retry", "sending"].includes(String(current.data()?.status)) ||
          String(current.data()?.nextAttemptAt ?? "") > new Date().toISOString() ||
          current.data()?.status === "sending" && String(current.data()?.leaseUntil ?? "") > new Date().toISOString()) return false;
      tx.update(doc.ref, { status: "sending", lease, leaseUntil: new Date(Date.now() + 60_000).toISOString(), attempts: Number(current.data()?.attempts ?? 0) + 1 });
      return true;
    });
    if (!claimed) continue;
    try {
      const data = doc.data();
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: {
        Authorization: `Bearer ${process.env.ACADEMY_RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": doc.id
      }, body: JSON.stringify({ from: `Masjid Bilal Quran Academy <${process.env.ACADEMY_EMAIL_FROM}>`, to: [data.to], subject: data.subject, html: data.html, text: data.text }), signal: AbortSignal.timeout(4_000) });
      if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
      const result = await response.json() as { id?: string };
      if (!result.id || typeof result.id !== "string") throw new Error("Email provider did not confirm a message ID");
      await doc.ref.update({ status: "sent", providerId: result.id ?? null, sentAt: new Date().toISOString(), lease: null, leaseUntil: null });
      sent += 1;
    } catch (error) {
      const attempts = Number(doc.data().attempts ?? 0) + 1;
      const delay = Math.min(24 * 60 * 60_000, 5 * 60_000 * 2 ** Math.min(attempts, 8));
      await doc.ref.update({ status: "retry", lease: null, leaseUntil: null, nextAttemptAt: new Date(Date.now() + delay).toISOString(),
        lastError: error instanceof Error ? error.message.slice(0, 160) : "Email delivery failed" });
      failed += 1;
    }
  }
  return { configured: true, sent, failed };
}
