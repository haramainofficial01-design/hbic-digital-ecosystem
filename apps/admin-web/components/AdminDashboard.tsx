"use client";

import {
  adminRoleLabels,
  defaultContent,
  demoAuditLogs,
  demoPushLogs,
  notificationCategories,
  normalizeContent,
  validateContent,
  type Announcement,
  type DonationCategory,
  type EventItem,
  type HbicContent,
  type MediaItem,
  type ProgramCategory,
  type ServiceItem,
  type VolunteerOpportunity
} from "@hbic/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

const pages = [
  "Dashboard",
  "Prayer & Iqamah",
  "Jumu'ah",
  "Announcements",
  "Events",
  "Programs",
  "Donations",
  "Media",
  "Volunteers",
  "Push Notifications",
  "Settings",
  "Users/Roles"
] as const;

type Page = (typeof pages)[number];

const adminSecretStorageKey = "hbic-admin-publish-key";
const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://hbic-calgary-app.vercel.app").replace(/\/$/, "");

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {textarea ? (
        <textarea aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input aria-label={label} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select aria-label={label} value={checked ? "enabled" : "disabled"} onChange={(event) => onChange(event.target.value === "enabled")}>
        <option value="enabled">Enabled</option>
        <option value="disabled">Disabled</option>
      </select>
    </label>
  );
}

