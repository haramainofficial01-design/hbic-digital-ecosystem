import { SiteChrome } from "../../components/SiteChrome";
import { HalalDirectoryForms } from "../../components/HalalDirectoryForms";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";
import { getPublicHalalRestaurants } from "../../lib/halalStore";
import { notFound } from "next/navigation";

export const revalidate = 300;

export default async function HalalRestaurantsPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;
  if (!content.featureFlags.halalComingSoonEnabled) notFound();
  const restaurants = await getPublicHalalRestaurants(content.featureFlags.halalDirectoryListingsEnabled);

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section">
        <div className="card dark wide">
          <span className="kicker">Coming soon</span>
          <h2>Muslim-Owned Businesses</h2>
          <p>Calgary&apos;s trusted Muslim-owned business directory is coming soon.</p>
          <p>We are building a carefully reviewed directory of local Muslim-owned businesses, beginning with food and hospitality, with clear ownership and halal-verification information where relevant.</p>
          <div className="actions">
            <a className="button primary" href="#notify">Notify Me</a>
            <a className="button secondary" href="#restaurant-interest">Business Listing Interest</a>
            <a className="button secondary" href="#verification">Learn About Verification</a>
          </div>
        </div>
      </section>
      <section className="section" id="verification">
        <span className="kicker">Clear, careful review</span>
        <h2>Verification information people can understand</h2>
        <p>Listings will distinguish reviewed certificates, owner declarations, partial menus, pending reviews, and expired or suspended verification. Sponsorship can never determine halal status.</p>
        {restaurants.length ? (
          <div className="grid">
            {restaurants.map((restaurant) => (
              <article className="card" key={restaurant.id}>
                <span className="kicker">{restaurant.cuisine}</span>
                <h3>{restaurant.businessName}</h3>
                <p className="muted">{restaurant.description}</p>
                <p><strong>{restaurant.halalSummary}</strong></p>
                <p className="muted">{restaurant.address}, {restaurant.city}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="directory-empty-state">
            <strong>No business listings are published yet.</strong>
            <span>Only reviewed and approved records will appear here.</span>
          </div>
        )}
      </section>
      <section className="section">
        <HalalDirectoryForms restaurantFormEnabled={content.featureFlags.restaurantInterestFormEnabled} />
      </section>
    </SiteChrome>
  );
}
