package ca.hbic.calgary.app.data

import org.json.JSONObject
import java.time.Instant

data class PrayerEntry(
  val key: String,
  val name: String,
  val adhan: String,
  val adhanInstant: Instant,
  val iqamah: String?,
  val iqamahInstant: Instant?
)

data class PrayerFocus(
  val prayerKey: String,
  val prayerName: String,
  val kind: String,
  val displayTime: String,
  val instant: Instant
)

data class PrayerSnapshot(
  val raw: String,
  val scheduleRevision: String,
  val generatedAt: Instant,
  val expiresAt: Instant,
  val availability: String,
  val sourceStale: Boolean,
  val entries: List<PrayerEntry>,
  val tomorrowFajr: Instant?
) {
  fun isExpired(now: Instant = Instant.now()) = !now.isBefore(expiresAt)

  fun focus(now: Instant = Instant.now()): PrayerFocus? {
    val congregational = entries.filter { it.key != "sunrise" }
    for (entry in congregational) {
      if (now.isBefore(entry.adhanInstant)) {
        return PrayerFocus(entry.key, entry.name, "Adhan", entry.adhan, entry.adhanInstant)
      }
      val iqamahInstant = entry.iqamahInstant
      val iqamah = entry.iqamah
      if (iqamahInstant != null && iqamah != null && now.isBefore(iqamahInstant)) {
        return PrayerFocus(entry.key, entry.name, "Iqamah", iqamah, iqamahInstant)
      }
    }
    val fajr = entries.firstOrNull { it.key == "fajr" }
    return if (tomorrowFajr != null && fajr != null && now.isBefore(tomorrowFajr)) {
      PrayerFocus("fajr", "Fajr", "Adhan", fajr.adhan, tomorrowFajr)
    } else null
  }

  companion object {
    fun parse(raw: String): PrayerSnapshot? = runCatching {
      val json = JSONObject(raw)
      require(json.getInt("schemaVersion") == 2)
      require(json.getString("masjidID") == "masjid-bilal-calgary")
      require(json.getString("masjidTimeZoneIdentifier") == "America/Edmonton")
      val prayers = json.getJSONArray("prayers")
      val entries = buildList {
        for (index in 0 until prayers.length()) {
          val prayer = prayers.getJSONObject(index)
          add(
            PrayerEntry(
              key = prayer.getString("key"),
              name = prayer.getString("name"),
              adhan = prayer.getString("adhan"),
              adhanInstant = Instant.parse(prayer.getString("adhanDate")),
              iqamah = prayer.optString("iqamah").takeIf(String::isNotBlank),
              iqamahInstant = prayer.optString("iqamahDate").takeIf(String::isNotBlank)?.let(Instant::parse)
            )
          )
        }
      }
      require(entries.isNotEmpty())
      PrayerSnapshot(
        raw = raw,
        scheduleRevision = json.getString("scheduleRevision"),
        generatedAt = Instant.parse(json.getString("generatedAt")),
        expiresAt = Instant.parse(json.getString("expiresAt")),
        availability = json.getString("availability"),
        sourceStale = json.optBoolean("stale", false),
        entries = entries,
        tomorrowFajr = json.optString("tomorrowFajrDate").takeIf(String::isNotBlank)?.let(Instant::parse)
      )
    }.getOrNull()
  }
}
