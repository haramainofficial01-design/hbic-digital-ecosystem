import Image from "next/image";

/** Independent Quran identity, not the Academy or main masjid/app icon. */
export function QuranBrandMark() {
  return <span style={{ display: "inline-flex", flexShrink: 0, width: "var(--quran-mark-size, 68px)", height: "var(--quran-mark-size, 68px)", padding: "4px", background: "#FFF9EB", borderRadius: "24%" }}>
    <Image src="/hbic-quran-mark.png" alt="" width={512} height={512} sizes="(max-width: 700px) 44px, 68px" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
  </span>;
}
