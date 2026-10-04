"use client";

import {
  adminRoleLabels,
  defaultContent,
  notificationCategories,
  normalizeContent,
  isIqamahOverrideActive,
  iqamahOverrideExpiresAt,
  iqamahOverrideWeekEndsAt,
  prayerLabels,
  validateContent,
  type Announcement,
  type AskMasjidSubmission,
  type AskMasjidSubmissionStatus,
  type DailyBenefit,
  type DonationCategory,
  type EventItem,
  type HalalRestaurant,
  type HbicContent,
  type IqamahOverride,
  type IqamahPrayerName,
  type LocalMuslimService,
  type MediaItem,
  type NewMuslimResource,
  type NotificationAudience,
  type NotificationRoute,
  type NotificationType,
  type ProgramCategory,
  type RestaurantInterestStatus,
  type RestaurantInterestSubmission,
  type ServiceItem,
  type VolunteerOpportunity
} from "@hbic/shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FirebaseAdminAuth } from "./FirebaseAdminAuth";
import { AcademyPanel } from "./AcademyPanel";

const pages = [
  "Dashboard",
  "Prayer & Iqamah",
  "Jumu'ah",
  "Prayer Display",
  "Announcements",
  "Events",
  "Programs",
  "Quran Academy",
  "Donations",
  "Media",
  "Halal Directory",
  "Community",
  "Volunteers",
  "Push Notifications",
  "Diagnostics",
  "Feature Flags",
  "Settings",
  "Users/Roles"
] as const;

type Page = (typeof pages)[number];
type AdminResponse = Record<string, any>;

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
const iqamahOverridePrayers: IqamahPrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const pushAudiences: Array<NotificationAudience | "Android" | "iOS" | "Everyone"> = ["Everyone", "Android", "iOS"];

type PrayerSyncStatus = {
  configured?: boolean;
  provider?: "Iqamah.ca";
  endpointHost?: string;
  sourceState?: "live" | "cached" | "unavailable";
  lastSuccessfulSync?: string;
  lastAttemptedSync?: string;
  lastError?: string;
  activeOverrides?: IqamahPrayerName[];
  refreshIntervalMinutes?: number;
  schedule?: {
    serviceDate?: string;
    automatic: {
      adhan: Record<string, string>;
      iqamah: Record<IqamahPrayerName, string>;
      jumuah?: { first: string; second: string };
    };
    effective: {
      adhan: Record<string, string>;
      iqamah: Record<IqamahPrayerName, string>;
      jumuah: { first: string; second: string };
    };
    upcomingWeek?: {
      iqamah: Record<IqamahPrayerName, string>;
    };
  };
};

function isOverrideCurrentlyActive(override?: IqamahOverride | null, now = new Date()) {
  return isIqamahOverrideActive(override, now);
}

