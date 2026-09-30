/** Explicit opt-in: the Quran reader stays hidden from production builds until provider access is approved and tested. */
export const quranEnabled = process.env.EXPO_PUBLIC_QURAN_ENABLED === "true";
/** Keep the reader hidden until content integrity and production credentials pass release QA. */
export const quranReaderAvailable = quranEnabled && process.env.EXPO_PUBLIC_QURAN_PRODUCTION_READY === "true";
/** The Academy is a production surface; server-side registration and billing readiness are checked separately. */
export const academyEnabled = process.env.EXPO_PUBLIC_ACADEMY_ENABLED === "true";
