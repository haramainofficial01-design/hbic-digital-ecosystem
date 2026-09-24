/** Never expose the unfinished reader in production without explicit release enablement and provider access. */
export function isQuranPublicEnabled() {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.HBIC_QURAN_PUBLIC_ENABLED === "true"
    && process.env.QF_ENV === "production"
    && Boolean(process.env.QF_CLIENT_ID && process.env.QF_CLIENT_SECRET);
}
