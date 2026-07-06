import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hazrat Bilal Islamic Centre | HBIC Calgary",
  description: "Prayer times, iqamah, Jumu'ah, announcements, events, donations, and youth programs for HBIC Calgary."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
