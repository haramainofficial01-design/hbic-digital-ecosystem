import { notFound } from "next/navigation";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedPageContent } from "../../lib/contentStore";
import { AcademyParent } from "../../components/AcademyParent";
import { InterfaceLanguage } from "../../components/InterfaceLanguage";
import { AcademyStars } from "../../components/AcademyStars";

// The shell contains public content only. Parent records are fetched separately
// by authenticated, no-store APIs after sign-in.
export const revalidate = 60;
export function generateMetadata() {
  const publicLaunch = process.env.ACADEMY_PREVIEW_ENABLED === "true" && process.env.ACADEMY_STRIPE_BILLING_MODE === "live";
  return { title: "HBIC Quran Academy | Masjid Bilal", robots: { index: publicLaunch, follow: publicLaunch } };
}

export default async function AcademyPage() {
  if (process.env.ACADEMY_PREVIEW_ENABLED !== "true") notFound();
  const { content } = await getPublishedPageContent();
  return <SiteChrome settings={content.settings} contentVersion={content.version}><InterfaceLanguage /><AcademyParent /><AcademyStars months={content.academyStars ?? []} registrationHref="#academy-account" /></SiteChrome>;
}
