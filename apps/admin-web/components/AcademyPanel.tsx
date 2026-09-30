"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AcademyPublicFamily } from "@hbic/shared";
import { parseAcademyPassLookup } from "../lib/academyPassLookup";

type AdminRequest = (path: string, init?: RequestInit) => Promise<Record<string, any>>;
type AcademyClass = { id: string; name: string; teacher: string; dayOfWeek: number; startTime: string; endTime: string; room: string; level: "qaida" | "quran" | "mixed"; capacity: number; enrolledCount?: number; active: boolean };
type AcademyCalendar = { id: string; title: string; date: string; type: string; note?: string; classIds?: string[] };
type AcademyAnnouncement = { id: string; title: string; message: string; priority: string };
type FamilyHistory = { payments: { period: string; method: string; status: string; amountCents: number | null; paidAt: string | null }[]; receipts: { number: string; period: string; amountCents: number; receivedAt: string }[]; audit: { id: string; action: string; at: string }[] };
const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const sections = ["Overview", "Families", "Students", "Registrations", "Classes", "Calendar", "Announcements", "Payments", "Scan Pass", "Programs", "Settings"] as const;
type AcademySection = typeof sections[number];

function amount(cents: number | null) {
  return cents === null ? "Tuition pending" : new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}

export function AcademyPanel({ adminRequest, personalSession }: { adminRequest: AdminRequest; personalSession: boolean }) {
  const [section, setSection] = useState<AcademySection>("Overview");
  const [loaded, setLoaded] = useState(false);
  const [families, setFamilies] = useState<AcademyPublicFamily[]>([]);
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "cash_due" | "past_due" | "card_attention">("all");
  const [scanInput, setScanInput] = useState("");
  const [scanned, setScanned] = useState<AcademyPublicFamily | null>(null);
  const [history, setHistory] = useState<FamilyHistory | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tuitionMode, setTuitionMode] = useState<"per_child" | "per_family">("per_child");
  const [monthlyDollars, setMonthlyDollars] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [billingMode, setBillingMode] = useState<"test" | "live" | null>(null);
  const [classes, setClasses] = useState<AcademyClass[]>([]);
  const [calendar, setCalendar] = useState<AcademyCalendar[]>([]);
  const [announcements, setAnnouncements] = useState<AcademyAnnouncement[]>([]);
  const [classDraft, setClassDraft] = useState({ name: "", teacher: "", dayOfWeek: 1, startTime: "17:30", endTime: "19:00", room: "", level: "qaida", capacity: 20, active: true });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [calendarDraft, setCalendarDraft] = useState({ title: "", date: "", type: "no_class", classIds: [] as string[], note: "" });
  const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
  const [announcementDraft, setAnnouncementDraft] = useState({ title: "", message: "", priority: "normal", classIds: [] as string[], publishedAt: new Date().toISOString(), expiresAt: null as string | null });
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void } | null>(null);
  const cameraSessionRef = useRef(0);

  const stopCamera = () => {
    cameraSessionRef.current += 1;
    scannerRef.current?.stop();
    scannerRef.current = null;
  };
  useEffect(() => () => stopCamera(), []);

  const load = useCallback(async (silent = false) => {
    if (!silent) { setBusy(true); setMessage(""); }
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
      setLoaded(true);
    }
    catch (error) { if (!silent) { setLoaded(false); setMessage(error instanceof Error ? error.message : "Unable to load Academy records."); } }
    finally { if (!silent) setBusy(false); }
  }, [adminRequest]);
  useEffect(() => { if (personalSession) void load(); }, [personalSession, load]);
  useEffect(() => {
    if (!personalSession) return;
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [personalSession, load]);

  async function scan(value = scanInput) {
    const lookup = parseAcademyPassLookup(value);
    if (!lookup) return setMessage("Enter the full QA- reference or scan/paste the Academy QR link.");
    setBusy(true); setMessage("");
    try {
      const data = await adminRequest("/api/admin/academy/scan", { method: "POST", body: JSON.stringify(lookup) });
      setScanned(data.family);
      setHistory(null);
      stopCamera();
      try {
        const detail = await adminRequest(`/api/admin/academy/family?familyId=${encodeURIComponent(data.family.id)}`);
        setHistory(detail as FamilyHistory);
      } catch { setMessage("Pass verified, but payment history could not be loaded. Refresh the record before recording cash."); }
    } catch (error) { setScanned(null); setHistory(null); setMessage(error instanceof Error ? error.message : "Pass scan failed."); }
    finally { setBusy(false); }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) return setMessage("Camera scanning is unavailable. Paste the Academy pass link instead.");
    stopCamera();
    const session = cameraSessionRef.current;
    try {
      // ZXing supports browsers without the experimental BarcodeDetector API,
      // including the iOS Safari devices used at the Academy desk.
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const controls = await new BrowserQRCodeReader().decodeFromConstraints(
        { video: { facingMode: "environment" }, audio: false }, videoRef.current,
        (result, _error, activeControls) => {
          if (!result || session !== cameraSessionRef.current) return;
          activeControls.stop();
          scannerRef.current = null;
          cameraSessionRef.current += 1;
          void scan(result.getText());
        }
      );
      if (session === cameraSessionRef.current) scannerRef.current = controls;
      else controls.stop();
    } catch { stopCamera(); setMessage("Camera access was unavailable. Paste the Academy pass link instead."); }
  }

  async function receiveCash() {
    if (!scanned || scanned.amountCents === null || !["cash_due", "past_due"].includes(scanned.paymentState)) return;
    if (!window.confirm(`Confirm that ${amount(scanned.amountCents)} cash was received for ${scanned.billingPeriod} from ${scanned.guardianName}?`)) return;
    setBusy(true);
    try {
      const data = await adminRequest("/api/admin/academy/cash", { method: "POST", body: JSON.stringify({ familyId: scanned.id, period: scanned.billingPeriod }) });
      await scan(scanned.passToken);
      await load();
      setMessage(`${data.receipt.billingMode === "test" ? "TEST PAYMENT RECEIPT" : "Cash received"}. Receipt ${data.receipt.number} was recorded. Enrollment check-in remains a separate action.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not record cash."); }
    finally { setBusy(false); }
  }

  async function confirmEnrollment() {
    if (!scanned || scanned.enrollmentState !== "conditional") return;
    if (!window.confirm(`Confirm that ${scanned.guardianName} was physically checked in at HBIC? This changes enrollment to ACTIVE but does not change payment status.`)) return;
    setBusy(true);
    try {
      await adminRequest("/api/admin/academy/check-in", { method: "POST", body: JSON.stringify({ familyId: scanned.id }) });
      await scan(scanned.passToken);
      await load();
      setMessage("Enrollment is ACTIVE. Payment status was not changed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not confirm enrollment."); }
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

  async function saveItem(kind: "class" | "calendar" | "announcement", item: unknown, id?: string) {
    setBusy(true);
    try {
      const result = await adminRequest("/api/admin/academy/content", { method: "POST", body: JSON.stringify({ kind, item, id }) });
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
  const cashDue = families.filter((family) => ["cash_due", "past_due"].includes(family.paymentState) && family.paymentChoice === "cash").length;
  const paid = families.filter((family) => family.paymentState === "paid").length;
  const collectedCents = families.reduce((total, family) => total + (family.paymentState === "paid" ? family.amountCents ?? 0 : 0), 0);
  const outstandingCents = families.reduce((total, family) => total + (["cash_due", "past_due", "card_attention"].includes(family.paymentState) ? family.amountCents ?? 0 : 0), 0);
  const activeChildren = families.filter((family) => ["conditional", "submitted", "approved", "active"].includes(family.enrollmentState)).flatMap((family) => family.children.filter((child) => !child.cancelEffectiveAt || Date.parse(child.cancelEffectiveAt) > Date.now()).map((child) => ({ family, child })));
  const pendingFamilies = families.filter((family) => ["conditional", "submitted", "approved", "waitlisted"].includes(family.enrollmentState));
  const paymentLabel = (family: AcademyPublicFamily) => family.paymentState === "paid" ? family.paymentChoice === "card" ? "Paid online" : "Paid cash" :
    family.paymentState === "cash_due" ? "Cash due" : family.paymentState === "past_due" ? "Past due" : family.paymentState === "card_attention" ? "Payment needs attention" :
    family.paymentState === "scheduled" ? "Card scheduled" : family.paymentState === "not_due" ? "No tuition due" : "Awaiting tuition";
  const familyRow = (family: AcademyPublicFamily) => <button key={family.id} type="button" onClick={() => { setScanInput(`https://hbic.ca/a/${family.passToken}`); setSection("Scan Pass"); void scan(family.passToken); }}><strong>{family.guardianName}</strong><span>{family.reference} · {family.children.map((child) => child.name).join(" · ")}</span><em>{paymentLabel(family)} · {amount(family.amountCents)}</em></button>;

  if (!personalSession) return <section className="academy-admin"><div className="academy-admin-card" role="status"><h2>Quran Academy records are locked</h2><p>Shared access can publish content, but family names, registration details, payment status, and pass lookup require a personal administrator sign-in with MFA. Sign in above, then return here. No zero totals are shown until the live records have loaded.</p></div></section>;

  return <section className="academy-admin">
    <div className="academy-admin-head"><div><h2>Quran Academy</h2>{billingMode === "test" ? <strong className="academy-admin-test-mode">SANDBOX · TEST PAYMENTS ONLY</strong> : null}<p>{!personalSession ? "Sign in with a personal administrator account and complete MFA to load private family records." : busy ? "Loading current Academy records…" : loaded ? `Current records loaded · ${families.length} families` : "Academy records could not be loaded. Check the message below."}</p></div><button className="secondary" onClick={() => void load()} disabled={busy || !personalSession}>Refresh Academy records</button></div>
    <nav className="academy-admin-tabs" aria-label="Quran Academy areas">{sections.map((item) => <button type="button" key={item} aria-current={section === item ? "page" : undefined} onClick={() => setSection(item)}>{item}</button>)}</nav>
    {section === "Overview" ? <><div className="academy-admin-stats"><div><strong>{activeChildren.length}</strong><span>Students, including conditional</span></div><div><strong>{pendingFamilies.length}</strong><span>Conditional registrations</span></div><div><strong>{cashDue}</strong><span>Cash due / past due</span></div><div><strong>{paid}</strong><span>Paid this month</span></div><div><strong>{amount(collectedCents)}</strong><span>Current paid ledgers</span></div><div><strong>{amount(outstandingCents)}</strong><span>Current outstanding ledgers</span></div></div><div className="academy-admin-grid"><div className="academy-admin-card"><h3>Upcoming classes & closures</h3>{calendar.filter((item) => item.date >= new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())).slice(0, 6).map((item) => <p key={item.id}>{item.date} · {item.title}</p>)}</div><div className="academy-admin-card"><h3>Latest announcement</h3>{announcements[0] ? <><strong>{announcements[0].title}</strong><p>{announcements[0].message}</p></> : <p>No announcement published.</p>}</div></div></> : null}
    {section === "Scan Pass" ? <div className="academy-admin-grid"><div className="academy-admin-card"><h3>Scan Academy pass</h3><p>Live payment status always comes from the server, never from text on a screenshot.</p>
      <label>Full QA- reference or QR link<input value={scanInput} onChange={(event) => setScanInput(event.target.value)} placeholder="QA-XXXXXXXXXX" autoCapitalize="characters" /></label><p>Without a camera, type the entire QA- code shown on the pass, then select Look up pass. Cash can be marked received only after checking the live family record; card payments are confirmed by Stripe.</p>
      <div className="academy-admin-actions"><button className="primary" onClick={() => void scan()} disabled={busy}>Look up pass</button><button className="secondary" onClick={() => void startCamera()} disabled={busy}>Use camera</button><button className="secondary" onClick={stopCamera}>Stop camera</button></div>
      <video ref={videoRef} muted playsInline className="academy-admin-video" aria-label="Academy QR scanner camera" />
      {scanned ? <div className="academy-admin-result"><span className="pill">{scanned.reference}</span><h3>{scanned.guardianName}</h3><p>{scanned.phone} · {scanned.email}</p><p>Registered {new Date(scanned.createdAt).toLocaleString("en-CA")} · Enrollment: {scanned.enrollmentState.replace("_", " ")}</p><div className="academy-admin-actions"><a href={`tel:${scanned.phone.replace(/[^\d+]/g, "")}`}>Call parent</a><a href={`mailto:${encodeURIComponent(scanned.email)}`}>Email parent</a><button className="secondary" type="button" onClick={() => void navigator.clipboard.writeText(scanned.phone).then(() => setMessage("Phone number copied.")).catch(() => setMessage("Could not copy this phone number."))}>Copy phone</button>{scanned.whatsappConsent ? <a href={`https://wa.me/${scanned.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "1$1")}`} target="_blank" rel="noopener noreferrer">Open WhatsApp</a> : null}</div><p>WhatsApp consent: {scanned.whatsappConsent ? "Yes" : "No"}</p>
        <ul>{scanned.children.map((child) => <li key={child.id}>{child.name} · Age {child.age} · {child.level.replace("_", " ")}
          <select aria-label={`Class for ${child.name}`} value={child.classId ?? ""} onChange={(event) => void assignChild(child.id, event.target.value)}><option value="">Awaiting class</option>{classes.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name} · {days[item.dayOfWeek]} {item.startTime}</option>)}</select>
        </li>)}</ul>
        <div className="academy-admin-payment"><strong>{paymentLabel(scanned)}</strong><span>{scanned.billingPeriod} · {amount(scanned.amountCents)} · {scanned.paymentChoice === "card" ? "Online payment / card" : "Cash"}</span><span>Policy: {scanned.policyVersion ?? "not recorded"}{scanned.policyAcceptedAt ? ` · accepted ${new Date(scanned.policyAcceptedAt).toLocaleDateString("en-CA")}` : ""}</span></div>
        {history ? <><h4>Payment history</h4>{history.payments.length ? history.payments.map((payment) => <p key={payment.period}>{payment.period} · {payment.method} · {payment.status.replaceAll("_", " ")} · {amount(payment.amountCents)}{payment.paidAt ? ` · paid ${new Date(payment.paidAt).toLocaleDateString("en-CA")}` : ""}</p>) : <p>No payment months recorded yet.</p>}{history.receipts.length ? <><h4>Cash receipts</h4>{history.receipts.map((receipt) => <p key={receipt.number}>{receipt.number} · {receipt.period} · {amount(receipt.amountCents)}</p>)}</> : null}{history.audit.length ? <><h4>Recent record activity</h4>{history.audit.slice(0, 10).map((entry) => <p key={entry.id}>{entry.at ? new Date(entry.at).toLocaleString("en-CA") : "Date unavailable"} · {entry.action.replaceAll("_", " ")}</p>)}</> : null}</> : null}
        {scanned.paymentChoice === "cash" && ["cash_due", "past_due"].includes(scanned.paymentState) ? <button className="primary" onClick={() => void receiveCash()} disabled={busy}>Mark cash received</button> : null}
        {scanned.enrollmentState === "conditional" ? <button className="secondary" onClick={() => void confirmEnrollment()} disabled={busy}>Confirm enrollment / check in</button> : null}
        <button className="secondary" onClick={() => void replacePass()} disabled={busy}>Replace lost pass</button>
      </div> : null}
    </div></div> : null}
    {section === "Families" ? <div className="academy-admin-card"><h3>Families</h3><label>Search parent, child, phone, email or reference<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Payment status<select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value as typeof paymentFilter)}><option value="all">All</option><option value="paid">Paid</option><option value="cash_due">Cash due</option><option value="past_due">Past due</option><option value="card_attention">Payment needs attention</option></select></label><div className="academy-admin-family-list">{filtered.map(familyRow)}</div></div> : null}
    {section === "Students" ? <div className="academy-admin-card"><h3>Students</h3><p>Current students only; cancelled children remain in registration history.</p><div className="academy-admin-family-list">{activeChildren.map(({ family, child }) => <button key={`${family.id}-${child.id}`} type="button" onClick={() => { setSection("Scan Pass"); void scan(family.passToken); }}><strong>{child.name}</strong><span>Age {child.age} · {child.level.replace("_", " ")} · {classes.find((item) => item.id === child.classId)?.name ?? "Awaiting class"}</span><em>{family.guardianName} · {paymentLabel(family)}</em></button>)}</div></div> : null}
    {section === "Registrations" ? <div className="academy-admin-card"><h3>Registrations</h3><p>New registrations appear here as soon as the parent submits, for both card and cash.</p><div className="academy-admin-family-list">{families.map((family) => <button key={family.id} type="button" onClick={() => { setSection("Scan Pass"); void scan(family.passToken); }}><strong>{family.reference} · {family.guardianName}</strong><span>{new Date(family.createdAt).toLocaleString("en-CA")} · {family.children.length} child(ren) · {family.enrollmentState}</span><em>{family.paymentChoice === "card" ? "Card" : "Cash"} · {paymentLabel(family)}</em></button>)}</div></div> : null}
    {section === "Payments" ? <div className="academy-admin-card"><h3>Payments</h3><p>Current-month status comes from the server ledger. Card payment confirmation is set by Stripe webhooks, not by scanning a pass.</p><div className="academy-admin-family-list">{families.map((family) => <button key={family.id} type="button" onClick={() => { setSection("Scan Pass"); void scan(family.passToken); }}><strong>{family.guardianName} · {amount(family.amountCents)}</strong><span>{family.billingPeriod} · {family.children.length} child(ren) · {family.paymentChoice === "card" ? "Online card" : "Cash"}</span><em>{paymentLabel(family)}</em></button>)}</div></div> : null}
    {section === "Settings" ? <div className="academy-admin-card"><h3>Tuition setup</h3><p>{billingMode === "live" ? "Live billing uses the approved $50-per-child Stripe price. Existing paid months are unchanged." : "Sandbox billing is active. Existing paid months are unchanged."}</p><div className="academy-admin-actions"><label>Model<select value={tuitionMode} onChange={(event) => setTuitionMode(event.target.value as typeof tuitionMode)}><option value="per_child">Per child</option><option value="per_family">Per family</option></select></label><label>Monthly amount (CAD)<input type="number" min="1" max="1000" step="0.01" value={monthlyDollars} onChange={(event) => setMonthlyDollars(event.target.value)} /></label><label>{billingMode === "live" ? "Approved live recurring Price ID" : "Sandbox recurring Price ID"}<input value={stripePriceId} onChange={(event) => setStripePriceId(event.target.value)} placeholder="price_…" /></label><button className="secondary" disabled={busy} onClick={() => void savePricing()}>Save tuition</button></div></div> : null}
    {section === "Classes" || section === "Calendar" ? <div className="academy-admin-grid">
      {section === "Classes" ? <div className="academy-admin-card"><h3>Classes</h3><p>{classes.length} class(es) configured. Regular class time is 5:30–7:00 p.m.; monthly special activities are managed in Calendar.</p>{classes.map((item) => <p key={item.id}>{item.name} · {days[item.dayOfWeek]} {item.startTime}–{item.endTime} · {item.room} · {item.enrolledCount ?? 0}/{item.capacity} students · {item.active ? "Active" : "Inactive"} <button className="text-button" type="button" onClick={() => { setEditingClassId(item.id); setClassDraft({ name: item.name, teacher: item.teacher, dayOfWeek: item.dayOfWeek, startTime: item.startTime, endTime: item.endTime, room: item.room, level: item.level, capacity: item.capacity, active: item.active }); }}>Edit</button></p>)}
        <label>Class name<input value={classDraft.name} onChange={(e) => setClassDraft({ ...classDraft, name: e.target.value })} /></label>
        <label>Teacher<input value={classDraft.teacher} onChange={(e) => setClassDraft({ ...classDraft, teacher: e.target.value })} /></label>
        <label>Room<input value={classDraft.room} onChange={(e) => setClassDraft({ ...classDraft, room: e.target.value })} /></label>
        <div className="academy-admin-actions"><label>Day<select value={classDraft.dayOfWeek} onChange={(e) => setClassDraft({ ...classDraft, dayOfWeek: Number(e.target.value) })}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
          <label>Start<input type="time" value={classDraft.startTime} onChange={(e) => setClassDraft({ ...classDraft, startTime: e.target.value })} /></label><label>End<input type="time" value={classDraft.endTime} onChange={(e) => setClassDraft({ ...classDraft, endTime: e.target.value })} /></label>
          <label>Level<select value={classDraft.level} onChange={(e) => setClassDraft({ ...classDraft, level: e.target.value })}><option value="qaida">Qaida</option><option value="quran">Quran</option><option value="mixed">Mixed</option></select></label>
          <label>Capacity<input type="number" min="1" max="100" value={classDraft.capacity} onChange={(e) => setClassDraft({ ...classDraft, capacity: Number(e.target.value) })} /></label><label>Status<select value={classDraft.active ? "active" : "inactive"} onChange={(e) => setClassDraft({ ...classDraft, active: e.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
        <button className="secondary" disabled={busy} onClick={() => void saveItem("class", classDraft, editingClassId ?? undefined)}>{editingClassId ? "Save class" : "Add class"}</button>{editingClassId ? <button className="text-button" type="button" onClick={() => { setEditingClassId(null); setClassDraft({ name: "", teacher: "", dayOfWeek: 1, startTime: "17:30", endTime: "19:00", room: "", level: "qaida", capacity: 20, active: true }); }}>Cancel edit</button> : null}</div> : null}
      {section === "Calendar" ? <div className="academy-admin-card"><h3>Calendar and closures</h3><p>Classes are 5:30–7:00 p.m. Select “Mark holiday” beside a class date, or choose any date below, then save. A saved closure updates the family calendar and sends an app push to enrolled families with notifications enabled. One Thursday per month is a special activity; edit its exact date here.</p>{calendar.slice(0, 80).map((item) => <p key={item.id}>{item.date} · {item.title} ({item.type.replace("_", " ")}) {item.type === "class" && item.id.startsWith("recurring-") ? <button className="text-button" type="button" onClick={() => { setEditingCalendarId(null); setCalendarDraft({ title: "No class — holiday", date: item.date, type: "holiday", classIds: [], note: "Academy is closed on this date." }); }}>Mark holiday</button> : !item.id.startsWith("academy-") && !item.id.startsWith("alberta-") && !item.id.startsWith("recurring-") ? <button className="text-button" type="button" onClick={() => { setEditingCalendarId(item.id); setCalendarDraft({ title: item.title, date: item.date, type: item.type, classIds: item.classIds ?? [], note: item.note ?? "" }); }}>Edit</button> : null}</p>)}
        <label>Title<input value={calendarDraft.title} onChange={(e) => setCalendarDraft({ ...calendarDraft, title: e.target.value })} /></label>
        <div className="academy-admin-actions"><label>Date<input type="date" value={calendarDraft.date} onChange={(e) => setCalendarDraft({ ...calendarDraft, date: e.target.value })} /></label><label>Type<select value={calendarDraft.type} onChange={(e) => setCalendarDraft({ ...calendarDraft, type: e.target.value })}><option value="special_class">Monthly special Thursday</option><option value="no_class">No class</option><option value="holiday">Holiday</option><option value="time_changed">Time changed</option><option value="event">Event</option><option value="class">Class</option></select></label></div>
        <label>Note<input value={calendarDraft.note} onChange={(e) => setCalendarDraft({ ...calendarDraft, note: e.target.value })} /></label><div className="academy-admin-actions"><button className="secondary" disabled={busy} onClick={() => void saveItem("calendar", calendarDraft, editingCalendarId ?? undefined)}>{editingCalendarId ? "Save calendar item" : "Add calendar item"}</button><button className="secondary" type="button" disabled={!calendarDraft.date || !calendarDraft.title} onClick={() => void navigator.clipboard.writeText(`${calendarDraft.title}\n${calendarDraft.date}${calendarDraft.note ? `\n${calendarDraft.note}` : ""}`).then(() => setMessage("Calendar update copied. Post it in the WhatsApp group manually.")).catch(() => setMessage("Could not copy the calendar update."))}>Copy for WhatsApp</button><a href="https://chat.whatsapp.com/IZhuemIDjR10DTluYIiSQq?mode=gi_t" target="_blank" rel="noopener noreferrer">Open WhatsApp Group ↗</a></div>{editingCalendarId ? <button className="text-button" type="button" onClick={() => { setEditingCalendarId(null); setCalendarDraft({ title: "", date: "", type: "no_class", classIds: [], note: "" }); }}>Cancel edit</button> : null}</div> : null}
    </div> : null}
      {section === "Announcements" ? <div className="academy-admin-card"><h3>Academy announcements</h3>{announcements.slice(0, 20).map((item) => <p key={item.id}>{item.priority === "high" ? "Important · " : ""}{item.title} <button className="text-button" type="button" onClick={() => void navigator.clipboard.writeText(`${item.title}\n\n${item.message}`).then(() => setMessage("Announcement copied. Open the WhatsApp group and post it manually.")).catch(() => setMessage("Could not copy the announcement."))}>Copy for WhatsApp</button></p>)}<label>Title<input value={announcementDraft.title} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, title: e.target.value })} /></label><label>Message<textarea value={announcementDraft.message} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, message: e.target.value })} /></label><label>Priority<select value={announcementDraft.priority} onChange={(e) => setAnnouncementDraft({ ...announcementDraft, priority: e.target.value })}><option value="normal">Normal</option><option value="high">Important</option></select></label><div className="academy-admin-actions"><button className="secondary" disabled={busy} onClick={() => void saveItem("announcement", { ...announcementDraft, publishedAt: new Date().toISOString() })}>Publish to Academy parents</button><a href="https://chat.whatsapp.com/IZhuemIDjR10DTluYIiSQq?mode=gi_t" target="_blank" rel="noopener noreferrer">Open WhatsApp Group ↗</a></div><p>WhatsApp posts are manual; publishing here sends only to opted-in app devices while the announcement is visible in the Academy.</p></div> : null}
    {section === "Programs" ? <div className="academy-admin-card"><h3>Current term</h3><p>Quran Academy · October 5, 2026–February 1, 2027. Regular classes are Mondays and Thursdays, 5:30–7:00 p.m. One Thursday each month is a separate special activity; choose or change its exact date in Calendar.</p><p>No class October 1. No February tuition charge; the February 1 class is included in January. Classes and billing pause afterward for Ramadan and Eid al-Fitr. Resumption is to be announced.</p><button className="secondary" type="button" onClick={() => setSection("Calendar")}>Manage dates and closures</button></div> : null}
    {message ? <p role="status">{message}</p> : null}
  </section>;
}
