import Image from "next/image";
import styles from "./AppShowcase.module.css";

const screens = {
  home: { src: "/app/masjid-bilal-home.webp", width: 560, height: 1218, alt: "Masjid Bilal app home with the masjid and next prayer" },
  prayer: { src: "/app/masjid-bilal-prayer.webp", width: 560, height: 996, alt: "Prayer and Iqamah screen showing the next prayer and daily schedule" },
  mushaf: { src: "/app/masjid-bilal-mushaf.webp", width: 1440, height: 1013, alt: "Two facing pages of Surah Al-Baqarah in the Madinah Mushaf on iPhone Duo" },
  events: { src: "/app/masjid-bilal-events.webp", width: 560, height: 1218, alt: "Events and Programs screen showing the Qur’an Academy" }
};

export function AppShowcaseIcon() {
  return <Image className={styles.appIcon} src="/app/masjid-bilal-icon.webp" alt="" width={160} height={160} unoptimized />;
}

export function AppShowcaseImage({ screen, priority = false }: { screen: keyof typeof screens; priority?: boolean }) {
  return <Image {...screens[screen]} priority={priority} unoptimized />;
}

export function AppShowcaseScreens({ priority = false }: { priority?: boolean }) {
  return (
    <div className={styles.screens}>
      <div className={styles.homeScreen}><AppShowcaseImage screen="home" priority={priority} /></div>
      <div className={styles.prayerScreen}><AppShowcaseImage screen="prayer" /></div>
    </div>
  );
}