function overrideStatusLabel(override?: IqamahOverride | null, now = new Date()) {
  if (!override?.enabled) return "Automatic (no override)";
  if (!override.value?.trim()) return "Incomplete — add a time";
  const startsAt = override.startsAt ? Date.parse(override.startsAt) : null;
  const expires = iqamahOverrideExpiresAt(override);
  if (!expires || now.getTime() >= Date.parse(expires)) return "Expired — automatic timetable";
  if (startsAt && now.getTime() < startsAt) return "Future — scheduled";
  return "Active";
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
  disabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {textarea ? (
        <textarea aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input aria-label={label} type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
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

function ChoiceField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

export function AdminDashboard() {
  const [page, setPage] = useState<Page>("Dashboard");
  const [content, setContent] = useState<HbicContent>(defaultContent);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [backendMode, setBackendMode] = useState("checking");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState(defaultContent.version);

  const subtitle = useMemo(() => {
    if (page === "Dashboard") return "Draft, preview, and publish Masjid Bilal content for the public website and mobile app.";
    if (page === "Prayer & Iqamah") return "Manage the effective prayer and iqamah schedule shown across the website and app.";
    if (page === "Prayer Display") return "Open the focused TV editor and live prayer-hall preview.";
    if (page === "Push Notifications") return "Notification preferences and logs are shown separately from content publishing.";
    if (page === "Diagnostics") return "Protected production health checks for publishing, prayer sync, and notifications.";
    return "Edit draft content, save it, and publish when ready.";
  }, [page]);

  const loadPublished = useCallback(async () => {
    try {
      const response = await fetch(`${apiBase}/api/content/published`, { cache: "no-store" });
      const data = await response.json();
      if (data?.content) {
        const published = normalizeContent(data.content);
        setContent(published);
        setPublishedVersion(published.version);
        setDraftLoaded(false);
        setDraftUpdatedAt(null);
        setDirty(false);
      }
      setBackendMode(data?.backend?.mode ?? "unknown");
    } catch (error) {
      setMessageTone("error");
      setSavedMessage(error instanceof Error ? error.message : "Unable to load published content.");
      setBackendMode("unreachable");
    }
  }, []);

  const adminRequest = useCallback(
    async (path: string, init?: RequestInit) => {
      if (!adminToken) throw new Error("Sign in with your approved administrator email and password first.");

      const response = await fetch(`${apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: adminToken,
          ...(init?.headers ?? {})
        }
      });
      const data = await response.json();

      if (!response.ok || data?.ok === false) {
        throw new Error(data?.error ?? "Admin request failed.");
      }

      return data;
    },
    [adminToken]
  );

  const loadDraft = useCallback(async () => {
    setBusy(true);
    setSavedMessage("");
    try {
      const data = await adminRequest("/api/admin/content/draft");
      setContent(normalizeContent(data.content));
      setDraftLoaded(true);
      setDraftUpdatedAt(typeof data.draftUpdatedAt === "string" ? data.draftUpdatedAt : null);
      setDirty(false);
      setBackendMode(data?.backend?.mode ?? backendMode);
      setMessageTone("success");
      setSavedMessage("Draft loaded from the publishing backend.");
    } catch (error) {
      setMessageTone("error");
      setSavedMessage(error instanceof Error ? error.message : "Unable to load draft content.");
    } finally {
      setBusy(false);
    }
  }, [adminRequest, backendMode]);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  const handleAdminSession = useCallback((token: string | null) => {
    setAdminToken(token);
    if (!token) {
      setDraftLoaded(false);
      setDraftUpdatedAt(null);
    }
  }, []);

  function updateContent(updater: (current: HbicContent) => Partial<HbicContent>) {
    setContent((current) => normalizeContent({ ...current, ...updater(current), status: "draft" }));
    setDirty(true);
  }

  async function saveDraft({ silent = false } = {}) {
    if (!draftLoaded) throw new Error("Load the protected draft before saving so private fields and newer edits are preserved.");
    const errors = validateContent(content);
    if (errors.length) throw new Error(errors.join(" "));

    const data = await adminRequest("/api/admin/content/draft", {
      method: "POST",
      body: JSON.stringify({
        content: normalizeContent({ ...content, status: "draft" }),
        expectedDraftUpdatedAt: draftUpdatedAt
      })
    });
    setContent(normalizeContent(data.content));
    setDraftUpdatedAt(typeof data.draftUpdatedAt === "string" ? data.draftUpdatedAt : null);
    setDirty(false);
    setBackendMode(data?.backend?.mode ?? backendMode);
    if (!silent) {
      setMessageTone("success");
      setSavedMessage("Draft saved. Public website and mobile app are unchanged until you publish.");
    }
    return data;
  }

  async function handleSaveDraft() {
    setBusy(true);
    setSavedMessage("");
    try {
      await saveDraft();
    } catch (error) {
      setMessageTone("error");
      setSavedMessage(error instanceof Error ? error.message : "Unable to save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish() {
    setBusy(true);
    setSavedMessage("");
    try {
      const liveResponse = await fetch(`${apiBase}/api/content/published?compare=${Date.now()}`, { cache: "no-store" });
      const liveData = await liveResponse.json();
      if (!liveResponse.ok || !liveData?.content) throw new Error("The current public version could not be checked. Nothing was published.");
      const liveContent = normalizeContent(liveData.content);
      const confirmation = liveContent.version > publishedVersion
        ? `A newer public version (v${liveContent.version}) exists. Publishing this draft may replace newer work. Continue?`
        : "Publish this draft to the public website and mobile app now?";
      if (!window.confirm(confirmation)) {
        setMessageTone("info");
        setSavedMessage("Publish cancelled. The public website and mobile app were not changed.");
        return;
      }

      const saved = await saveDraft({ silent: true });
      const data = await adminRequest("/api/admin/content/publish", {
        method: "POST",
        body: JSON.stringify({
          expectedDraftUpdatedAt: saved.draftUpdatedAt,
          expectedPublishedVersion: liveContent.version
        })
      });
      const publishedContent = normalizeContent(data.content);
      const verifyResponse = await fetch(`${apiBase}/api/content/published?verify=${Date.now()}`, { cache: "no-store" });
      const verifyData = await verifyResponse.json();
      if (!verifyResponse.ok || !verifyData?.content) {
        throw new Error("Publish completed, but the public API could not be verified.");
      }
      const verifiedContent = normalizeContent(verifyData.content);
      if (verifiedContent.version < publishedContent.version) {
        throw new Error("Publish completed, but the public API is still returning an older version.");
      }
      setContent(normalizeContent({ ...publishedContent, status: "draft" }));
      setDraftLoaded(true);
      setDraftUpdatedAt(typeof data.publication?.updatedAt === "string" ? data.publication.updatedAt : null);
      setPublishedVersion(verifiedContent.version);
      setDirty(false);
      setBackendMode(data?.backend?.mode ?? backendMode);
      const propagation = data.propagation ?? {};
      const propagationHealthy = propagation.status === "accepted" || propagation.status === "no_tokens";
      setMessageTone(propagationHealthy ? "success" : "error");
      setSavedMessage(
        propagationHealthy
          ? `Published v${verifiedContent.version}, verified on the public API, and signalled ${propagation.successCount ?? 0} registered device(s). Web pages were revalidated.`
          : `Published v${verifiedContent.version} and verified on the public API, but device propagation needs attention: ${propagation.error ?? propagation.status ?? "unknown error"}.`
      );
    } catch (error) {
      setMessageTone("error");
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
            <strong>Masjid Bilal Admin</strong>
            <span>Content publishing</span>
          </div>
        </div>
        <label className="mobile-page-picker">
          <span>Dashboard section</span>
          <select value={page} onChange={(event) => setPage(event.target.value as Page)}>
            {pages.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="sidebar-nav">
          {pages.map((item) => (
            <button key={item} className={`nav-button ${page === item ? "active" : ""}`} onClick={() => setPage(item)}>
              {item}
            </button>
          ))}
        </div>
      </aside>

      <section className="content">
        <div className="topbar">
          <div>
            <span className="pill">{page}</span>
            <h1>{page}</h1>
            <p>{subtitle}</p>
          </div>
          <span className={`pill ${dirty ? "pill-dirty" : ""}`}>
            {dirty ? "Unsaved changes" : content.status === "published" ? `Published v${content.version}` : `Draft v${content.version}`}
          </span>
        </div>

        <div className="card full">
          <Field label="Public content API" value={apiBase} onChange={() => undefined} disabled />
          <FirebaseAdminAuth onSession={handleAdminSession} />
          <p className="muted">
            Backend mode: {backendMode}. Public pages and the mobile app read the published record. Draft edits stay private until Publish Changes succeeds.
          </p>
          <p className="muted">
            Last published: {content.publishedAt ? new Date(content.publishedAt).toLocaleString() : "No published timestamp available"}.
          </p>
          {backendMode === "static-fallback" ? (
            <p className="muted">
              Firestore credentials are not configured on the public web deployment yet. Save and publish will fail loudly until production credentials are added.
            </p>
          ) : null}
          <div className="actions">
            <button className="secondary" onClick={loadDraft} disabled={busy || !adminToken}>Load protected draft</button>
            <a className="secondary link-button" href={apiBase} target="_blank" rel="noreferrer">Preview Public Site</a>
            <button className="primary" onClick={handleSaveDraft} disabled={busy || !draftLoaded}>{busy ? "Working..." : "Save Draft"}</button>
            <button className="primary publish" onClick={handlePublish} disabled={busy || !draftLoaded}>{busy ? "Working..." : "Publish Changes"}</button>
          </div>
          {!draftLoaded ? <p className="muted">Sign in with your approved personal email and password, then load the protected draft before editing or publishing.</p> : null}
        </div>

        {savedMessage ? <div role="status" className={`notice notice-${messageTone}`}><strong>{savedMessage}</strong></div> : null}
        {page === "Dashboard" && <DashboardPanel content={content} />}
        {page === "Prayer & Iqamah" && <PrayerPanel content={content} updateContent={updateContent} adminRequest={adminRequest as (path: string, init?: RequestInit) => Promise<AdminResponse>} disabled={busy} />}
        {page === "Jumu'ah" && <JumuahPanel content={content} updateContent={updateContent} />}
        {page === "Prayer Display" && <PrayerDisplayPanel />}
        {page === "Announcements" && <AnnouncementsPanel content={content} updateContent={updateContent} />}
        {page === "Events" && <EventsPanel content={content} updateContent={updateContent} />}
        {page === "Programs" && <ProgramsPanel content={content} updateContent={updateContent} />}
        {page === "Quran Academy" && <AcademyPanel adminRequest={adminRequest} personalSession={adminToken?.startsWith("Bearer ") === true} />}
        {page === "Donations" && <DonationsPanel content={content} updateContent={updateContent} />}
        {page === "Media" && <MediaPanel content={content} updateContent={updateContent} />}
        {page === "Halal Directory" && (
          <HalalAdminPanel
            content={content}
            updateContent={updateContent}
            adminRequest={adminRequest as (path: string, init?: RequestInit) => Promise<AdminResponse>}
            disabled={busy}
          />
        )}
        {page === "Community" && (
          <CommunityAdminPanel
            content={content}
            updateContent={updateContent}
            adminRequest={adminRequest as (path: string, init?: RequestInit) => Promise<AdminResponse>}
            disabled={busy}
          />
        )}
        {page === "Volunteers" && <VolunteersPanel content={content} updateContent={updateContent} />}
        {page === "Push Notifications" && <PushPanel adminRequest={adminRequest as (path: string, init?: RequestInit) => Promise<AdminResponse>} disabled={busy} />}
        {page === "Diagnostics" && <DiagnosticsPanel adminRequest={adminRequest as (path: string, init?: RequestInit) => Promise<AdminResponse>} />}
        {page === "Feature Flags" && <FeatureFlagsPanel content={content} updateContent={updateContent} />}
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
        <h2>Publication status</h2>
        <p className="muted">
          {content.publishedAt
            ? `Version ${content.version} was published ${new Date(content.publishedAt).toLocaleString()}.`
            : "This loaded record does not include a publication timestamp."}
        </p>
        <p className="muted">Use Diagnostics for live database, prayer update, public API, and notification readiness checks.</p>
      </div>
    </div>
  );
}

function PrayerDisplayPanel() {
  return (
    <div className="grid">
      <div className="card full">
        <h2>Prayer hall display</h2>
        <p className="muted">
          The focused editor publishes the same canonical prayer, iqamah, and Jumu&apos;ah schedule used by the website, mobile apps, widgets, and Watch. TV-only settings are limited to presentation and one short notice.
        </p>
        <div className="actions">
          <a className="primary link-button" href={`${apiBase}/display-admin`} target="_blank" rel="noreferrer">Open Prayer Display Admin</a>
          <a className="secondary link-button" href={`${apiBase}/display`} target="_blank" rel="noreferrer">Open Live TV Display</a>
        </div>
      </div>
    </div>
  );
}

function PrayerPanel({
  content,
  updateContent,
  adminRequest,
  disabled
}: EditorPanelProps & {
  adminRequest: (path: string, init?: RequestInit) => Promise<AdminResponse>;
  disabled: boolean;
}) {
  const { iqamahTime, prayerTime } = content;
  const [syncStatus, setSyncStatus] = useState<PrayerSyncStatus | null>(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [livePrayer, setLivePrayer] = useState<Pick<HbicContent, "prayerTime" | "iqamahTime"> | null>(null);

  const loadSyncStatus = useCallback(async (force = false) => {
    setSyncMessage("");
    try {
      const data = await adminRequest("/api/admin/prayer-sync", { method: force ? "POST" : "GET" });
      setSyncStatus(data.prayerSync as PrayerSyncStatus);
      const liveResponse = await fetch(`${apiBase}/api/content/published?prayerPanel=${Date.now()}`, { cache: "no-store" });
      const live = await liveResponse.json();
      if (liveResponse.ok && live?.content) setLivePrayer({ prayerTime: live.content.prayerTime, iqamahTime: live.content.iqamahTime });
      setSyncMessage(force
        ? data.propagation?.status === "provider_error"
          ? `Prayer data refreshed, but device propagation needs attention: ${data.propagation.error}`
          : `Prayer data refreshed and signalled to ${data.propagation?.successCount ?? 0} registered device(s).`
        : "Prayer sync status loaded.");
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Unable to load prayer sync status.");
    }
  }, [adminRequest]);

  useEffect(() => {
    if (!disabled) void loadSyncStatus(false);
  }, [disabled, loadSyncStatus]);

  function updateOverride(prayer: IqamahPrayerName, patch: Partial<IqamahOverride>) {
    updateContent((current) => {
      const updatedAt = new Date().toISOString();
      const overrides = {
        ...(current.iqamahTime.overrides ?? {}),
        [prayer]: {
          enabled: false,
          value: "",
          ...(current.iqamahTime.overrides?.[prayer] ?? {}),
          ...patch,
          endsAt: iqamahOverrideWeekEndsAt(new Date(updatedAt)),
          updatedAt
        }
      };
      return {
        iqamahTime: {
          ...current.iqamahTime,
          overrides,
          manualOverride: Object.values(overrides).some((item) => item?.enabled),
          updatedAt
        }
      };
    });
  }

  function clearOverride(prayer: IqamahPrayerName) {
    updateContent((current) => {
      const overrides = { ...(current.iqamahTime.overrides ?? {}) };
      delete overrides[prayer];
      return {
        iqamahTime: {
          ...current.iqamahTime,
          overrides,
          manualOverride: Object.values(overrides).some((item) => item?.enabled),
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function addHijriOverride() {
    const now = new Date();
    updateContent((current) => ({
      hijriSettings: {
        ...current.hijriSettings,
        overrides: [
          ...(current.hijriSettings.overrides ?? []),
          {
            id: `hijri-${Date.now()}`,
            gregorianDate: now.toISOString().slice(0, 10),
            day: 1,
            month: "Muharram",
            year: 1448,
            updatedAt: now.toISOString()
          }
        ],
        updatedAt: now.toISOString()
      }
    }));
  }

  function updateHijriOverride(index: number, patch: Record<string, string | number>) {
    updateContent((current) => ({
      hijriSettings: {
        ...current.hijriSettings,
        overrides: (current.hijriSettings.overrides ?? []).map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
        ),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function removeHijriOverride(index: number) {
    updateContent((current) => ({
      hijriSettings: {
        ...current.hijriSettings,
        overrides: (current.hijriSettings.overrides ?? []).filter((_, itemIndex) => itemIndex !== index),
        updatedAt: new Date().toISOString()
      }
    }));
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Prayer data status</h2>
        <p className="muted">Iqamah.ca supplies the automatic timetable. The backend resolves each effective public value once, and the TV, website, apps, Watch, widgets, and complications consume that same schedule.</p>
        <div className="actions">
          <button className="secondary" onClick={() => loadSyncStatus(false)} disabled={disabled}>Refresh status</button>
          <button className="primary" onClick={() => loadSyncStatus(true)} disabled={disabled}>Sync now</button>
        </div>
        {syncMessage ? <p className="muted">{syncMessage}</p> : null}
        <div className="form-grid">
          <Field label="Current mode" value={syncStatus?.sourceState ?? "Load status to view"} onChange={() => undefined} disabled />
          <Field label="Automatic provider" value={syncStatus?.provider ?? "Iqamah.ca"} onChange={() => undefined} disabled />
          <Field label="Last successful sync" value={syncStatus?.lastSuccessfulSync ? new Date(syncStatus.lastSuccessfulSync).toLocaleString() : "Not available"} onChange={() => undefined} disabled />
          <Field label="Active overrides" value={syncStatus?.activeOverrides?.join(", ") || "None"} onChange={() => undefined} disabled />
        </div>
        {syncStatus?.lastError ? <p className="muted">Last sync warning: {syncStatus.lastError}</p> : null}
      </div>

      <div className="card full">
        <h2>Live public adhan</h2>
        <p className="muted">This section reads the published schedule directly. Protected draft edits are separate until published.</p>
        <div className="form-grid">
          {(["fajr", "dhuhr", "asr", "maghrib", "isha", "sunrise"] as const).map((key) => (
            <Field
              key={key}
              label={`${prayerLabels[key]} adhan`}
              value={livePrayer?.prayerTime[key] ?? (syncStatus?.schedule?.effective.adhan[key] || "Live schedule not loaded")}
              onChange={() => undefined}
              disabled
            />
          ))}
        </div>
      </div>

      <div className="card full">
        <h2>Upcoming-week automatic iqamah</h2>
        <p className="muted">
          These are the existing next-week values returned by the HBIC prayer-times API. Relative values remain relative because the source does not provide a dated next-week adhan timetable.
        </p>
        <div className="form-grid">
          {iqamahOverridePrayers.map((prayer) => (
            <Field
              key={prayer}
              label={`${prayerLabels[prayer]} next week`}
              value={syncStatus?.schedule?.upcomingWeek?.iqamah[prayer] || "Not supplied by source"}
              onChange={() => undefined}
              disabled
            />
          ))}
        </div>
      </div>

      <div className="card full">
        <h2>Manual iqamah overrides</h2>
        <p className="muted">Publish an override to change that prayer everywhere. It expires Sunday at midnight, Calgary time, and the new week's backend timetable takes over automatically.</p>
        {iqamahOverridePrayers.map((prayer) => {
          const override = iqamahTime.overrides?.[prayer] ?? { enabled: false, value: "" };
          const effectiveField = `${prayer}Iqamah` as "fajrIqamah" | "dhuhrIqamah" | "asrIqamah" | "maghribIqamah" | "ishaIqamah";
          const automatic = syncStatus?.schedule?.automatic.iqamah[prayer] || "Live source value unavailable";
          const effective = livePrayer?.iqamahTime[effectiveField] || syncStatus?.schedule?.effective.iqamah[prayer] || "Live schedule not loaded";
          return (
            <div className="card full" key={prayer}>
              <h3>{prayerLabels[prayer]}</h3>
              <div className="form-grid">
                <Field label="Automatic Iqamah.ca value" value={automatic} onChange={() => undefined} disabled />
                <Field label="Currently public" value={effective} onChange={() => undefined} disabled />
                <Field label="Override status" value={overrideStatusLabel(override)} onChange={() => undefined} disabled />
                <ToggleField label="Override enabled" checked={Boolean(override.enabled)} onChange={(enabled) => updateOverride(prayer, { enabled })} />
                <Field label="Override time" value={override.value ?? ""} onChange={(value) => updateOverride(prayer, { value })} />
                <Field label="Starts at (optional ISO/local text)" value={override.startsAt ?? ""} onChange={(startsAt) => updateOverride(prayer, { startsAt })} />
                <Field label="Automatically expires (Calgary Sunday midnight)" value={iqamahOverrideExpiresAt(override) ?? "Set an override time"} onChange={() => undefined} disabled />
                <Field label="Internal note" value={override.note ?? ""} onChange={(note) => updateOverride(prayer, { note })} />
              </div>
              <div className="actions">
                <button className="secondary" onClick={() => clearOverride(prayer)} disabled={disabled}>Clear override</button>
              </div>
            </div>
          );
        })}
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

      <div className="card full">
        <h3>Hijri calendar</h3>
        <Field
          label="Local calendar adjustment (-2 to +2 days)"
          value={String(content.hijriSettings.adjustmentDays)}
          onChange={(value) => {
            const adjustmentDays = Math.max(-2, Math.min(2, Number.parseInt(value, 10) || 0));
            updateContent((current) => ({ hijriSettings: { ...current.hijriSettings, adjustmentDays, updatedAt: new Date().toISOString() } }));
          }}
        />
        <p className="muted">This adjustment is applied to the published Hijri date and White Days label across public clients.</p>
        <div className="actions">
          <button className="secondary" onClick={addHijriOverride} disabled={disabled}>Add date-specific override</button>
        </div>
        {(content.hijriSettings.overrides ?? []).map((override, index) => (
          <div className="card full" key={override.id}>
            <div className="form-grid">
              <Field label="Gregorian date" type="date" value={override.gregorianDate} onChange={(gregorianDate) => updateHijriOverride(index, { gregorianDate })} />
              <Field label="Hijri day" type="number" value={String(override.day)} onChange={(value) => updateHijriOverride(index, { day: Math.max(1, Math.min(30, Number.parseInt(value, 10) || 1)) })} />
              <Field label="Hijri month" value={override.month} onChange={(month) => updateHijriOverride(index, { month })} />
              <Field label="Hijri year" type="number" value={String(override.year)} onChange={(value) => updateHijriOverride(index, { year: Number.parseInt(value, 10) || override.year })} />
              <Field label="Optional public label" value={override.label ?? ""} onChange={(label) => updateHijriOverride(index, { label })} />
              <Field label="Optional Urdu label" value={override.labelUr ?? ""} onChange={(labelUr) => updateHijriOverride(index, { labelUr })} />
              <Field label="Internal note" value={override.note ?? ""} onChange={(note) => updateHijriOverride(index, { note })} />
            </div>
            <div className="actions">
              <button className="secondary" onClick={() => removeHijriOverride(index)} disabled={disabled}>Remove override</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type EditorPanelProps = {
  content: HbicContent;
  updateContent: (updater: (current: HbicContent) => Partial<HbicContent>) => void;
};

function JumuahPanel({ content, updateContent }: EditorPanelProps) {
  const notice = content.jumuahSchedule.doorNotice ?? {
    enabled: false,
    time: content.jumuahSchedule.firstDoorsCloseTime ?? "",
    title: "First Jumu'ah",
    body: "",
    updatedAt: new Date(0).toISOString()
  };

  function updateSchedule(patch: Partial<HbicContent["jumuahSchedule"]>) {
    updateContent((current) => ({
      jumuahSchedule: {
        ...current.jumuahSchedule,
        ...patch,
        manualOverride: true,
        updatedAt: new Date().toISOString()
      }
    }));
  }

  function updateNotice(patch: Partial<NonNullable<HbicContent["jumuahSchedule"]["doorNotice"]>>) {
    updateContent((current) => {
      const currentNotice = current.jumuahSchedule.doorNotice ?? notice;
      const nextNotice = {
        ...currentNotice,
        ...patch,
        updatedAt: new Date().toISOString()
      };
      return {
        jumuahSchedule: {
          ...current.jumuahSchedule,
          firstDoorsCloseTime: typeof patch.time === "string" ? patch.time : current.jumuahSchedule.firstDoorsCloseTime,
          doorNotice: nextNotice,
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  function addException() {
    updateNotice({
      exceptions: [
        ...(notice.exceptions ?? []),
        { date: new Date().toISOString().slice(0, 10), enabled: true }
      ]
    });
  }

  function updateException(index: number, patch: { date?: string; enabled?: boolean; time?: string; body?: string }) {
    updateNotice({
      exceptions: (notice.exceptions ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)
    });
  }

  function removeException(index: number) {
    updateNotice({ exceptions: (notice.exceptions ?? []).filter((_, itemIndex) => itemIndex !== index) });
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Two Jumu&apos;ah prayers</h2>
        <p className="muted">Editing these fields enables the HBIC Jumu&apos;ah override. Clear it to return the public schedule to Iqamah.ca.</p>
        <div className="form-grid">
          <Field label="First khutbah" value={content.jumuahSchedule.firstKhutbahTime} onChange={(firstKhutbahTime) => updateSchedule({ firstKhutbahTime })} />
          <Field label="First iqamah" value={content.jumuahSchedule.firstIqamahTime} onChange={(firstIqamahTime) => updateSchedule({ firstIqamahTime })} />
          <Field label="Second khutbah" value={content.jumuahSchedule.secondKhutbahTime} onChange={(secondKhutbahTime) => updateSchedule({ secondKhutbahTime })} />
          <Field label="Second iqamah" value={content.jumuahSchedule.secondIqamahTime} onChange={(secondIqamahTime) => updateSchedule({ secondIqamahTime })} />
          <Field label="Schedule notes" value={content.jumuahSchedule.notes} textarea onChange={(notes) => updateSchedule({ notes })} />
        </div>
        <div className="actions">
          <button className="secondary" onClick={() => updateContent((current) => ({ jumuahSchedule: { ...current.jumuahSchedule, manualOverride: false, updatedAt: new Date().toISOString() } }))}>Return Jumu&apos;ah to Iqamah.ca</button>
        </div>
      </div>
      <div className="card full">
        <h2>First Jumu&apos;ah door notice</h2>
        <p className="muted">This independent notice appears only while enabled and within its optional effective dates. Date exceptions can change or suppress it without altering prayer times.</p>
        <div className="form-grid">
          <ToggleField
            label="Public feature enabled"
            checked={content.featureFlags.jumuahDoorNoticeEnabled}
            onChange={(jumuahDoorNoticeEnabled) => updateContent((current) => ({ featureFlags: { ...current.featureFlags, jumuahDoorNoticeEnabled } }))}
          />
          <ToggleField label="Notice enabled" checked={notice.enabled} onChange={(enabled) => updateNotice({ enabled })} />
          <Field label="Door-closing time" value={notice.time} onChange={(time) => updateNotice({ time })} />
          <Field label="English title" value={notice.title} onChange={(title) => updateNotice({ title })} />
          <Field label="English message" value={notice.body} textarea onChange={(body) => updateNotice({ body })} />
          <Field label="Urdu title" value={notice.titleUr ?? ""} onChange={(titleUr) => updateNotice({ titleUr })} />
          <Field label="Urdu message" value={notice.bodyUr ?? ""} textarea onChange={(bodyUr) => updateNotice({ bodyUr })} />
          <Field label="Effective from (optional)" type="date" value={notice.effectiveFrom ?? ""} onChange={(effectiveFrom) => updateNotice({ effectiveFrom })} />
          <Field label="Effective until (optional)" type="date" value={notice.effectiveUntil ?? ""} onChange={(effectiveUntil) => updateNotice({ effectiveUntil })} />
          <Field label="Parking notice" value={notice.parkingNotice ?? ""} textarea onChange={(parkingNotice) => updateNotice({ parkingNotice })} />
          <Field label="Capacity notice" value={notice.capacityNotice ?? ""} textarea onChange={(capacityNotice) => updateNotice({ capacityNotice })} />
        </div>
        <div className="actions">
          <button className="secondary" onClick={addException}>Add date exception</button>
        </div>
        {(notice.exceptions ?? []).map((exception, index) => (
          <div className="card full" key={`${exception.date}-${index}`}>
            <div className="form-grid">
              <Field label="Exception date" type="date" value={exception.date} onChange={(date) => updateException(index, { date })} />
              <ToggleField label="Show notice on this date" checked={exception.enabled} onChange={(enabled) => updateException(index, { enabled })} />
              <Field label="Override time (optional)" value={exception.time ?? ""} onChange={(time) => updateException(index, { time })} />
              <Field label="Override message (optional)" value={exception.body ?? ""} textarea onChange={(body) => updateException(index, { body })} />
            </div>
            <div className="actions">
              <button className="secondary" onClick={() => removeException(index)}>Remove exception</button>
            </div>
          </div>
        ))}
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

  function addAnnouncement() {
    updateContent((current) => ({
      announcements: [
        {
          id: `ann-${Date.now()}`,
          title: "New announcement",
          body: "Write the announcement details here.",
          visible: true,
          archived: false,
          priority: "Normal",
          pinned: false,
          urgent: false,
          audience: "All",
          publishedAt: new Date().toISOString(),
          createdBy: "HBIC Admin"
        },
        ...current.announcements
      ]
    }));
  }

  function removeAnnouncement(index: number) {
    updateContent((current) => ({
      announcements: current.announcements.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Announcements</h2>
        <div className="actions"><button className="primary" onClick={addAnnouncement}>Add announcement</button></div>
      </div>
      {content.announcements.map((item, index) => (
        <div className="card" key={item.id}>
          <h2>{item.title || "Announcement"}</h2>
          <Field label="Title" value={item.title} onChange={(value) => updateAnnouncement(index, { title: value })} />
          <Field label="Body" value={item.body} textarea onChange={(value) => updateAnnouncement(index, { body: value })} />
          <ToggleField label="Visible" checked={item.visible !== false && item.archived !== true} onChange={(checked) => updateAnnouncement(index, { visible: checked, archived: !checked })} />
          <ToggleField label="Pinned" checked={item.pinned} onChange={(checked) => updateAnnouncement(index, { pinned: checked })} />
          <ToggleField label="Urgent" checked={item.urgent} onChange={(checked) => updateAnnouncement(index, { urgent: checked })} />
          <div className="actions"><button className="secondary" onClick={() => removeAnnouncement(index)}>Delete</button></div>
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

  function addEvent() {
    updateContent((current) => ({
      events: [
        {
          id: `event-${Date.now()}`,
          title: "New event",
          summary: "Short public summary.",
          description: "Write the full event details here.",
          date: "Upcoming",
          startTime: "",
          endTime: "",
          location: content.settings.masjidName,
          category: "Community",
          image: "community-jumuah.jpg",
          registrationLink: "",
          audience: "All",
          speaker: "HBIC",
          visible: true,
          featured: false,
          notificationEnabled: false,
          createdBy: "HBIC Admin",
          updatedAt: new Date().toISOString()
        },
        ...current.events
      ]
    }));
  }

  function removeEvent(index: number) {
    updateContent((current) => ({ events: current.events.filter((_, eventIndex) => eventIndex !== index) }));
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Events and program cards</h2>
        <div className="actions"><button className="primary" onClick={addEvent}>Add event</button></div>
      </div>
      {content.events.map((event, index) => (
        <div className="card full" key={event.id}>
          <h2>{event.title || "Event"}</h2>
          <div className="form-grid">
            <Field label="Title" value={event.title} onChange={(value) => updateEvent(index, { title: value })} />
            <Field label="Subtitle" value={event.subtitle ?? ""} onChange={(subtitle) => updateEvent(index, { subtitle })} />
            <Field label="Category" value={event.category} onChange={(value) => updateEvent(index, { category: value as ProgramCategory })} />
            <Field label="Date" value={event.date} onChange={(value) => updateEvent(index, { date: value })} />
            <Field label="Start time" value={event.startTime} onChange={(value) => updateEvent(index, { startTime: value })} />
            <Field label="End time" value={event.endTime} onChange={(value) => updateEvent(index, { endTime: value })} />
            <Field label="Duration" value={event.duration ?? ""} onChange={(duration) => updateEvent(index, { duration })} />
            <Field label="Recurring schedule" value={event.recurringSchedule ?? ""} onChange={(recurringSchedule) => updateEvent(index, { recurringSchedule })} />
            <Field label="Location" value={event.location} onChange={(value) => updateEvent(index, { location: value })} />
            <Field label="Speaker" value={event.speaker} onChange={(value) => updateEvent(index, { speaker: value })} />
            <Field label="Registration link" value={event.registrationLink} onChange={(value) => updateEvent(index, { registrationLink: value })} />
            <Field label="Image file" value={event.image} onChange={(value) => updateEvent(index, { image: value })} />
            <Field label="Tags (comma separated)" value={(event.tags ?? []).join(", ")} onChange={(value) => updateEvent(index, { tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
            <Field label="Social caption" value={event.caption ?? ""} textarea onChange={(caption) => updateEvent(index, { caption })} />
            <ChoiceField label="Content state" value={event.status ?? (event.visible === false ? "draft" : "published")} options={["draft", "published"]} onChange={(status) => updateEvent(index, { status: status as EventItem["status"], visible: status === "published" })} />
            <ToggleField label="Visible" checked={event.visible !== false} onChange={(checked) => updateEvent(index, { visible: checked })} />
            <ToggleField label="Featured" checked={event.featured === true} onChange={(checked) => updateEvent(index, { featured: checked })} />
            <Field label="Description" value={event.description} textarea onChange={(value) => updateEvent(index, { description: value })} />
          </div>
          <div className="actions"><button className="secondary" onClick={() => removeEvent(index)}>Delete</button></div>
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

  function addProgram() {
    updateContent((current) => ({
      programs: [
        {
          id: `program-${Date.now()}`,
          title: "New program",
          description: "Write the program summary here.",
          visible: true,
          featured: false,
          contactMethod: "email"
        },
        ...current.programs
      ]
    }));
  }

  function removeProgram(index: number) {
    updateContent((current) => ({ programs: current.programs.filter((_, programIndex) => programIndex !== index) }));
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Programs</h2>
        <div className="actions"><button className="primary" onClick={addProgram}>Add program</button></div>
      </div>
      {content.programs.map((program, index) => (
        <div className="card" key={program.id}>
          <h2>{program.title}</h2>
          <Field label="Program title" value={program.title} onChange={(value) => updateProgram(index, { title: value })} />
          <Field label="Program summary" value={program.description} textarea onChange={(value) => updateProgram(index, { description: value })} />
          <Field label="Image file" value={program.image ?? ""} onChange={(value) => updateProgram(index, { image: value })} />
          <Field label="Link" value={program.href ?? ""} onChange={(value) => updateProgram(index, { href: value })} />
          <ToggleField label="Visible" checked={program.visible !== false} onChange={(checked) => updateProgram(index, { visible: checked })} />
          <ToggleField label="Featured" checked={program.featured === true} onChange={(checked) => updateProgram(index, { featured: checked })} />
          <div className="actions"><button className="secondary" onClick={() => removeProgram(index)}>Delete</button></div>
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

function HalalAdminPanel({
  content,
  updateContent,
  adminRequest,
  disabled
}: EditorPanelProps & {
  adminRequest: (path: string, init?: RequestInit) => Promise<AdminResponse>;
  disabled: boolean;
}) {
  const [submissions, setSubmissions] = useState<RestaurantInterestSubmission[]>([]);
  const [restaurants, setRestaurants] = useState<HalalRestaurant[]>([]);
  const [message, setMessage] = useState("");

  async function loadModeration() {
    setMessage("Loading private moderation data...");
    try {
      const data = await adminRequest("/api/admin/halal");
      setSubmissions(data.submissions ?? []);
      setRestaurants(data.restaurants ?? []);
      setMessage("Directory moderation data loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load directory moderation.");
    }
  }

  async function updateSubmission(id: string, status: RestaurantInterestStatus) {
    try {
      await adminRequest("/api/admin/halal", {
        method: "PATCH",
        body: JSON.stringify({ action: "update-submission", id, status })
      });
      setSubmissions((current) => current.map((item) => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
      setMessage("Submission status saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update submission.");
    }
  }

  async function deleteSubmission(id: string) {
    if (!window.confirm("Permanently delete this private submission? This cannot be undone.")) return;
    try {
      await adminRequest("/api/admin/halal", {
        method: "DELETE",
        body: JSON.stringify({ id })
      });
      setSubmissions((current) => current.filter((item) => item.id !== id));
      setMessage("Private submission permanently deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete submission.");
    }
  }

  function addRestaurantDraft() {
    const now = new Date().toISOString();
    const id = `restaurant-${Date.now()}`;
    setRestaurants((current) => [{
      id,
      slug: id,
      businessName: "",
      description: "",
      cuisine: "",
      tags: [],
      location: {
        address: "",
        city: "Calgary",
        province: "Alberta",
        postalCode: "",
        timezone: "America/Edmonton"
      },
      contact: { phone: "", email: "" },
      operations: {
        hours: {},
        dineIn: false,
        takeout: false,
        delivery: false,
        catering: false,
        reservations: false
      },
      media: { galleryUrls: [], authorizationConfirmed: false },
      halalEvidence: { status: "pending", history: [] },
      publication: { status: "draft" },
      commercial: { listingTier: "standard", sponsored: false },
      createdAt: now,
      updatedAt: now
    }, ...current]);
  }

  function updateRestaurant(index: number, updater: (restaurant: HalalRestaurant) => HalalRestaurant) {
    setRestaurants((current) => current.map((restaurant, itemIndex) =>
      itemIndex === index ? { ...updater(restaurant), updatedAt: new Date().toISOString() } : restaurant
    ));
  }

  async function saveRestaurant(restaurant: HalalRestaurant) {
    try {
      const data = await adminRequest("/api/admin/halal", {
        method: "PATCH",
        body: JSON.stringify({ action: "save-restaurant", restaurant })
      });
      setMessage(data.propagation
        ? data.propagation.status === "provider_error"
          ? `${restaurant.businessName || "Restaurant"} changed on the public directory, but device propagation needs attention: ${data.propagation.error}`
          : `${restaurant.businessName || "Restaurant"} changed on the public directory and all open surfaces were signalled to refresh.`
        : `${restaurant.businessName || "Restaurant draft"} saved privately.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save restaurant.");
    }
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Directory feature controls</h2>
        <p className="muted">The coming-soon page, private intake, and public listings are separate controls. Public listings remain disabled until approved records exist.</p>
        <div className="form-grid">
          <ToggleField label="Coming-soon page" checked={content.featureFlags.halalComingSoonEnabled} onChange={(halalComingSoonEnabled) => updateContent((current) => ({ featureFlags: { ...current.featureFlags, halalComingSoonEnabled } }))} />
          <ToggleField label="Restaurant interest form" checked={content.featureFlags.restaurantInterestFormEnabled} onChange={(restaurantInterestFormEnabled) => updateContent((current) => ({ featureFlags: { ...current.featureFlags, restaurantInterestFormEnabled } }))} />
          <ToggleField label="Approved public listings" checked={content.featureFlags.halalDirectoryListingsEnabled} onChange={(halalDirectoryListingsEnabled) => updateContent((current) => ({ featureFlags: { ...current.featureFlags, halalDirectoryListingsEnabled } }))} />
        </div>
        <div className="actions">
          <button className="secondary" onClick={loadModeration} disabled={disabled}>Load Private Moderation</button>
          <button className="primary" onClick={addRestaurantDraft} disabled={disabled}>New Restaurant Draft</button>
        </div>
        {message ? <p role="status" className="muted">{message}</p> : null}
      </div>

      {submissions.map((submission) => (
        <div className="card full" key={submission.id}>
          <span className="pill">{submission.kind === "directory-notify" ? "Notify request" : "Restaurant interest"}</span>
          <h2>{submission.businessName || submission.email}</h2>
          <p className="muted">Submitted {new Date(submission.submittedAt).toLocaleString()} · Status: {submission.status}</p>
          {submission.contactPerson ? <p><strong>Contact:</strong> {submission.contactPerson} · {submission.email} · {submission.phone}</p> : <p><strong>Email:</strong> {submission.email}</p>}
          {submission.address ? <p><strong>Address:</strong> {submission.address}</p> : null}
          {submission.cuisine ? <p><strong>Cuisine:</strong> {submission.cuisine}</p> : null}
          {submission.currentHalalClaim ? <p><strong>Claim for review:</strong> {submission.currentHalalClaim}</p> : null}
          {submission.message ? <p><strong>Message:</strong> {submission.message}</p> : null}
          <div className="actions">
            {(["new", "reviewing", "contacted", "duplicate", "closed"] as const).map((status) => (
              <button className={submission.status === status ? "primary" : "secondary"} key={status} onClick={() => updateSubmission(submission.id, status)} disabled={disabled}>
                {status}
              </button>
            ))}
            <button className="danger" onClick={() => deleteSubmission(submission.id)} disabled={disabled}>Delete Permanently</button>
          </div>
        </div>
      ))}

      {restaurants.map((restaurant, index) => (
        <div className="card full" key={restaurant.id}>
          <h2>{restaurant.businessName || "New restaurant draft"}</h2>
          <div className="form-grid">
            <Field label="Business name" value={restaurant.businessName} onChange={(businessName) => updateRestaurant(index, (item) => ({ ...item, businessName }))} />
            <Field label="Slug" value={restaurant.slug} onChange={(slug) => updateRestaurant(index, (item) => ({ ...item, slug }))} />
            <Field label="Cuisine" value={restaurant.cuisine} onChange={(cuisine) => updateRestaurant(index, (item) => ({ ...item, cuisine }))} />
            <Field label="Tags (comma separated)" value={restaurant.tags.join(", ")} onChange={(value) => updateRestaurant(index, (item) => ({ ...item, tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) }))} />
            <Field label="Public description" value={restaurant.description} textarea onChange={(description) => updateRestaurant(index, (item) => ({ ...item, description }))} />
            <Field label="Address" value={restaurant.location.address} onChange={(address) => updateRestaurant(index, (item) => ({ ...item, location: { ...item.location, address } }))} />
            <Field label="City" value={restaurant.location.city} onChange={(city) => updateRestaurant(index, (item) => ({ ...item, location: { ...item.location, city } }))} />
            <Field label="Province" value={restaurant.location.province} onChange={(province) => updateRestaurant(index, (item) => ({ ...item, location: { ...item.location, province } }))} />
            <Field label="Postal code" value={restaurant.location.postalCode} onChange={(postalCode) => updateRestaurant(index, (item) => ({ ...item, location: { ...item.location, postalCode } }))} />
            <Field label="Public phone" value={restaurant.contact.phone} onChange={(phone) => updateRestaurant(index, (item) => ({ ...item, contact: { ...item.contact, phone } }))} />
            <Field label="Private contact email" value={restaurant.contact.email} onChange={(email) => updateRestaurant(index, (item) => ({ ...item, contact: { ...item.contact, email } }))} />
            <Field label="Website" value={restaurant.contact.website ?? ""} onChange={(website) => updateRestaurant(index, (item) => ({ ...item, contact: { ...item.contact, website } }))} />
            <Field label="Menu URL" value={restaurant.contact.menuUrl ?? ""} onChange={(menuUrl) => updateRestaurant(index, (item) => ({ ...item, contact: { ...item.contact, menuUrl } }))} />
            <ChoiceField label="Halal status" value={restaurant.halalEvidence.status} options={["pending", "verified-by-masjid", "certificate-reviewed", "owner-declared", "partial-menu", "expired", "suspended"]} onChange={(status) => updateRestaurant(index, (item) => ({ ...item, halalEvidence: { ...item.halalEvidence, status: status as HalalRestaurant["halalEvidence"]["status"] } }))} />
            <Field label="Public halal summary" value={restaurant.halalEvidence.publicSummary ?? ""} textarea onChange={(publicSummary) => updateRestaurant(index, (item) => ({ ...item, halalEvidence: { ...item.halalEvidence, publicSummary } }))} />
            <Field label="Verification expiry (optional)" type="date" value={restaurant.halalEvidence.expiresAt?.slice(0, 10) ?? ""} onChange={(expiresAt) => updateRestaurant(index, (item) => ({ ...item, halalEvidence: { ...item.halalEvidence, expiresAt } }))} />
            <ChoiceField label="Publication state" value={restaurant.publication.status} options={["draft", "pending", "approved", "published", "suspended", "expired", "rejected", "archived"]} onChange={(status) => updateRestaurant(index, (item) => ({ ...item, publication: { ...item.publication, status: status as HalalRestaurant["publication"]["status"] } }))} />
            <Field label="Internal publication note" value={restaurant.publication.internalNote ?? ""} textarea onChange={(internalNote) => updateRestaurant(index, (item) => ({ ...item, publication: { ...item.publication, internalNote } }))} />
            <ToggleField label="Media authorization confirmed" checked={restaurant.media.authorizationConfirmed} onChange={(authorizationConfirmed) => updateRestaurant(index, (item) => ({ ...item, media: { ...item.media, authorizationConfirmed } }))} />
            <ToggleField label="Sponsored listing" checked={restaurant.commercial.sponsored} onChange={(sponsored) => updateRestaurant(index, (item) => ({ ...item, commercial: { ...item.commercial, sponsored } }))} />
          </div>
          <p className="muted">Sponsorship is stored separately and never changes verification status.</p>
          <div className="actions">
            <button className="primary" onClick={() => saveRestaurant(restaurant)} disabled={disabled}>Save Private Restaurant Record</button>
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
          <Field label="Required skills (comma separated)" value={(opportunity.skills ?? []).join(", ")} onChange={(value) => updateVolunteer(index, { skills: value.split(",").map((item) => item.trim()).filter(Boolean) })} />
          <Field label="Minimum age" type="number" value={opportunity.minimumAge?.toString() ?? ""} onChange={(value) => updateVolunteer(index, { minimumAge: value ? Number(value) : undefined })} />
          <Field label="Capacity" type="number" value={opportunity.capacity?.toString() ?? ""} onChange={(value) => updateVolunteer(index, { capacity: value ? Number(value) : undefined })} />
          <ChoiceField label="Status" value={opportunity.status ?? "open"} options={["open", "full", "closed"]} onChange={(value) => updateVolunteer(index, { status: value as VolunteerOpportunity["status"] })} />
          <ToggleField label="Visible" checked={opportunity.visible !== false} onChange={(visible) => updateVolunteer(index, { visible })} />
          <Field label="Description" value={opportunity.description} textarea onChange={(value) => updateVolunteer(index, { description: value })} />
        </div>
      ))}
    </div>
  );
}

function CommunityAdminPanel({
  content,
  updateContent,
  adminRequest,
  disabled
}: EditorPanelProps & {
  adminRequest: (path: string, init?: RequestInit) => Promise<AdminResponse>;
  disabled: boolean;
}) {
  const [submissions, setSubmissions] = useState<AskMasjidSubmission[]>([]);
  const [message, setMessage] = useState("");
  const publicationStates = ["draft", "published", "archived"] as const;
  const questionStates: AskMasjidSubmissionStatus[] = ["new", "reviewing", "routed", "answered", "closed", "duplicate"];

  function updateResource(index: number, patch: Partial<NewMuslimResource>) {
    updateContent((current) => ({
      newMuslimResources: current.newMuslimResources.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      )
    }));
  }

  function updateService(index: number, patch: Partial<LocalMuslimService>) {
    updateContent((current) => ({
      localMuslimServices: current.localMuslimServices.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      )
    }));
  }

  function updateBenefit(index: number, patch: Partial<DailyBenefit>) {
    updateContent((current) => ({
      dailyBenefits: current.dailyBenefits.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item
      )
    }));
  }

  function addResource() {
    const now = new Date().toISOString();
    updateContent((current) => ({
      newMuslimResources: [
        ...current.newMuslimResources,
        {
          id: `new-muslim-${Date.now()}`,
          category: "visiting",
          title: "New resource",
          summary: "",
          status: "draft",
          visible: false,
          sortOrder: current.newMuslimResources.length,
          updatedAt: now
        }
      ]
    }));
  }

  function addService() {
    const now = new Date().toISOString();
    updateContent((current) => ({
      localMuslimServices: [
        ...current.localMuslimServices,
        {
          id: `local-service-${Date.now()}`,
          category: "schools",
          title: "New service",
          summary: "",
          status: "draft",
          visible: false,
          sortOrder: current.localMuslimServices.length,
          updatedAt: now
        }
      ]
    }));
  }

  function addBenefit() {
    const now = new Date().toISOString();
    updateContent((current) => ({
      dailyBenefits: [
        ...current.dailyBenefits,
        {
          id: `daily-benefit-${Date.now()}`,
          kind: "imam-message",
          title: "New benefit",
          body: "",
          source: "",
          reviewer: "",
          publishFrom: now,
          status: "draft",
          visible: false,
          updatedAt: now
        }
      ]
    }));
  }

  async function loadSubmissions() {
    setMessage("Loading private questions...");
    try {
      const data = await adminRequest("/api/admin/community");
      setSubmissions(Array.isArray(data.submissions) ? data.submissions : []);
      setMessage(`Loaded ${data.submissions?.length ?? 0} private questions.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load private questions.");
    }
  }

  async function updateSubmission(item: AskMasjidSubmission, status: AskMasjidSubmissionStatus) {
    setMessage("Saving question status...");
    try {
      await adminRequest("/api/admin/community", {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          status,
          routedTo: item.routedTo,
          adminNote: item.adminNote
        })
      });
      setSubmissions((current) => current.map((submission) =>
        submission.id === item.id ? { ...submission, status } : submission
      ));
      setMessage("Private question status updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this question.");
    }
  }

  async function deleteSubmission(item: AskMasjidSubmission) {
    if (!window.confirm("Permanently delete this private question? This cannot be undone.")) return;
    setMessage("Deleting private question...");
    try {
      await adminRequest("/api/admin/community", {
        method: "DELETE",
        body: JSON.stringify({ id: item.id })
      });
      setSubmissions((current) => current.filter((submission) => submission.id !== item.id));
      setMessage("Private question permanently deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this question.");
    }
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Community publishing controls</h2>
        <p className="muted">
          Draft records stay private. A module appears publicly only when its feature flag is enabled and it contains an approved published record.
        </p>
      </div>

      <div className="card full">
        <h2>Ask the Masjid</h2>
        <div className="form-grid">
          <ToggleField
            label="Private intake enabled"
            checked={content.askMasjidSettings.enabled}
            onChange={(enabled) => updateContent((current) => ({
              askMasjidSettings: { ...current.askMasjidSettings, enabled, updatedAt: new Date().toISOString() }
            }))}
          />
          <Field
            label="Response owner"
            value={content.askMasjidSettings.responseOwner}
            onChange={(responseOwner) => updateContent((current) => ({
              askMasjidSettings: { ...current.askMasjidSettings, responseOwner, updatedAt: new Date().toISOString() }
            }))}
          />
          <Field
            label="Private routing email"
            type="email"
            value={content.askMasjidSettings.routingEmail}
            onChange={(routingEmail) => updateContent((current) => ({
              askMasjidSettings: { ...current.askMasjidSettings, routingEmail, updatedAt: new Date().toISOString() }
            }))}
          />
          <Field
            label="Categories (comma separated)"
            value={content.askMasjidSettings.categories.join(", ")}
            onChange={(value) => updateContent((current) => ({
              askMasjidSettings: {
                ...current.askMasjidSettings,
                categories: value.split(",").map((item) => item.trim()).filter(Boolean),
                updatedAt: new Date().toISOString()
              }
            }))}
          />
          <Field
            label="Privacy notice"
            textarea
            value={content.askMasjidSettings.privacyNotice}
            onChange={(privacyNotice) => updateContent((current) => ({
              askMasjidSettings: { ...current.askMasjidSettings, privacyNotice, updatedAt: new Date().toISOString() }
            }))}
          />
        </div>
        <div className="actions">
          <button className="secondary" onClick={loadSubmissions} disabled={disabled}>Load Private Questions</button>
        </div>
        {message ? <p className="muted" role="status">{message}</p> : null}
      </div>

      {submissions.map((submission) => (
        <div className="card" key={submission.id}>
          <span className="pill">{submission.category}</span>
          <h2>{submission.name || "Community member"}</h2>
          <p>{submission.question}</p>
          <p className="muted">{submission.email} · {new Date(submission.submittedAt).toLocaleString()}</p>
          <ChoiceField
            label="Status"
            value={submission.status}
            options={questionStates}
            onChange={(status) => void updateSubmission(submission, status as AskMasjidSubmissionStatus)}
          />
          <div className="actions">
            <button className="danger" onClick={() => void deleteSubmission(submission)} disabled={disabled}>Delete Permanently</button>
          </div>
        </div>
      ))}

      <div className="card full">
        <div className="actions">
          <h2>New Muslim resources</h2>
          <button className="secondary" onClick={addResource}>Add Draft Resource</button>
        </div>
      </div>
      {content.newMuslimResources.map((resource, index) => (
        <div className="card" key={resource.id}>
          <Field label="Title" value={resource.title} onChange={(title) => updateResource(index, { title })} />
          <Field label="Summary" textarea value={resource.summary} onChange={(summary) => updateResource(index, { summary })} />
          <Field label="Urdu title" value={resource.titleUr ?? ""} onChange={(titleUr) => updateResource(index, { titleUr })} />
          <Field label="Urdu summary" textarea value={resource.summaryUr ?? ""} onChange={(summaryUr) => updateResource(index, { summaryUr })} />
          <ChoiceField label="Publication state" value={resource.status} options={publicationStates} onChange={(status) => updateResource(index, { status: status as NewMuslimResource["status"] })} />
          <ToggleField label="Visible" checked={resource.visible} onChange={(visible) => updateResource(index, { visible })} />
        </div>
      ))}

      <div className="card full">
        <div className="actions">
          <h2>Local Muslim services</h2>
          <button className="secondary" onClick={addService}>Add Draft Service</button>
        </div>
      </div>
      {content.localMuslimServices.map((service, index) => (
        <div className="card" key={service.id}>
          <Field label="Title" value={service.title} onChange={(title) => updateService(index, { title })} />
          <Field label="Summary" textarea value={service.summary} onChange={(summary) => updateService(index, { summary })} />
          <Field label="Contact label" value={service.contactLabel ?? ""} onChange={(contactLabel) => updateService(index, { contactLabel })} />
          <Field label="Contact URL" value={service.contactUrl ?? ""} onChange={(contactUrl) => updateService(index, { contactUrl })} />
          <ChoiceField label="Publication state" value={service.status} options={publicationStates} onChange={(status) => updateService(index, { status: status as LocalMuslimService["status"] })} />
          <ToggleField label="Visible" checked={service.visible} onChange={(visible) => updateService(index, { visible })} />
        </div>
      ))}

      <div className="card full">
        <div className="actions">
          <h2>Daily Benefit</h2>
          <button className="secondary" onClick={addBenefit}>Add Draft Benefit</button>
        </div>
      </div>
      {content.dailyBenefits.map((benefit, index) => (
        <div className="card" key={benefit.id}>
          <Field label="Title" value={benefit.title} onChange={(title) => updateBenefit(index, { title })} />
          <Field label="Body" textarea value={benefit.body} onChange={(body) => updateBenefit(index, { body })} />
          <Field label="Source" value={benefit.source} onChange={(source) => updateBenefit(index, { source })} />
          <Field label="Reviewer" value={benefit.reviewer} onChange={(reviewer) => updateBenefit(index, { reviewer })} />
          <Field label="Publish from" type="datetime-local" value={benefit.publishFrom.slice(0, 16)} onChange={(publishFrom) => updateBenefit(index, { publishFrom })} />
          <Field label="Publish until" type="datetime-local" value={benefit.publishUntil?.slice(0, 16) ?? ""} onChange={(publishUntil) => updateBenefit(index, { publishUntil })} />
          <ChoiceField label="Publication state" value={benefit.status} options={publicationStates} onChange={(status) => updateBenefit(index, { status: status as DailyBenefit["status"] })} />
          <ToggleField label="Visible" checked={benefit.visible} onChange={(visible) => updateBenefit(index, { visible })} />
        </div>
      ))}
    </div>
  );
}

function PushPanel({
  adminRequest,
  disabled
}: {
  adminRequest: (path: string, init?: RequestInit) => Promise<AdminResponse>;
  disabled: boolean;
}) {
  const [title, setTitle] = useState("Masjid Bilal update");
  const [body, setBody] = useState("A new community update is available.");
  const [audience, setAudience] = useState<NotificationAudience | "Android" | "iOS" | "Everyone">("Everyone");
  const [route, setRoute] = useState<NotificationRoute>("/");
  const [type, setType] = useState<NotificationType>("announcement");
  const [eventId, setEventId] = useState("");
  const [message, setMessage] = useState("");
  const [lastLogId, setLastLogId] = useState("");

  async function sendNotification() {
    setMessage("");
    try {
      const data = await adminRequest("/api/admin/notifications/send", {
        method: "POST",
        body: JSON.stringify({ title, body, audience, route, type, eventId: route === "/events" ? eventId : undefined })
      });
      const result = data.result ?? {};
      setLastLogId(result.logId ?? "");
      setMessage(`Accepted: ${result.successCount ?? 0}. Failed: ${result.failureCount ?? 0}. Target devices: ${result.tokenCount ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to send notification.");
    }
  }

  async function checkDelivery() {
    if (!lastLogId) return;
    setMessage("");
    try {
      const data = await adminRequest("/api/admin/notifications/receipts", {
        method: "POST",
        body: JSON.stringify({ logId: lastLogId })
      });
      const result = data.result ?? {};
      setMessage(`Delivered: ${result.deliveredCount ?? 0}. Failed: ${result.failedCount ?? 0}. Pending: ${result.pendingCount ?? 0}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to check notification delivery.");
    }
  }

  return (
    <div className="grid">
      <div className="card full">
        <h2>Send push notification</h2>
        <p className="muted">This sends through the protected server endpoint to registered Expo push tokens. Keep messages respectful and useful.</p>
        <div className="form-grid">
          <Field label="Title" value={title} onChange={setTitle} />
          <Field label="Body" value={body} textarea onChange={setBody} />
          <label className="field">
            <span>Audience</span>
            <select value={audience} onChange={(event) => setAudience(event.target.value as typeof audience)}>
              {pushAudiences.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Field label="Route" value={route} onChange={(value) => setRoute(value as NotificationRoute)} />
          <Field label="Type" value={type} onChange={(value) => setType(value as NotificationType)} />
          {route === "/events" ? <Field label="Event ID (optional)" value={eventId} onChange={setEventId} /> : null}
        </div>
        <div className="actions">
          <button className="primary" onClick={sendNotification} disabled={disabled}>Send notification</button>
          {lastLogId ? <button onClick={checkDelivery} disabled={disabled}>Check delivery</button> : null}
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </div>
      {notificationCategories.map((item) => (
        <div className="card third" key={item.type}>
          <h3>{item.label}</h3>
          <p className="muted">{item.description}</p>
          <p className="muted">{item.respectfulUse}</p>
        </div>
      ))}
      <div className="card full">
        <h2>Delivery status</h2>
        <p className="muted">Each send is recorded. After the provider accepts it, use Check delivery to confirm the final receipt and automatically disable invalid device registrations.</p>
      </div>
    </div>
  );
}

function DiagnosticsPanel({ adminRequest }: { adminRequest: (path: string, init?: RequestInit) => Promise<AdminResponse> }) {
  const [status, setStatus] = useState<AdminResponse | null>(null);
  const [message, setMessage] = useState("");

  async function loadDiagnostics() {
    setMessage("");
    try {
      const data = await adminRequest("/api/admin/diagnostics");
      setStatus(data);
      setMessage("Diagnostics loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load diagnostics.");
    }
  }

  const diagnostics = status?.diagnostics ?? {};
  const prayerSync = status?.prayerSync ?? {};

  return (
    <div className="grid">
      <div className="card full">
        <h2>Production diagnostics</h2>
        <p className="muted">Protected status for publishing, database, prayer sync, public API, and notification readiness.</p>
        <div className="actions"><button className="primary" onClick={loadDiagnostics}>Refresh status</button></div>
        {message ? <p className="muted">{message}</p> : null}
      </div>
      {[
        ["Database mode", diagnostics.databaseMode ?? "Not loaded"],
        ["Published version", diagnostics.latestPublishedVersion ? `v${diagnostics.latestPublishedVersion}` : "Not loaded"],
        ["Published at", diagnostics.latestPublishedAt ? new Date(diagnostics.latestPublishedAt).toLocaleString() : "Not loaded"],
        ["Publication revision", diagnostics.publicationRevision !== undefined
          ? `r${diagnostics.publicationRevision} · ${diagnostics.publicationKind ?? "content"}`
          : "Not loaded"],
        ["Public API", diagnostics.publicApiPath ?? "/api/content/published"],
        ["Prayer sync", prayerSync.sourceState ?? "Not loaded"],
        ["Last prayer sync", prayerSync.lastSuccessfulSync ? new Date(prayerSync.lastSuccessfulSync).toLocaleString() : "Not loaded"],
        ["Active overrides", String(diagnostics.activeOverridesCount ?? 0)],
        ["Push tokens", String(diagnostics.pushTokenCount ?? 0)],
        ["Notification service", diagnostics.notificationService ?? "Not loaded"],
        ["Latest propagation", diagnostics.latestPropagationStatus
          ? `${diagnostics.latestPropagationStatus} · v${diagnostics.latestPropagationVersion ?? "?"}`
          : "Not loaded"],
        ["Propagation accepted", String(diagnostics.latestPropagationSuccessCount ?? 0)],
        ["Propagation failures", String(diagnostics.latestPropagationFailureCount ?? 0)],
        ["Schema", diagnostics.schemaVersion ?? "Not loaded"]
      ].map(([label, value]) => (
        <div className="card third" key={label}>
          <p className="muted">{label}</p>
          <h3>{value}</h3>
        </div>
      ))}
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

function FeatureFlagsPanel({ content, updateContent }: EditorPanelProps) {
  const labels: Array<[keyof HbicContent["featureFlags"], string, string]> = [
    ["communityHubEnabled", "Community hub", "Ready public Community navigation and spotlight."],
    ["hijriDateEnabled", "Hijri date", "Shared Hijri date across public clients."],
    ["whiteDaysEnabled", "White Days display", "Shows 13th, 14th, and 15th as voluntary fasting days."],
    ["whiteDaysNotificationsEnabled", "White Days notification option", "Allows user opt-in; does not send automatically."],
    ["jumuahDoorNoticeEnabled", "Jumu'ah door notice", "Shows the effective independently managed notice."],
    ["halalComingSoonEnabled", "Halal Restaurants coming soon", "Shows the intentional preview page."],
    ["halalDirectoryListingsEnabled", "Approved halal listings", "Keep disabled until reviewed published records exist."],
    ["restaurantInterestFormEnabled", "Restaurant interest form", "Enable only after production intake security QA."],
    ["newMuslimResourcesEnabled", "New Muslim resources", "Enable only with approved resources and routing."],
    ["localServicesEnabled", "Local Muslim services", "Enable only with reviewed listings."],
    ["volunteerEnabled", "Volunteer", "Shows current volunteer pathway."],
    ["askMasjidEnabled", "Ask the Masjid", "Enable only with private routing and response ownership."],
    ["dailyBenefitEnabled", "Daily Benefit", "Enable only with approved sourced content and reviewer."],
    ["seasonalModeEnabled", "Seasonal resources", "Allows active Ramadan/Eid content."],
    ["historyOfFiqhEventEnabled", "History of Fiqh", "Show the recurring three-week Sunday program on the app and website."]
  ];

  return (
    <div className="grid">
      <div className="card full">
        <h2>Public feature controls</h2>
        <p className="muted">Flags are saved in the draft and become public only after Publish Changes succeeds. Hidden modules remain available for preparation in admin.</p>
      </div>
      {labels.map(([key, label, description]) => (
        <div className="card third" key={key}>
          <ToggleField
            label={label}
            checked={content.featureFlags[key]}
            onChange={(checked) => updateContent((current) => ({
              featureFlags: { ...current.featureFlags, [key]: checked }
            }))}
          />
          <p className="muted">{description}</p>
        </div>
      ))}
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
