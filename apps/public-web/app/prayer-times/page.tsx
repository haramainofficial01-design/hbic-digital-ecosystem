import { CopyButton } from "../../components/CopyButton";
import { PrayerTable } from "../../components/PrayerTable";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";
import { getEffectiveJumuahDoorNotice } from "@hbic/shared";

const etransferEmail = "bilalislamiccentrecalgary@gmail.com";

export const revalidate = 300;

export default async function PrayerTimesPage() {
  const { content } = await getPublishedContent();
  const renderedAt = new Date().toISOString();
  const { eidSchedule, iqamahTime, jumuahSchedule, prayerTime, ramadanSchedule, settings } = content;
  const jumuahDoorNotice = getEffectiveJumuahDoorNotice(
    jumuahSchedule,
    new Date(),
    content.featureFlags.jumuahDoorNoticeEnabled
  );
  const jumuahSupportingNotices = Array.from(
    new Set(
      [jumuahDoorNotice?.parkingNotice, jumuahDoorNotice?.capacityNotice, jumuahSchedule.notes].filter(
        (notice): notice is string => Boolean(notice && notice !== jumuahDoorNotice?.body)
      )
    )
  );

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section prayer-page">
        <h2>Prayer Times</h2>
        <p>
          View today&apos;s prayer, iqamah, and Jumu&apos;ah times for Hazrat Bilal Islamic Centre.
        </p>
        <div className="grid">
          <PrayerTable
            prayerTime={prayerTime}
            iqamahTime={iqamahTime}
            hijriSettings={content.hijriSettings}
            showWhiteDays={content.featureFlags.whiteDaysEnabled}
            initialNow={renderedAt}
          />
          <div className="card gold prayer-side-card">
            <span className="kicker">Jumu&apos;ah</span>
            <h3>{jumuahSchedule.firstKhutbahTime} and {jumuahSchedule.secondKhutbahTime}</h3>
            {jumuahDoorNotice ? <p>{jumuahDoorNotice.body}</p> : null}
            {jumuahSupportingNotices.map((notice) => <p className="muted" key={notice}>{notice}</p>)}
          </div>
          <figure className="prayer-verse">
            <blockquote lang="ar" dir="rtl">
              إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَٰبًا مَّوْقُوتًا
            </blockquote>
            <figcaption>
              “Indeed, prayer has been decreed upon the believers at specified times.”
              <span>Qur’an 4:103</span>
            </figcaption>
          </figure>
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
          <div className="card dark prayer-support-card">
            <span className="kicker">Support Masjid Bilal</span>
            <h3>Help support prayer services, programs, classes, and community work.</h3>
            <p className="muted">E-transfer: <a className="inline-contact-link" href={`mailto:${etransferEmail}`}>{etransferEmail}</a></p>
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
