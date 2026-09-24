"use client";

import { usePathname } from "next/navigation";

export function RouteContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="route-content" key={pathname}>{children}</div>;
}
