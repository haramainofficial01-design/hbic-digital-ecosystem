import type { AcademyPublicFamily } from "@hbic/shared";

export function tuitionChildren(family: AcademyPublicFamily) {
  return family.children.filter(child => child.tuitionExempt !== true);
}

/** Operational tuition views exclude exemptions; the stored ledger remains intact. */
export function tuitionFamilies(families: AcademyPublicFamily[]) {
  return families.filter(family => family.enrollmentState !== "withdrawn" && !family.noTuitionDue && tuitionChildren(family).length > 0);
}

/** Exemption reporting only: original receipts and stored paid amounts stay unchanged. */
export function tuitionReportCents(family: AcademyPublicFamily) {
  if (family.noTuitionDue) return 0;
  const paid = family.amountCents ?? 0;
  return family.children.some(child => child.tuitionExempt === true)
    ? Math.min(paid, tuitionChildren(family).length * 5000)
    : paid;
}

export function tuitionPaidStudents(families: AcademyPublicFamily[], period: string) {
  return tuitionFamilies(families).filter(family => family.billingPeriod === period && family.paymentState === "paid")
    .reduce((count, family) => count + tuitionChildren(family).length, 0);
}

export function tuitionPaymentBreakdown(families: AcademyPublicFamily[], period: string) {
  const summary = { cash: { count: 0, cents: 0 }, card: { count: 0, cents: 0 } };
  for (const family of tuitionFamilies(families)) {
    if (family.billingPeriod !== period || family.paymentState !== "paid") continue;
    const method = family.billingMethod ?? family.paymentChoice;
    summary[method].count += 1;
    summary[method].cents += tuitionReportCents(family);
  }
  return summary;
}
