import { SiteChrome } from "../../components/SiteChrome";
import { AskMasjidForm } from "../../components/AskMasjidForm";
import { getPublishedContent } from "../../lib/contentStore";
import {
  getCurrentDailyBenefit,
  getEffectiveJumuahDoorNotice,
  getPublishedLocalServices,
  getPublishedNewMuslimResources,
  getPublicVolunteerOpportunities,
  getUpcomingWhiteDays,
  resolveHijriDate
} from "@hbic/shared";
import { notFound } from "next/navigation";

const contactSubject = encodeURIComponent("Masjid Bilal community inquiry");

export const revalidate = 300;

export default async function CommunityPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;
  if (!content.featureFlags.communityHubEnabled) notFound();
  const emailHref = `mailto:${settings.email}?subject=${contactSubject}`;
  const flags = content.featureFlags;
  const hijri = flags.hijriDateEnabled ? resolveHijriDate(new Date(), content.hijriSettings) : null;
  const upcomingWhiteDays = flags.whiteDaysEnabled
    ? getUpcomingWhiteDays(new Date(), content.hijriSettings)
    : [];
  const jumuahNotice = getEffectiveJumuahDoorNotice(content.jumuahSchedule, new Date(), flags.jumuahDoorNoticeEnabled);
  const newMuslimResources = getPublishedNewMuslimResources(content.newMuslimResources);
  const localServices = getPublishedLocalServices(content.localMuslimServices);
  const dailyBenefit = getCurrentDailyBenefit(content.dailyBenefits);
  const volunteerOpportunities = getPublicVolunteerOpportunities(content.volunteerOpportunities);

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section">
        <span className="kicker">Masjid Bilal community</span>
        <h2>Support, learning, and connection</h2>
        <p>Useful starting points for community life at Hazrat Bilal Islamic Centre. Contact the masjid for guidance, current opportunities, or a personal response.</p>
        <div className="grid">
          {hijri ? <article className="card dark">
            <span className="kicker">Hijri calendar</span>
            <h3>{hijri.label}</h3>
            <p className="muted">{flags.whiteDaysEnabled && hijri.isWhiteDay ? "A White Day. Fasting is voluntary." : "Today in the Hijri calendar."}</p>
          </article> : null}
          {upcomingWhiteDays.length ? <article className="card">
            <span className="kicker">Upcoming White Days</span>
            <h3>Voluntary fasting days</h3>
            <p className="muted">The 13th, 14th, and 15th of each Hijri month are voluntary fasting days.</p>
            <ul className="plain-list">
              {upcomingWhiteDays.map(({ gregorianDate, hijriDate }) => (
                <li key={gregorianDate}><strong>{hijriDate.label}</strong> · {gregorianDate}</li>
              ))}
            </ul>
          </article> : null}
          <article className="card" id="calendar">
            <span className="kicker">What&apos;s happening</span>
            <h3>Events and regular programs</h3>
            <p className="muted">See current classes, youth activities, halaqah series, and community gatherings.</p>
            <div className="actions"><a className="button secondary" href="/events">View events</a></div>
          </article>
          <article className="card gold" id="jumuah">
            <span className="kicker">Jumu&apos;ah information</span>
            <h3>{content.jumuahSchedule.firstKhutbahTime} and {content.jumuahSchedule.secondKhutbahTime}</h3>
            <p className="muted">{jumuahNotice?.body ?? content.jumuahSchedule.notes}</p>
            <div className="actions"><a className="button secondary" href="/prayer-times">View Jumu&apos;ah</a></div>
          </article>
          {flags.newMuslimResourcesEnabled && newMuslimResources.length ? <article className="card" id="new-muslims">
            <span className="kicker">New Muslim resources</span>
            <h3>A welcoming place to begin</h3>
            <ul className="plain-list">
              {newMuslimResources.map((resource) => (
                <li key={resource.id}><strong>{resource.title}</strong> · {resource.summary}</li>
              ))}
            </ul>
            <div className="actions"><a className="button primary" href={emailHref}>Contact the masjid</a></div>
          </article> : null}
          {flags.localServicesEnabled && localServices.length ? <article className="card">
            <span className="kicker">Local services</span>
            <h3>Community referrals</h3>
            <ul className="plain-list">
              {localServices.map((service) => (
                <li key={service.id}><strong>{service.title}</strong> · {service.summary}</li>
              ))}
            </ul>
            <div className="actions"><a className="button secondary" href="/contact">Contact details</a></div>
          </article> : null}
          {flags.volunteerEnabled && volunteerOpportunities.length ? <article className="card" id="volunteer">
            <span className="kicker">Volunteer</span>
            <h3>Help where it matters</h3>
            <ul className="plain-list">
              {volunteerOpportunities.map((opportunity) => (
                <li key={opportunity.id}><strong>{opportunity.title}</strong> · {opportunity.description}</li>
              ))}
            </ul>
            <div className="actions"><a className="button secondary" href={`mailto:${settings.email}?subject=${encodeURIComponent("Volunteer with Masjid Bilal")}`}>Volunteer interest</a></div>
          </article> : null}
          {flags.dailyBenefitEnabled && dailyBenefit ? <article className="card gold">
            <span className="kicker">Daily benefit</span>
            <h3>{dailyBenefit.title}</h3>
            <p className="muted">{dailyBenefit.body}</p>
            <p className="muted">Source: {dailyBenefit.source}</p>
            <div className="actions"><a className="button primary" href="/media">Open media</a></div>
          </article> : null}
          {flags.halalComingSoonEnabled ? <article className="card">
            <span className="kicker">Coming soon</span>
            <h3>Muslim-Owned Businesses</h3>
            <p className="muted">A carefully reviewed local directory of Muslim-owned businesses, with transparent halal-verification information where relevant, is being prepared.</p>
            <div className="actions"><a className="button primary" href="/halal-restaurants">Explore the preview</a></div>
          </article> : null}
        </div>
      </section>
      {flags.askMasjidEnabled && content.askMasjidSettings.enabled ? (
        <AskMasjidForm
          categories={content.askMasjidSettings.categories}
          privacyNotice={content.askMasjidSettings.privacyNotice}
        />
      ) : null}
    </SiteChrome>
  );
}
