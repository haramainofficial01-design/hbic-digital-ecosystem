import type { Metadata } from "next";
import { DisplayAdminClientShell } from "../../components/DisplayAdminClientShell";

export const metadata: Metadata = {
  title: "Prayer Display Admin | Masjid Bilal",
  description: "Protected Masjid Bilal prayer display publishing controls.",
  robots: { index: false, follow: false }
};

export default function DisplayAdminPage() {
  return <DisplayAdminClientShell />;
}
