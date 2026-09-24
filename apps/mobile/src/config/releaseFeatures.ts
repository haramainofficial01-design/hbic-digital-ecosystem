/** Explicit opt-in: the Quran reader stays hidden from production builds until provider access is approved and tested. */
export const quranEnabled = process.env.EXPO_PUBLIC_QURAN_ENABLED === "true";
