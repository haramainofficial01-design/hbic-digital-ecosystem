import "./globals.css";
import "@fontsource/aref-ruqaa/700.css";
import "@fontsource/noto-naskh-arabic/700.css";
import type { Metadata } from "next";
import { SiteExperience } from "../components/SiteExperience";

export const metadata: Metadata = {
  metadataBase: new URL("https://hbic.ca"),
  title: "Hazrat Bilal Islamic Centre | Masjid Bilal",
  description: "Prayer times, iqamah, Jumu'ah, announcements, events, donations, and youth programs from Masjid Bilal in Calgary.",
  icons: {
    icon: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png"
  },
  alternates: { canonical: "/" },
  openGraph: {
    url: "https://hbic.ca",
    siteName: "Hazrat Bilal Islamic Centre",
    title: "Hazrat Bilal Islamic Centre | Masjid Bilal",
    description: "Prayer times, iqamah, Jumu'ah, announcements, events, donations, and youth programs from Masjid Bilal in Calgary.",
    images: [
      {
        url: "/brand/hbic-social-preview-v3.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Hazrat Bilal Islamic Centre logo"
      }
    ],
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Hazrat Bilal Islamic Centre | Masjid Bilal",
    description: "Prayer times, iqamah, Jumu'ah, announcements, events, donations, and youth programs from Masjid Bilal in Calgary.",
    images: ["/brand/hbic-social-preview-v3.jpg"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteExperience />
        {children}
      </body>
    </html>
  );
}
