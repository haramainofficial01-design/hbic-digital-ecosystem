"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AcademyPublicFamily } from "@hbic/shared";

type AdminRequest = (path: string, init?: RequestInit) => Promise<Record<string, any>>;
type AcademyClass = { id: string; name: string; dayOfWeek: number; startTime: string; room: string; active: boolean };
type AcademyCalendar = { id: string; title: string; date: string; type: string };
type AcademyAnnouncement = { id: string; title: string; message: string; priority: string };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function amount(cents: number | null) {
  return cents === null ? "Tuition pending" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

function passToken(input: string) {
  const value = input.trim();
  const matched = value.match(/^https:\/\/hbic\.ca\/a\/([A-Za-z0-9_-]{43})\/?$/i);
  return matched?.[1] ?? (/^[A-Za-z0-9_-]{43}$/.test(value) ? value : "");
}

export function AcademyPanel({ adminRequest }: { adminRequest: AdminRequest }) {
  const [families, setFamilies] = useState<AcademyPublicFamily[]>([]);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "cash_due" | "card_attention">("all");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<AcademyPublicFamily | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tuitionMode, setTuitionMode] = useState<"per_child" | "per_family">("per_child");
  const [monthlyDollars, setMonthlyDollars] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [billingMode, setBillingMode] = useState<"test" | "live" | null>(null);
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [calendar, setCalendar] = useState<AcademyCalendar[]>([]);
  const [announcements, setAnnouncements] = useState<AcademyAnnouncement[]>([]);
  const [classDraft, setClassDraft] = useState({ name: "", teacher: "", dayOfWeek: 1, startTime: "18:00", endTime: "19:30", room: "", level: "qaida", capacity: 20, active: true });
  const [calendarDraft, setCalendarDraft] = useState({ title: "", date: "", type: "no_class", classIds: [] as string[], note: "" });
  const [announcementDraft, setAnnouncementDraft] = useState({ title: "", message: "", priority: "normal", classIds: [] as string[], publishedAt: new Date().toISOString(), expiresAt: null as string | null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    cameraRef.current?.getTracks().forEach((track) => track.stop());
    cameraRef.current = null;
    timerRef.current = null;
  };
  useEffect(() => () => stopCamera(), []);

  async function load() {
    setBusy(true); setMessage("");
    try {
      const [data, pricing, academyContent] = await Promise.all([adminRequest("/api/admin/academy"), adminRequest("/api/admin/academy/pricing"), adminRequest("/api/admin/academy/content")]);
      setFamilies(data.families ?? []);
      setClasses(academyContent.content?.classes ?? []);
      setCalendar(academyContent.content?.calendar ?? []);
      setAnnouncements(academyContent.content?.announcements ?? []);
      if (pricing.pricing.tuitionMode) setTuitionMode(pricing.pricing.tuitionMode);
      if (pricing.pricing.monthlyCents) setMonthlyDollars(String(pricing.pricing.monthlyCents / 100));
      setStripePriceId(pricing.pricing.stripePriceId ?? "");
      setBillingMode(pricing.billingMode === "live" ? "live" : "test");
    }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load Academy records."); }
    finally { setBusy(false); }
  }

  async function scan(value = scanInput) {
    const token = passToken(value);
    if (!token) return setMessage("Scan a valid Academy QR or enter its full hbic.ca/a/ link.");
    setBusy(true); setMessage("");
    try {
      const data = await adminRequest("/api/admin/academy/scan", { method: "POST", body: JSON.stringify({ token }) });
      setScanned(data.family);
      stopCamera();
    } catch (error) { setScanned(null); setMessage(error instanceof Error ? error.message : "Pass scan failed."); }
    finally { setBusy(false); }
  }

  async function startCamera() {
    const Detector = (window as unknown as { BarcodeDetector?: new (options: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) return setMessage("Camera scanning is not supported in this browser. Paste the Academy pass link instead.");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      cameraRef.current = stream;
      if (!videoRef.current) { stopCamera(); return; }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new Detector({ formats: ["qr_code"] });
      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || !cameraRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes[0]) void scan(codes[0].rawValue);
        } catch { /* A frame can fail while the camera focuses. */ }
      }, 500);
    } catch { stopCamera(); setMessage("Camera access was unavailable. Paste the Academy pass link instead."); }
  }

  async function receiveCash() {
    if (!scanned || scanned.amountCents === null || scanned.paymentState !== "cash_due") return;
    if (!window.confirm(`Confirm that ${amount(scanned.amountCents)} cash was received for ${scanned.billingPeriod} from ${scanned.guardianName}?`)) return;
    setBusy(true);
    try {
      const data = await adminRequest("/api/admin/academy/cash", { method: "POST", body: JSON.stringify({ familyId: scanned.id, period: scanned.billingPeriod }) });
      setMessage(`${data.receipt.billingMode === "test" ? "TEST PAYMENT RECEIPT" : "Cash received"}. Receipt ${data.receipt.number} was recorded.`);
      await scan(scanned.passToken);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not record cash."); }
    finally { setBusy(false); }
  }

  async function savePricing() {
    const monthlyCents = Math.round(Number(monthlyDollars) * 100);
    if (!Number.isSafeInteger(monthlyCents) || monthlyCents < 100 || !window.confirm(`Set Academy tuition to ${amount(monthlyCents)} per month, ${tuitionMode.replace("_", " ")}? This will affect unpriced current/future months.`)) return;
    setBusy(true);
    try {
      await adminRequest("/api/admin/academy/pricing", { method: "POST", body: JSON.stringify({ tuitionMode, monthlyCents, stripePriceId }) });
      setMessage("Tuition setting saved. Existing paid or previously priced months are unchanged.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save tuition."); }
    finally { setBusy(false); }
  }

  async function replacePass() {
    if (!scanned || !window.confirm(`Replace the Academy pass for ${scanned.guardianName}? Their old QR will stop working.`)) return;
    setBusy(true);
    try {
      await adminRequest("/api/admin/academy/pass", { method: "POST", body: JSON.stringify({ familyId: scanned.id, action: "replace" }) });
      setScanned(null); setMessage("Pass replaced. Ask the parent to refresh their Academy pass.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not replace pass."); }
    finally { setBusy(false); }
  }

  async function saveItem(kind: "class" | "calendar" | "announcement", item: unknown) {
    setBusy(true);
    try {
      const result = await adminRequest("/api/admin/academy/content", { method: "POST", body: JSON.stringify({ kind, item }) });
      await load();
      const saved = `${kind === "class" ? "Class" : kind === "calendar" ? "Calendar item" : "Announcement"} saved.`;
      setMessage(result.notification?.status === "provider_error" ? `${saved} Parent push notification needs attention: ${result.notification.error}` :
        result.notification ? `${saved} Update sent to ${result.notification.successCount ?? 0} Academy device(s).` : saved);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save Academy content."); }
    finally { setBusy(false); }
  }

  async function assignChild(childId: string, classId: string) {
    if (!scanned || !classId) return;
    setBusy(true);
    try {
      await adminRequest("/api/admin/academy/content", { method: "POST", body: JSON.stringify({ kind: "assignment", familyId: scanned.id, childId, classId }) });
      await scan(scanned.passToken);
      await load();
      setMessage("Child assigned to class.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not assign class."); }
    finally { setBusy(false); }
  }

  const filtered = useMemo(() => families.filter((family) => {
    const haystack = [family.guardianName, family.email, family.phone, family.reference, ...family.children.map((child) => child.name)].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase()) && (paymentFilter === "all" || family.paymentState === paymentFilter);
  }), [families, query, paymentFilter]);
  const cashDue = families.filter((family) => family.paymentState === "cash_due").length;
  const paid = families.filter((family) => family.paymentState === "paid").length;
  const collectedCents = families.reduce((total, family) => total + (family.paymentState === "paid" ? family.amountCents ?? 0 : 0), 0);
  const outstandingCents = families.reduce((total, family) => total + (["cash_due", "card_attention"].includes(family.paymentState) ? family.amountCents ?? 0 : 0), 0);

  return <section className="academy-admin">
    <div className="academy-admin-head"><div><h2>Quran Academy</h2>{billingMode === "test" ? <strong className="academy-admin-test-mode">SANDBOX · TEST PAYMENTS ONLY</strong> : null}<p>Child records require a personal administrator account with MFA.</p></div><button className="secondary" onClick={() => void load()} disabled={busy}>Load Academy records</button></div>
    <div className="academy-admin-stats"><div><strong>{families.length}</strong><span>Families loaded</span></div><div><strong>{families.reduce((total, item) => total + item.children.length, 0)}</strong><span>Children</span></div><div><strong>{cashDue}</strong><span>Cash due</span></div><div><strong>{paid}</strong><span>Paid this month</span></div><div><strong>{amount(collectedCents)}</strong><span>Collected · loaded families</span></div><div><strong>{amount(outstandingCents)}</strong><span>Outstanding · loaded families</span></div></div>
    <div className="academy-admin-grid"><div className="academy-admin-card"><h3>Scan Academy pass</h3><p>Live payment status always comes from the server, never from text on a screenshot.</p>
      <label>QR link or token<input value={scanInput} onChange={(event) => setScanInput(event.target.value)} placeholder="https://hbic.ca/a/…" /></label>
      <div className="academy-admin-actions"><button className="primary" onClick={() => void scan()} disabled={busy}>Look up pass</button><button className="secondary" onClick={() => void startCamera()} disabled={busy}>Use camera</button><button className="secondary" onClick={stopCamera}>Stop camera</button></div>
      <video ref={videoRef} muted playsInline className="academy-admin-video" aria-label="Academy QR scanner camera" />
      {scanned ? <div className="academy-admin-result"><span className="pill">{scanned.reference}</span><h3>{scanned.guardianName}</h3><p>{scanned.phone} · {scanned.email}</p><div className="academy-admin-actions"><a href={`tel:${scanned.phone.replace(/[^\d+]/g, "")}`}>Call parent</a><a href={`mailto:${encodeURIComponent(scanned.email)}`}>Email parent</a>{scanned.whatsappConsent ? <a href={`https://wa.me/${scanned.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "1$1")}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a> : null}</div><p>WhatsApp consent: {scanned.whatsappConsent ? "Yes" : "No"}</p>
        <ul>{scanned.children.map((child) => <li key={child.id}>{child.name} · Age {child.age} · {child.level.replace("_", " ")}
          <select aria-label={`Class for ${child.name}`} value={child.classId ?? ""} onChange={(event) => void assignChild(child.id, event.target.value)}><option value="">Awaiting class</option>{classes.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {days[item.dayOfWeek]} {item.startTime}</option>)}</select>
        </li>)}</ul>
        <div className="academy-admin-payment"><strong>{scanned.paymentState === "paid" ? "✓ PAID" : scanned.paymentState === "cash_due" ? "CASH DUE" : "TUITION PENDING"}</strong><span>{scanned.billingPeriod} · {amount(scanned.amountCents)} · {scanned.paymentChoice}</span><span>Policy: {scanned.policyVersion ?? "not recorded"}{scanned.policyAcceptedAt ? ` · accepted ${new Date(scanned.policyAcceptedAt).toLocaleDateString("en-CA")}` : ""}</span></div>
        {scanned.paymentChoice === "cash" && scanned.paymentState === "cash_due" ? <button className="primary" onClick={() => void receiveCash()} disabled={busy}>Mark cash received</button> : null}
        <button className="secondary" onClick={() => void replacePass()} disabled={busy}>Replace lost pass</button>
      </div> : null}
    </div>
    <div className="academy-admin-card"><h3>Families</h3><label>Search parent, child, phone, email or reference<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Payment status<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}><option value="all">All</option><option value="paid">Paid</option><option value="cash_due">Cash due</option><option value="card_attention">Card needs attention</option></select></label>
      <div className="academy-admin-family-list">{filtered.map((family) => <button key={family.id} onClick={() => void scan(family.passToken)}><strong>{family.guardianName}</strong><span>{family.children.map((child) => child.name).join(" · ")}</span><em>{family.paymentState.replace("_", " ")} · {amount(family.amountCents)}</em></button>)}</div>
    </div></div>
    <div className="academy-admin-card"><h3>Tuition setup</h3><p>Director setting only. Card billing stays in sandbox until the approved Stripe account, recurring Price, webhook and policy are tested. Existing paid months are unchanged.</p><div className="academy-admin-actions"><label>Model<select value={tuitionMode} onChange={(event) => setTuitionMode(event.target.value as typeof tuitionMode)}><option value="per_child">Per child</option><option value="per_family">Per family</option></select></label><label>Monthly amount (CAD)<input type="number" min="1" max="1000" step="0.01" value={monthlyDollars} onChange={(event) => setMonthlyDollars(event.target.value)} /></label><label>Sandbox recurring Price ID<input value={stripePriceId} onChange={(event) => setStripePriceId(event.target.value)} placeholder="price_…" /></label><button className="secondary" disabled={busy} onClick={() => void savePricing()}>Save tuition</button></div></div>
    <div className="academy-admin-grid">
      <div className="academy-admin-card"><h3>Classes</h3><p>{classes.length} class(es) configured.</p>{classes.map((item) => <p key={item.id}>{item.name} · {days[item.dayOfWeek]} {item.startTime} · {item.room}</p>)}
        <label>Class name<input value={classDraft.name} onChange={(e) => setClassDraft({ ...classDraft, name: e.target.value })} /></label>
        <label>Teacher<input value={classDraft.teacher} onChange={(e) => setClassDraft({ ...classDraft, teacher: e.target.value })} /></label>
        <label>Room<input value={classDraft.room} onChange={(e) => setClassDraft({ ...classDraft, room: e.target.value })} /></label>
        <div className="academy-admin-actions"><label>Day<select value={classDraft.dayOfWeek} onChange={(e) => setClassDraft({ ...classDraft, dayOfWeek: Number(e.target.value) })}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label>Start<input type="time" value={classDraft.startTime} onChange={(e) => setClassDraft({ ...classDraft, startTime: e.target.value })} /></label><label>End<input type="time" value={classDraft.endTime} onChange={(e) => setClassDraft({ ...classDraft, endTime: e.target.value })} /></label>
          <label>Level<select value={classDraft.level} onChange={(e) => setClassDraft({ ...classDraft, level: e.target.value })}><option value="qaida">Qaida</option><option value="quran">Quran</option><option value="mixed">Mixed</option></select></label>
          <label>Capacity<input type="number" min="1" max="100" value={classDraft.capacity} onChange={(e) => setClassDraft({ ...classDraft, capacity: Number(e.target.value) })} /></label></div>
        <button className="secondary" disabled={busy} onClick={() => void saveItem("class", classDraft)}>Add class</button></div>
      <div className="academy-admin-card"><h3>Calendar and closures</h3><p>Closures are explicit admin entries; external holidays never cancel a class automatically.</p>{calendar.slice(0, 8).map((item) => <p key={item.id}>{item.date} · {item.title} ({item.type.replace("_", " ")})</p>)}
        <label>Title<input value={calendarDraft.title} onChange={(e) => setCalendarDraft({ ...calendarDraft, title: e.target.value })} /></label>
        <div className="academy-admin-actions"><label>Date<input type="date" value={calendarDraft.date} onChange={(e) => setCalendarDraft({ ...calendarDraft, date: e.target.value })} /></label><label>Type<select value={calendarDraft.type} onChange={(e) => setCalendarDraft({ ...calendarDraft, type: e.target.value })}><option value="no_class">No class</option><option value="holiday">Holiday</option><option value="time_changed">Time changed</option><option value="event">Event</option><option value="class">Class</option></select></label></div>
        <label>Note<input value={calendarDraft.note} onChange={(e) => setCalendarDraft({ ...calendarDraft, note: e.target.value })} /></label><button className="secondary" disabled={busy} onClick={() => void saveItem("calendar", calendarDraft)}>Add calendar item</button></div>
    </div>
    <div className="academy-admin-card"><h3>Academy announcements</h3>{announcements.slice(0, 8).map((item) => <p key={item.id}>{item.priority === "high" ? "Important · " : ""}{item.title}</p>)}<label>Title<input value={announcementDraft.title} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, title: e.target.value })} /></label><label>Message<textarea value={announcementDraft.message} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, message: e.target.value })} /></label><label>Priority<select value={announcementDraft.priority} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, priority: e.target.value })}><option value="normal">Normal</option><option value="high">Important</option></select></label><button className="secondary" disabled={busy} onClick={() => void saveItem("announcement", { ...announcementDraft, publishedAt: new Date().toISOString() })}>Publish to Academy parents</button></div>
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
