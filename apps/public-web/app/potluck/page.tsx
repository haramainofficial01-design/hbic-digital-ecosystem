import type { Metadata } from "next";
import { PotluckSignup } from "../../components/PotluckSignup";
export const metadata: Metadata = {
  title: "Class Party Potluck | HBIC Qur’an Academy",
  description: "Thursday, October 29 · 5:30–7:30 PM · 35–40 people. Add your name and what you’re bringing.",
  alternates: { canonical: "/potluck" }, robots: { index: false, follow: false },
  openGraph: { title: "Class Party Potluck · HBIC Qur’an Academy", description: "Thursday, October 29 · 5:30–7:30 PM · 35–40 people", url: "https://hbic.ca/potluck" }
};
export default function PotluckPage() { return <PotluckSignup />; }
