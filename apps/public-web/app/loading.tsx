import Image from "next/image";

export default function Loading() {
  return (
    <div className="route-fallback-loader" role="status" aria-label="Loading Masjid Bilal">
      <div className="site-loader-mark">
        <Image src="/brand/hbic-logo.png" alt="" width={58} height={58} />
      </div>
    </div>
  );
}
