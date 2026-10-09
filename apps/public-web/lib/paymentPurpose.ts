/** Reporting labels only; never calculate, create, or change a payment. */
export function academyPaymentPurpose(period: string, correction = false) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error("Invalid Academy billing period.");
  const date = new Date(`${period}-01T12:00:00Z`);
  const month = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  return `HBIC — Quran Academy ${correction ? "tuition correction" : "tuition"} · ${month}`;
}
