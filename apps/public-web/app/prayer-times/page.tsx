import { CopyButton } from "../../components/CopyButton";
import { PrayerTable } from "../../components/PrayerTable";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

const etransferEmail = "bilalislamiccentrecalgary@gmail.com";

export const revalidate = 300;

export default async function PrayerTimesPage() {
  const { content } = await getPublishedContent();
  const { eidSchedule, iqamahTime, jumuahSchedule, prayerTime, ramadanSchedule, settings } = content;

  return (
    <SiteChrome settings={settings}>
      <section className="section">
        <h2>Prayer Times</h2>
        <p>
          Prayer and iqamah times are linked to iqamah.ca and reviewed by HBIC before publishing.
          Please check this page regularly for the current masjid schedule.
        </p>
        <div className="grid">
          <PrayerTable prayerTime={prayerTime} iqamahTime={iqamahTime} />
          <div className="card gold">
            <span className="kicker">Jumu&apos;ah</span>
            <h3>{jumuahSchedule.firstKhutbahTime} and {jumuahSchedule.secondKhutbahTime}</h3>
            <p className="muted">{jumuahSchedule.notes}</p>
          </div>
          {settings.ramadanMode ? (
            <div className="card dark">
              <span className="kicker">Ramadan</span>
              <h3>Iftar {ramadanSchedule.iftar}</h3>
              <p className="muted">Suhoor ends {ramadanSchedule.suhoorEnd}. Taraweeh {ramadanSchedule.taraweeh}.</p>
            </div>
          ) : null}
          {settings.eidMode ? (
            <div className="card">
              <span className="kicker">Eid</span>
              <h3>{eidSchedule.eidName}</h3>
              <p className="muted">{eidSchedule.prayerTimes.join(" and ")} · {eidSchedule.location}</p>
            </div>
          ) : null}
          <div className="card dark">
            <span className="kicker">Support HBIC</span>
            <h3>Help support prayer services, programs, classes, and community work.</h3>
            <p className="muted">E-transfer: <a href={`mailto:${etransferEmail}`}>{etransferEmail}</a></p>
            <div className="actions">
              <a className="button primary" href={settings.donationUrl} target="_blank" rel="noreferrer">Donate by PayPal / Credit Card</a>
              <CopyButton text={etransferEmail} label="Copy E-transfer Email" />
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
