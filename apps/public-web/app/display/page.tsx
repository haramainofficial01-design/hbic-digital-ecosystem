import type { Metadata } from "next";
import { createWidgetPrayerSnapshot, toPublicContent } from "@hbic/shared";
import { TvPrayerDisplay } from "../../components/TvPrayerDisplay";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";
import type { TvDisplayPayload } from "../../lib/tvDisplay";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Prayer Display | Masjid Bilal",
  description: "Live prayer and iqamah times for Masjid Bilal in Calgary.",
  alternates: { canonical: "/display" },
  robots: { index: false, follow: false }
};

export default async function DisplayPage() {
  const { content } = await getPublishedContent();
  const publicContent = toPublicContent(content);
  const initialPayload: TvDisplayPayload = {
    ok: true,
    contentVersion: content.version,
    snapshot: createWidgetPrayerSnapshot(content),
    display: {
      ...publicContent.displaySettings,
      social: publicContent.settings.social,
      contact: {
        address: publicContent.settings.address,
        phone: publicContent.settings.phone
      }
    }
  };

  return <TvPrayerDisplay initialPayload={initialPayload} />;
}