export function AdminDashboard() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [content, setContent] = useState<HbicContent>(defaultContent);
  const [adminSecret, setAdminSecret] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [backendMode, setBackendMode] = useState("checking");
  const [busy, setBusy] = useState(false);

  const subtitle = useMemo(() => {
    if (page === "Dashboard") return "Draft, preview, and publish HBIC content for the public website and mobile app.";
    if (page === "Prayer & Iqamah") return "Adhan is linked to iqamah.ca; HBIC can manually adjust iqamah before publishing.";
    if (page === "Push Notifications") return "Notification preferences and logs are shown separately from content publishing.";
    return "Edit draft content, save it, and publish when ready.";
  }, [page]);

  const loadPublished = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/content/published`, { cache: "no-store" });
      const data = await response.json();
      if (data?.content) setContent(normalizeContent(data.content));
      setBackendMode(data?.backend?.mode ?? "unknown");
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Unable to load published content.");
      setBackendMode("unreachable");
    }
  }, []);

  const adminRequest = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!adminSecret.trim()) throw new Error("Enter the admin publish key before saving or publishing.");

      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Secret": adminSecret.trim(),
          ...(init?.headers ?? {})
        }
      });
      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error ?? "Admin request failed.");
      }

      return data;
    },
    [adminSecret]
  );

  const loadDraft = useCallback(async () => {
    setBusy(true);
    setSavedMessage("");
    try {
      const data = await adminRequest("/api/admin/content/draft");
      setContent(normalizeContent(data.content));
      setBackendMode(data?.backend?.mode ?? backendMode);
      setSavedMessage("Draft loaded from the publishing backend.");
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Unable to load draft content.");
    } finally {
      setBusy(false);
    }
  }, [adminRequest, backendMode]);

  useEffect(() => {
    const storedSecret = window.localStorage.getItem(adminSecretStorageKey) ?? "";
    setAdminSecret(storedSecret);
    void loadPublished();
  }, [loadPublished]);

  function rememberSecret() {
    window.localStorage.setItem(adminSecretStorageKey, adminSecret.trim());
    setSavedMessage("Admin publish key saved on this browser.");
  }

  function updateContent(updater: (current: HbicContent) => Partial<HbicContent>) {
    setContent((current) => normalizeContent({ ...current, ...updater(current), status: "draft" }));
  }

  async function saveDraft({ silent = false } = {}) {
    const errors = validateContent(content);
    if (errors.length) throw new Error(errors.join(" "));

    const data = await adminRequest("/api/admin/content/draft", {
      method: "POST",
      body: JSON.stringify({ content: normalizeContent({ ...content, status: "draft" }) })
    });
    setContent(normalizeContent(data.content));
    setBackendMode(data?.backend?.mode ?? backendMode);
    if (!silent) setSavedMessage("Draft saved. Public website and mobile app are unchanged until you publish.");
  }

  async function handleSaveDraft() {
    setBusy(true);
    setSavedMessage("");
    try {
      await saveDraft();
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setSavedMessage("");
    try {
      await saveDraft({ silent: true });
      const data = await adminRequest("/api/admin/content/publish", { method: "POST" });
      setContent(normalizeContent(data.content));
      setBackendMode(data?.backend?.mode ?? backendMode);
      setSavedMessage(`Published successfully. Revalidated: ${(data.revalidated ?? []).join(", ")}`);
    } catch (error) {
      setSavedMessage(error instanceof Error ? error.message : "Unable to publish changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/brand/hbic-logo.png" alt="HBIC logo" />
          <div>
            <strong>HBIC Admin</strong>
            <span>Calgary control room</span>
          </div>
        </div>
        {pages.map((item) => (
          <button key={item} className={`nav-button ${page === item ? "active" : ""}`} onClick={() => setPage(item)}>
            {item}
          </button>
        ))}
      </aside>

      <section className="content">
        <div className="topbar">
          <div>
            <span className="pill">{page}</span>
            <h1>{page}</h1>
            <p>{subtitle}</p>
          </div>
          <span className="pill">{content.status === "published" ? `Published v${content.version}` : "Draft editing"}</span>
        </div>

        <div className="card full">
          <div className="form-grid">
            <Field label="Public content API" value={apiBase} onChange={() => undefined} />
            <Field
              label="Admin publish key"
              value={adminSecret}
              type="password"
              onChange={setAdminSecret}
            />
          </div>
          <p className="muted">
            Backend mode: {backendMode}. Public pages and the mobile app read the published record. Draft edits stay private until Publish Changes succeeds.
          </p>
          {backendMode === "static-fallback" ? (
            <p className="muted">
              Firestore credentials are not configured on the public web deployment yet. Save and publish will fail loudly until production credentials are added.
            </p>
          ) : null}
          <div className="actions">
            <button className="secondary" onClick={rememberSecret} disabled={busy}>Remember key</button>
            <button className="secondary" onClick={loadDraft} disabled={busy}>Load draft</button>
            <button className="primary" onClick={handleSaveDraft} disabled={busy}>Save Draft</button>
            <button className="primary" onClick={handlePublish} disabled={busy}>Publish Changes</button>
          </div>
        </div>

        {savedMessage ? <div className="card full"><strong>{savedMessage}</strong></div> : null}
        {page === "Dashboard" && <DashboardPanel content={content} />}
        {page === "Prayer & Iqamah" && <PrayerPanel content={content} updateContent={updateContent} />}
        {page === "Jumu'ah" && <JumuahPanel content={content} updateContent={updateContent} />}
        {page === "Announcements" && <AnnouncementsPanel content={content} updateContent={updateContent} />}
        {page === "Events" && <EventsPanel content={content} updateContent={updateContent} />}
        {page === "Programs" && <ProgramsPanel content={content} updateContent={updateContent} />}
        {page === "Donations" && <DonationsPanel content={content} updateContent={updateContent} />}
        {page === "Media" && <MediaPanel content={content} updateContent={updateContent} />}
        {page === "Volunteers" && <VolunteersPanel content={content} updateContent={updateContent} />}
        {page === "Push Notifications" && <PushPanel />}
        {page === "Settings" && <SettingsPanel content={content} updateContent={updateContent} />}
        {page === "Users/Roles" && <UsersPanel />}
      </section>
    </main>
  );
}

function DashboardPanel({ content }: { content: HbicContent }) {
  return (
    <div className="grid">
      {[
        ["Backend source", content.status, `Version ${content.version}`],
        ["Announcements", String(content.announcements.length), "Published content count"],
        ["Events", String(content.events.length), "Website and app event cards"],
        ["Media cards", String(content.mediaItems.length), "Website and app media"]
      ].map(([label, value, note]) => (
        <div className="card third" key={label}>
          <p className="muted">{label}</p>
          <h2>{value}</h2>
          <p className="muted">{note}</p>
        </div>
      ))}
      <div className="card full">
        <h2>Audit log</h2>
        <table className="table">
          <tbody>
            {demoAuditLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.action}</td>
                <td>{log.actorName}</td>
                <td>{adminRoleLabels[log.actorRole]}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PrayerPanel({ content, updateContent }: EditorPanelProps) {
  const { iqamahTime, prayerTime } = content;

  return (
    <div className="grid">
      <div className="card full">
        <h2>Today&apos;s adhan and iqamah</h2>
        <p className="muted">
          Source data is linked to iqamah.ca. HBIC can manually adjust iqamah times, save a draft, then publish the reviewed values to the public website and mobile app.
        </p>
        <div className="form-grid">
          <Field label="Upstream source" value={prayerTime.source} onChange={(value) => updateContent((current) => ({ prayerTime: { ...current.prayerTime, source: value } }))} />
          <Field label="Source URL" value={prayerTime.sourceUrl ?? ""} onChange={(value) => updateContent((current) => ({ prayerTime: { ...current.prayerTime, sourceUrl: value } }))} />
          <Field label="Calculation / import method" value={prayerTime.calculationMethod} onChange={(value) => updateContent((current) => ({ prayerTime: { ...current.prayerTime, calculationMethod: value } }))} />
          <ToggleField label="Manual iqamah override" checked={iqamahTime.manualOverride} onChange={(checked) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, manualOverride: checked } }))} />
          <Field label="Adjustment notes" value={iqamahTime.adjustmentNotes} textarea onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, adjustmentNotes: value } }))} />
        </div>
      </div>

      <div className="card full">
        <h2>Adhan from iqamah.ca</h2>
        <div className="form-grid">
          {(["fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise"] as const).map((key) => (
            <Field
              key={key}
              label={`${key.charAt(0).toUpperCase()}${key.slice(1)} adhan`}
              value={prayerTime[key]}
              onChange={(value) => updateContent((current) => ({ prayerTime: { ...current.prayerTime, [key]: value } }))}
            />
          ))}
        </div>
      </div>

      <div className="card full">
        <h2>HBIC manual iqamah adjustments</h2>
        <p className="muted">These iqamah values are the admin-reviewed values shown after publishing.</p>
        <div className="form-grid">
          <Field label="Fajr iqamah" value={iqamahTime.fajrIqamah} onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, fajrIqamah: value } }))} />
          <Field label="Dhuhr iqamah" value={iqamahTime.dhuhrIqamah} onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, dhuhrIqamah: value } }))} />
          <Field label="Asr iqamah" value={iqamahTime.asrIqamah} onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, asrIqamah: value } }))} />
          <Field label="Maghrib iqamah" value={iqamahTime.maghribIqamah} onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, maghribIqamah: value } }))} />
          <Field label="Isha iqamah" value={iqamahTime.ishaIqamah} onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, ishaIqamah: value } }))} />
          <Field label="Updated by" value={iqamahTime.updatedBy} onChange={(value) => updateContent((current) => ({ iqamahTime: { ...current.iqamahTime, updatedBy: value } }))} />
        </div>
      </div>

      <div className="card">
        <h3>Ramadan/Taraweeh</h3>
        <Field label="Suhoor end" value={content.ramadanSchedule.suhoorEnd} onChange={(value) => updateContent((current) => ({ ramadanSchedule: { ...current.ramadanSchedule, suhoorEnd: value } }))} />
        <Field label="Iftar" value={content.ramadanSchedule.iftar} onChange={(value) => updateContent((current) => ({ ramadanSchedule: { ...current.ramadanSchedule, iftar: value } }))} />
        <Field label="Taraweeh" value={content.ramadanSchedule.taraweeh} onChange={(value) => updateContent((current) => ({ ramadanSchedule: { ...current.ramadanSchedule, taraweeh: value } }))} />
        <Field label="Qiyam" value={content.ramadanSchedule.qiyam} onChange={(value) => updateContent((current) => ({ ramadanSchedule: { ...current.ramadanSchedule, qiyam: value } }))} />
      </div>

      <div className="card">
        <h3>Seasonal mode</h3>
        <ToggleField label="Ramadan mode" checked={content.settings.ramadanMode} onChange={(checked) => updateContent((current) => ({ settings: { ...current.settings, ramadanMode: checked } }))} />
        <ToggleField label="Eid mode" checked={content.settings.eidMode} onChange={(checked) => updateContent((current) => ({ settings: { ...current.settings, eidMode: checked } }))} />
      </div>
    </div>
  );
}

type EditorPanelProps = {
  content: HbicContent;
  updateContent: (updater: (current: HbicContent) => Partial<HbicContent>) => void;
};

function JumuahPanel({ content, updateContent }: EditorPanelProps) {
  return (
    <div className="card full">
      <h2>Two Jumu&apos;ah prayers</h2>
      <div className="form-grid">
        <Field label="First khutbah" value={content.jumuahSchedule.firstKhutbahTime} onChange={(value) => updateContent((current) => ({ jumuahSchedule: { ...current.jumuahSchedule, firstKhutbahTime: value } }))} />
        <Field label="First iqamah" value={content.jumuahSchedule.firstIqamahTime} onChange={(value) => updateContent((current) => ({ jumuahSchedule: { ...current.jumuahSchedule, firstIqamahTime: value } }))} />
        <Field label="Second khutbah" value={content.jumuahSchedule.secondKhutbahTime} onChange={(value) => updateContent((current) => ({ jumuahSchedule: { ...current.jumuahSchedule, secondKhutbahTime: value } }))} />
        <Field label="Second iqamah" value={content.jumuahSchedule.secondIqamahTime} onChange={(value) => updateContent((current) => ({ jumuahSchedule: { ...current.jumuahSchedule, secondIqamahTime: value } }))} />
        <Field label="Notes" value={content.jumuahSchedule.notes} textarea onChange={(value) => updateContent((current) => ({ jumuahSchedule: { ...current.jumuahSchedule, notes: value } }))} />
      </div>
    </div>
  );
}

function AnnouncementsPanel({ content, updateContent }: EditorPanelProps) {
  function updateAnnouncement(index: number, patch: Partial<Announcement>) {
    updateContent((current) => ({
      announcements: current.announcements.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  }

  return (
    <div className="grid">
      {content.announcements.map((item, index) => (
        <div className="card" key={item.id}>
          <h2>{item.title || "Announcement"}</h2>
          <Field label="Title" value={item.title} onChange={(value) => updateAnnouncement(index, { title: value })} />
          <Field label="Body" value={item.body} textarea onChange={(value) => updateAnnouncement(index, { body: value })} />
          <ToggleField label="Pinned" checked={item.pinned} onChange={(checked) => updateAnnouncement(index, { pinned: checked })} />
          <ToggleField label="Urgent" checked={item.urgent} onChange={(checked) => updateAnnouncement(index, { urgent: checked })} />
        </div>
      ))}
    </div>
  );
}

function EventsPanel({ content, updateContent }: EditorPanelProps) {
  function updateEvent(index: number, patch: Partial<EventItem>) {
    updateContent((current) => ({
      events: current.events.map((event, eventIndex) => eventIndex === index ? { ...event, ...patch } : event)
    }));
  }

  return (
    <div className="grid">
      {content.events.map((event, index) => (
        <div className="card full" key={event.id}>
          <h2>{event.title || "Event"}</h2>
          <div className="form-grid">
            <Field label="Title" value={event.title} onChange={(value) => updateEvent(index, { title: value })} />
            <Field label="Category" value={event.category} onChange={(value) => updateEvent(index, { category: value as ProgramCategory })} />
            <Field label="Date" value={event.date} onChange={(value) => updateEvent(index, { date: value })} />
            <Field label="Start time" value={event.startTime} onChange={(value) => updateEvent(index, { startTime: value })} />
            <Field label="End time" value={event.endTime} onChange={(value) => updateEvent(index, { endTime: value })} />
            <Field label="Location" value={event.location} onChange={(value) => updateEvent(index, { location: value })} />
            <Field label="Speaker" value={event.speaker} onChange={(value) => updateEvent(index, { speaker: value })} />
            <Field label="Registration link" value={event.registrationLink} onChange={(value) => updateEvent(index, { registrationLink: value })} />
            <Field label="Description" value={event.description} textarea onChange={(value) => updateEvent(index, { description: value })} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgramsPanel({ content, updateContent }: EditorPanelProps) {
  function updateProgram(index: number, patch: Partial<ServiceItem>) {
    updateContent((current) => ({
      programs: current.programs.map((program, programIndex) => programIndex === index ? { ...program, ...patch } : program)
    }));
  }

  return (
    <div className="grid">
      {content.programs.map((program, index) => (
        <div className="card" key={program.id}>
          <h2>{program.title}</h2>
          <Field label="Program title" value={program.title} onChange={(value) => updateProgram(index, { title: value })} />
          <Field label="Program summary" value={program.description} textarea onChange={(value) => updateProgram(index, { description: value })} />
        </div>
      ))}
    </div>
  );
}

function DonationsPanel({ content, updateContent }: EditorPanelProps) {
  function updateDonation(index: number, patch: Partial<DonationCategory>) {
    updateContent((current) => ({
      donationCategories: current.donationCategories.map((category, categoryIndex) => categoryIndex === index ? { ...category, ...patch } : category)
    }));
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Donation link</h2>
        <Field label="PayPal / Credit Card URL" value={content.settings.donationUrl} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, donationUrl: value } }))} />
      </div>
      {content.donationCategories.map((category, index) => (
        <div className="card" key={category.id}>
          <h2>{category.title}</h2>
          <Field label="Title" value={category.title} onChange={(value) => updateDonation(index, { title: value })} />
          <Field label="Description" value={category.description} textarea onChange={(value) => updateDonation(index, { description: value })} />
          <Field
            label="Suggested amounts"
            value={category.amountSuggestions.join(", ")}
            onChange={(value) => updateDonation(index, { amountSuggestions: value.split(",").map((amount) => Number(amount.trim())).filter(Boolean) })}
          />
        </div>
      ))}
    </div>
  );
}

function MediaPanel({ content, updateContent }: EditorPanelProps) {
  function updateMedia(index: number, patch: Partial<MediaItem>) {
    updateContent((current) => ({
      mediaItems: current.mediaItems.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  }

  return (
    <div className="grid">
      {content.mediaItems.map((item, index) => (
        <div className="card full" key={item.id}>
          <h2>{item.title}</h2>
          <div className="form-grid">
            <Field label="Title" value={item.title} onChange={(value) => updateMedia(index, { title: value })} />
            <Field label="Type" value={item.type} onChange={(value) => updateMedia(index, { type: value })} />
            <Field label="Year" value={String(item.year)} onChange={(value) => updateMedia(index, { year: Number(value) || item.year })} />
            <Field label="Video URL" value={item.videoUrl} onChange={(value) => updateMedia(index, { videoUrl: value })} />
            <Field label="Poster URL" value={item.posterUrl} onChange={(value) => updateMedia(index, { posterUrl: value })} />
            <Field label="Description" value={item.description} textarea onChange={(value) => updateMedia(index, { description: value })} />
            <ToggleField label="Visible" checked={item.visible} onChange={(checked) => updateMedia(index, { visible: checked })} />
            <ToggleField label="Featured" checked={item.featured} onChange={(checked) => updateMedia(index, { featured: checked })} />
          </div>
        </div>
      ))}
    </div>
  );
}

function VolunteersPanel({ content, updateContent }: EditorPanelProps) {
  function updateVolunteer(index: number, patch: Partial<VolunteerOpportunity>) {
    updateContent((current) => ({
      volunteerOpportunities: current.volunteerOpportunities.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    }));
  }

  return (
    <div className="grid">
      {content.volunteerOpportunities.map((opportunity, index) => (
        <div className="card" key={opportunity.id}>
          <h2>{opportunity.title}</h2>
          <Field label="Title" value={opportunity.title} onChange={(value) => updateVolunteer(index, { title: value })} />
          <Field label="Date" value={opportunity.date} onChange={(value) => updateVolunteer(index, { date: value })} />
          <Field label="Contact email" value={opportunity.contactEmail} onChange={(value) => updateVolunteer(index, { contactEmail: value })} />
          <Field label="Description" value={opportunity.description} textarea onChange={(value) => updateVolunteer(index, { description: value })} />
        </div>
      ))}
    </div>
  );
}

function PushPanel() {
  return (
    <div className="grid">
      <div className="card full">
        <h2>Push notification categories</h2>
        <p className="muted">Content publishing updates the website and mobile content API. Sending push notifications remains a separate notification-service action.</p>
      </div>
      {notificationCategories.map((item) => (
        <div className="card third" key={item.type}>
          <h3>{item.label}</h3>
          <p className="muted">{item.description}</p>
          <p className="muted">{item.respectfulUse}</p>
        </div>
      ))}
      <div className="card full">
        <h2>Recent logs</h2>
        <table className="table">
          <tbody>
            {demoPushLogs.map((log) => (
              <tr key={log.id}>
                <td>{log.title}</td>
                <td>{log.audience}</td>
                <td>{log.status}</td>
                <td>{new Date(log.sentAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsPanel({ content, updateContent }: EditorPanelProps) {
  return (
    <div className="grid">
      <div className="card full">
        <h2>Masjid settings</h2>
        <div className="form-grid">
          <Field label="Name" value={content.settings.masjidName} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, masjidName: value } }))} />
          <Field label="Short name" value={content.settings.shortName} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, shortName: value } }))} />
          <Field label="Address" value={content.settings.address} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, address: value } }))} />
          <Field label="Phone" value={content.settings.phone} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, phone: value } }))} />
          <Field label="Email" value={content.settings.email} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, email: value } }))} />
          <Field label="Website" value={content.settings.website} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, website: value } }))} />
          <Field label="Instagram" value={content.settings.social.instagram} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, social: { ...current.settings.social, instagram: value } } }))} />
          <Field label="YouTube" value={content.settings.social.youtube} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, social: { ...current.settings.social, youtube: value } } }))} />
          <Field label="TikTok" value={content.settings.social.tiktok} onChange={(value) => updateContent((current) => ({ settings: { ...current.settings, social: { ...current.settings.social, tiktok: value } } }))} />
        </div>
      </div>
    </div>
  );
}

function UsersPanel() {
  return (
    <div className="grid">
      {Object.entries(adminRoleLabels).map(([key, label]) => (
        <div className="card third" key={key}>
          <h2>{label}</h2>
          <p className="muted">Role label reserved for Firebase Auth custom claims and admin permissions.</p>
        </div>
      ))}
    </div>
  );
}
