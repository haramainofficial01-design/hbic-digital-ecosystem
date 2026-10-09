import type { MasjidSettings } from "./types";

export const hbicSettings: MasjidSettings = {
  masjidName: "Hazrat Bilal Islamic Centre",
  shortName: "Masjid Bilal",
  address: "20 Saddlestone Dr, Calgary, AB T3J 0B4, Canada",
  phone: "+1 587-917-0333",
  email: "info@hbic.ca",
  website: "https://hbic.ca/",
  donationUrl: "https://hbic.ca/donate",
  social: {
    youtube: "https://www.youtube.com/@hbicyouth",
    instagram: "https://www.instagram.com/hbicyouth/",
    tiktok: "https://www.tiktok.com/@bilalyouth"
  },
  location: {
    latitude: 51.12595,
    longitude: -113.94676
  },
  themeMode: "system",
  ramadanMode: false,
  eidMode: false,
  updatedAt: new Date().toISOString()
};

export const prayerOrder = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"] as const;

export const adminRoleLabels = {
  superAdmin: "Super Admin",
  director: "Director",
  caretaker: "Caretaker",
  editor: "Editor"
} as const;
