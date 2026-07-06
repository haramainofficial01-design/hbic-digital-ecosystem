import { defaultContent, getIqamahForPrayer, prayerLabels, prayerOrder, type IqamahTime, type PrayerTime } from "@hbic/shared";

export function PrayerTable({
  prayerTime = defaultContent.prayerTime,
  iqamahTime = defaultContent.iqamahTime
}: {
  prayerTime?: PrayerTime;
  iqamahTime?: IqamahTime;
}) {
  return (
    <div className="card wide">
      <span className="kicker">Today</span>
      <h3>Prayer and iqamah</h3>
      <p className="muted">
        Prayer times are linked to <a href={prayerTime.sourceUrl} target="_blank" rel="noreferrer">{prayerTime.source}</a> and reviewed by HBIC before publishing.
      </p>
      {prayerOrder.map((name) => (
        <div className="prayer-row" key={name}>
          <strong>{prayerLabels[name]}</strong>
          <span>{prayerTime[name]}</span>
          <strong>{getIqamahForPrayer(name, iqamahTime) ?? "No iqamah"}</strong>
        </div>
      ))}
      <p className="muted">
        Iqamah times are maintained by HBIC and may be updated when the masjid schedule changes.
      </p>
    </div>
  );
}
