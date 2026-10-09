export const donationFunds = [
  { id: "general", title: "General Donation", description: "Support daily masjid operations and community services." },
  { id: "sadaqah", title: "Sadaqah", description: "Give charity for community benefit." },
  { id: "zakat", title: "Zakat", description: "Contribute to HBIC’s Zakat fund." },
  { id: "youth", title: "Youth Programs", description: "Support youth learning, activities and community service." },
  { id: "quran", title: "Quran Education", description: "Support Quran learning. Donations are separate from Academy tuition." },
  { id: "operations", title: "Masjid Operations", description: "Support utilities, supplies, cleaning and maintenance." },
  { id: "ramadan", title: "Ramadan", description: "Support iftar, Taraweeh and Ramadan programs." },
  { id: "maintenance", title: "Building / Maintenance", description: "Support the upkeep of the centre." }
] as const;
export type DonationFund = typeof donationFunds[number]["id"];
export function donationFund(id: unknown) { return donationFunds.find(fund => fund.id === id); }
export function donationAmountCents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{1,5}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [dollars, fraction = ""] = value.trim().split(".");
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents >= 100 && cents <= 1_000_000 ? cents : null;
}
export function donationUrl(fund: DonationFund = "general", amount?: number) {
  return `https://hbic.ca/donate?fund=${fund}${amount ? `&amount=${amount}` : ""}`;
}
