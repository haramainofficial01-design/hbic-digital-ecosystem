"use client";

import {
  defaultContent,
  normalizeContent,
  prayerLabels,
  validateContent,
  type HbicContent,
  type IqamahPrayerName
} from "@hbic/shared";
import { useCallback, useEffect, useState } from "react";
import { FirebaseAdminAuth } from "./FirebaseAdminAuth";
import styles from "./DisplayAdmin.module.css";

const iqamahPrayers: IqamahPrayerName[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

type PrayerSyncStatus = {
  provider: "Iqamah.ca";
  sourceState: "live" | "cached" | "unavailable";
  schedule?: {
    automatic: { iqamah: Record<IqamahPrayerName, string>; jumuah?: { first: string; second: string } };
    effective: { iqamah: Record<IqamahPrayerName, string>; jumuah: { first: string; second: string } };
  };
};

function toTimeInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "";
  let hour = Number(match[1]);
  if (match[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

function fromTimeInput(value: string) {
  const [hourRaw, minute] = value.split(":");
  const hour = Number(hourRaw);
  if (!Number.isFinite(hour) || !minute) return "";
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

export function DisplayAdmin() {
  const [content, setContent] = useState<HbicContent>(defaultContent);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [draftUpdatedAt, setDraftUpdatedAt] = useState<string | null>(null);
  const [publishedVersion, setPublishedVersion] = useState(defaultContent.version);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Sign in with your personal administrator account and MFA to continue.");
  const [tone, setTone] = useState<"info" | "success" | "error">("info");
  const [syncStatus, setSyncStatus] = useState<PrayerSyncStatus | null>(null);
  const handleAdminSession = useCallback((token: string | null) => {
    setAdminToken(token);
    if (!token) setLoaded(false);
  }, []);

  useEffect(() => {
    void fetch("/api/content/published", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (data?.content) setPublishedVersion(normalizeContent(data.content).version);
      })
      .catch(() => undefined);
  }, []);

  function update(updater: (current: HbicContent) => HbicContent) {
    setContent((current) => normalizeContent({ ...updater(current), status: "draft" }));
  }

  async function adminRequest(path: string, init?: RequestInit) {
    if (!adminToken) throw new Error("Complete personal administrator sign-in and MFA first.");
    const response = await fetch(path, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: adminToken,
        ...(init?.headers ?? {})
      }
    });
    const data = await response.json();
    if (!response.ok || data?.ok === false) throw new Error(data?.error || "The admin request failed.");
    return data;
  }

  async function loadDraft() {
    setBusy(true);
    try {
      const data = await adminRequest("/api/admin/content/draft");
      const syncData = await adminRequest("/api/admin/prayer-sync");
      const draft = normalizeContent(data.content);
      setContent(draft);
      setDraftUpdatedAt(typeof data.draftUpdatedAt === "string" ? data.draftUpdatedAt : null);
      setLoaded(true);
      setSyncStatus(syncData.prayerSync as PrayerSyncStatus);
      setTone("success");
      setMessage("Protected draft loaded. Changes below use the shared website and app schedule.");
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Unable to load the draft.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAndPublish() {
    if (!loaded) {
      setTone("error");
      setMessage("Load the protected draft before publishing so no existing content is lost.");
      return;
    }
    const errors = validateContent(content);
    if (errors.length) {
      setTone("error");
      setMessage(errors.join(" "));
      return;
    }
    if (!window.confirm("Publish these canonical prayer-display changes to the website, apps, widgets, Watch, and TV now?")) return;

    setBusy(true);
    try {
      const liveResponse = await fetch(`/api/content/published?compare=${Date.now()}`, { cache: "no-store" });
      const liveData = await liveResponse.json();
      if (!liveResponse.ok || !liveData?.content) throw new Error("The current public version could not be checked. Nothing was published.");
      const live = normalizeContent(liveData.content);
      if (live.version > publishedVersion) {
        throw new Error(`A newer public version (v${live.version}) exists. Reload the protected draft before publishing.`);
      }

      const saved = await adminRequest("/api/admin/content/draft", {
        method: "POST",
        body: JSON.stringify({ content, expectedDraftUpdatedAt: draftUpdatedAt })
      });
      const published = await adminRequest("/api/admin/content/publish", {
        method: "POST",
        body: JSON.stringify({
          expectedDraftUpdatedAt: saved.draftUpdatedAt,
          expectedPublishedVersion: live.version
        })
      });
      const verifyResponse = await fetch(`/api/display?verify=${Date.now()}`, { cache: "no-store" });
      const verified = await verifyResponse.json();
      if (!verifyResponse.ok || !verified?.ok || verified.contentVersion < published.content.version) {
        throw new Error("Publish completed, but the live prayer display has not returned the new version yet.");
      }

      setContent(normalizeContent({ ...published.content, status: "draft" }));
      setDraftUpdatedAt(typeof published.publication?.updatedAt === "string" ? published.publication.updatedAt : null);
      setPublishedVersion(verified.contentVersion);
      setTone("success");
      const signal = published.propagation?.status;
      setMessage(signal === "provider_error"
        ? `Published v${verified.contentVersion} and verified live. Device refresh signal warning: ${published.propagation?.error || "provider error"}.`
        : `✓ Prayer times updated — published v${verified.contentVersion}, verified on the live TV endpoint, and device refresh sent.`);
    } catch (error) {
      setTone("error");
      setMessage(error instanceof Error ? error.message : "Unable to publish changes.");
    } finally {
      setBusy(false);
    }
  }

  function updateIqamah(prayer: IqamahPrayerName, value: string) {
    const formatted = fromTimeInput(value);
    const field = `${prayer}Iqamah` as keyof HbicContent["iqamahTime"];
    const updatedAt = new Date().toISOString();
    update((current) => ({
      ...current,
      iqamahTime: {
        ...current.iqamahTime,
        [field]: formatted,
        manualOverride: true,
        overrides: {
          ...(current.iqamahTime.overrides ?? {}),
          [prayer]: {
            ...(current.iqamahTime.overrides?.[prayer] ?? {}),
            enabled: true,
            value: formatted,
            updatedAt
          }
        },
        updatedAt
      }
    }));
  }

  function clearIqamahOverride(prayer: IqamahPrayerName) {
    const automatic = syncStatus?.schedule?.automatic.iqamah[prayer] ?? "";
    const field = `${prayer}Iqamah` as keyof HbicContent["iqamahTime"];
    update((current) => {
      const overrides = { ...(current.iqamahTime.overrides ?? {}) };
      delete overrides[prayer];
      return {
        ...current,
        iqamahTime: {
          ...current.iqamahTime,
          ...(automatic ? { [field]: automatic } : {}),
          overrides,
          manualOverride: Object.values(overrides).some((override) => override?.enabled),
          updatedAt: new Date().toISOString()
        }
      };
    });
  }

  const display = content.displaySettings;
  const notice = display.announcement;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Masjid Bilal</span>
          <h1>Prayer Display Admin</h1>
          <p>One canonical schedule for the website, apps, widgets, Watch, and prayer hall TV.</p>
        </div>
        <a className={styles.preview} href="/display" target="_blank" rel="noreferrer">Open live display ↗</a>
      </header>

      <section className={styles.authCard}>
        <FirebaseAdminAuth onSession={handleAdminSession} />
        <button onClick={loadDraft} disabled={busy || !adminToken}>{busy ? "Working…" : "Load protected draft"}</button>
      </section>

      <div className={`${styles.status} ${styles[tone]}`} role="status">{message}</div>

      <fieldset className={styles.editor} disabled={!loaded || busy}>
        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <div><span>Canonical schedule</span><h2>Prayer &amp; iqamah</h2></div>
            <small>Iqamah.ca supplies automatic values. An override replaces only that prayer everywhere until cleared.</small>
          </div>
          <div className={styles.prayerRows}>
            {content.prayerTime && (["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const).map((prayer) => {
              const editable = prayer !== "sunrise";
              const iqamahField = `${prayer}Iqamah` as keyof HbicContent["iqamahTime"];
              const automatic = editable ? syncStatus?.schedule?.automatic.iqamah[prayer as IqamahPrayerName] : undefined;
              const hasOverride = editable && Boolean(content.iqamahTime.overrides?.[prayer as IqamahPrayerName]?.enabled);
              const effective = editable
                ? hasOverride
                  ? content.iqamahTime.overrides?.[prayer as IqamahPrayerName]?.value
                  : automatic ?? syncStatus?.schedule?.effective.iqamah[prayer as IqamahPrayerName]
                : undefined;
              return (
                <div className={styles.prayerRow} key={prayer}>
                  <strong>{prayerLabels[prayer]}</strong>
                  <label><span>Adhan</span><input value={content.prayerTime[prayer]} readOnly /></label>
                  <label className={!editable ? styles.hiddenIqamah : undefined}>
                    <span>{editable ? "Automatic" : ""}</span>
                    <input readOnly value={automatic ?? ""} />
                  </label>
                  <label className={!editable ? styles.hiddenIqamah : undefined}>
                    <span>{editable ? "Manual override" : ""}</span>
                    {editable ? (
                      <input
                        type="time"
                        value={toTimeInput(String(content.iqamahTime[iqamahField] ?? ""))}
                        onChange={(event) => updateIqamah(prayer as IqamahPrayerName, event.target.value)}
                      />
                    ) : <input readOnly value="" />}
                  </label>
                  <label className={!editable ? styles.hiddenIqamah : undefined}>
                    <span>{editable ? "Currently public" : ""}</span>
                    <input readOnly value={effective ?? String(content.iqamahTime[iqamahField] ?? "")} />
                  </label>
                  {editable ? <button type="button" className={styles.clearOverride} disabled={!hasOverride} onClick={() => clearIqamahOverride(prayer as IqamahPrayerName)}>Clear override</button> : <span />}
                </div>
              );
            })}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}><div><span>Canonical schedule</span><h2>Jumu’ah</h2></div></div>
          <div className={styles.formGrid}>
            {([
              ["First khutbah", "firstKhutbahTime"],
              ["First iqamah", "firstIqamahTime"],
              ["Second khutbah", "secondKhutbahTime"],
              ["Second iqamah", "secondIqamahTime"]
            ] as const).map(([label, field]) => (
              <label key={field}>
                <span>{label}</span>
                <input
                  type="time"
                  value={toTimeInput(content.jumuahSchedule[field])}
                  onChange={(event) => update((current) => ({
                    ...current,
                    jumuahSchedule: { ...current.jumuahSchedule, [field]: fromTimeInput(event.target.value), manualOverride: true, updatedAt: new Date().toISOString() }
                  }))}
                />
              </label>
            ))}
          </div>
          <button type="button" className={styles.clearOverride} onClick={() => update((current) => ({
            ...current,
            jumuahSchedule: { ...current.jumuahSchedule, manualOverride: false, updatedAt: new Date().toISOString() }
          }))}>Return Jumu’ah to Iqamah.ca</button>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <div><span>TV presentation only</span><h2>Display options</h2></div>
            <small>These options never change prayer calculations.</small>
          </div>
          <label className={styles.fullField}>
            <span>Display title</span>
            <input value={display.title} maxLength={48} onChange={(event) => update((current) => ({
              ...current,
              displaySettings: { ...current.displaySettings, title: event.target.value, updatedAt: new Date().toISOString() }
            }))} />
          </label>
          <div className={styles.toggles}>
            {([
              ["Current Calgary weather", "showWeather"],
              ["Gregorian date", "showGregorianDate"],
              ["Hijri date", "showHijriDate"],
              ["Jumu’ah times", "showJumuah"],
              ["hbic.ca", "showWebsite"],
              ["Verified social accounts", "showSocialLinks"],
              ["Apple & Google Play QR codes", "showQrCode"]
            ] as const).map(([label, field]) => (
              <Toggle key={field} label={label} checked={display[field]} onChange={(value) => update((current) => ({
                ...current,
                displaySettings: { ...current.displaySettings, [field]: value, updatedAt: new Date().toISOString() }
              }))} />
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionTitle}>
            <div><span>One message maximum</span><h2>Masjid notice</h2></div>
            <small>{notice.message.length}/140</small>
          </div>
          <Toggle label="Show notice" checked={notice.enabled} onChange={(enabled) => update((current) => ({
            ...current,
            displaySettings: {
              ...current.displaySettings,
              announcement: { ...current.displaySettings.announcement, enabled, updatedAt: new Date().toISOString() }
            }
          }))} />
          <label className={styles.fullField}>
            <span>Short notice</span>
            <textarea rows={2} maxLength={140} value={notice.message} placeholder="Jumu’ah doors close at 1:30 PM. Please park responsibly." onChange={(event) => update((current) => ({
              ...current,
              displaySettings: {
                ...current.displaySettings,
                announcement: { ...current.displaySettings.announcement, message: event.target.value, updatedAt: new Date().toISOString() }
              }
            }))} />
          </label>
          <div className={styles.formGrid}>
            <label><span>Starts (optional)</span><input type="datetime-local" value={notice.startsAt?.slice(0, 16) ?? ""} onChange={(event) => update((current) => ({
              ...current,
              displaySettings: { ...current.displaySettings, announcement: { ...current.displaySettings.announcement, startsAt: event.target.value || undefined, updatedAt: new Date().toISOString() } }
            }))} /></label>
            <label><span>Expires (optional)</span><input type="datetime-local" value={notice.expiresAt?.slice(0, 16) ?? ""} onChange={(event) => update((current) => ({
              ...current,
              displaySettings: { ...current.displaySettings, announcement: { ...current.displaySettings.announcement, expiresAt: event.target.value || undefined, updatedAt: new Date().toISOString() } }
            }))} /></label>
          </div>
        </section>

        <div className={styles.publishBar}>
          <div><strong>Ready to update every platform?</strong><span>Publishing verifies the live TV endpoint before reporting success.</span></div>
          <button type="button" onClick={saveAndPublish}>{busy ? "Publishing…" : "Save & publish everywhere"}</button>
        </div>
      </fieldset>
    </main>
  );
}
