import type { Metadata } from "next";
import { SiteChrome } from "../../components/SiteChrome";
import { QuranReader } from "../../components/QuranReader";
import { getPublishedContent } from "../../lib/contentStore";
import { isQuranPublicEnabled } from "../../lib/quranRelease";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quran & Qibla | Masjid Bilal",
  description: "Read and listen to verified Quran Foundation content and find the Qibla privately.",
  alternates: { canonical: "/quran" }
};

export default async function QuranPage() {
  if (!isQuranPublicEnabled()) redirect("/");
  const { content } = await getPublishedContent();
  return <SiteChrome settings={content.settings} contentVersion={content.version}><QuranReader /></SiteChrome>;
}
