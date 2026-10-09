import { notFound } from "next/navigation";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";
import { AcademyParent } from "../../components/AcademyParent";
import { InterfaceLanguage } from "../../components/InterfaceLanguage";

export const dynamic = "force-dynamic";
export function generateMetadata() {
  const publicLaunch = process.env.ACADEMY_PREVIEW_ENABLED === "true" && process.env.ACADEMY_STRIPE_BILLING_MODE === "live";
  return { title: "HBIC Quran Academy | Masjid Bilal", robots: { index: publicLaunch, follow: publicLaunch } };
}

export default async function AcademyPage() {
  if (process.env.ACADEMY_PREVIEW_ENABLED !== "true") notFound();
  const { content } = await getPublishedContent();
  return <SiteChrome settings={content.settings} contentVersion={content.version}><InterfaceLanguage /><AcademyParent /></SiteChrome>;
}
