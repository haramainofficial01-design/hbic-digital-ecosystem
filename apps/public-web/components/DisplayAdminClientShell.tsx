"use client";

import dynamic from "next/dynamic";

const DisplayAdmin = dynamic(
  () => import("./DisplayAdmin").then((module) => module.DisplayAdmin),
  { ssr: false }
);

export function DisplayAdminClientShell() {
  return <DisplayAdmin />;
}
