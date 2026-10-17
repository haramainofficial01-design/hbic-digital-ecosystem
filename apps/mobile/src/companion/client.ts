import { safeCompanionLink, type CompanionReply, type CompanionRequest } from "@hbic/shared";

const apiBase = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");

/** Public, read-only HBIC endpoint. No model provider, account token or disk storage. */
export async function askBilalCompanion(input: CompanionRequest, signal: AbortSignal): Promise<CompanionReply> {
  const response = await fetch(`${apiBase}/api/assistant`, {
    method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal,
    body: JSON.stringify(input)
  });
  const data = await response.json();
  if (!response.ok || !data?.ok || typeof data.answer !== "string" || !Array.isArray(data.sources) || !Number.isFinite(Date.parse(data.asOf))) {
    throw new Error(response.status === 429 ? "Please wait a moment before asking another question." : "I can’t verify the latest information right now. Please try again or contact the masjid.");
  }
  return { ...data, sources: data.sources.filter((source: { href?: unknown; title?: unknown; id?: unknown }) =>
    safeCompanionLink(source?.href) && typeof source?.title === "string" && typeof source?.id === "string") };
}
