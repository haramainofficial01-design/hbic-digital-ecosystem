import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masjid Bilal Admin",
  description: "Admin dashboard for Hazrat Bilal Islamic Centre prayer, iqamah, events, announcements, and notifications."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
