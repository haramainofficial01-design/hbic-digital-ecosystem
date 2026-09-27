/** Explicit opt-in: the Quran reader stays hidden from production builds until provider access is approved and tested. */
export const quranEnabled = process.env.EXPO_PUBLIC_QURAN_ENABLED === "true";
/** Academy is preview-only until payments, Wallet credentials, and child-data QA are approved. */
export const academyEnabled = process.env.EXPO_PUBLIC_ACADEMY_PREVIEW_ENABLED === "true";
