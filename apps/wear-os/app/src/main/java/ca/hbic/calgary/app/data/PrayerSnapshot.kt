package ca.hbic.calgary.app.data

import org.json.JSONObject
import java.time.Instant
import java.time.LocalTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

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
  val instant: Instant,
  val iqamah: String? = null
)

data class PrayerSnapshot(
  val raw: String,
  val scheduleRevision: String,
  val generatedAt: Instant,
  val expiresAt: Instant,
  val availability: String,
  val sourceStale: Boolean,
  val entries: List<PrayerEntry>,
  val tomorrowFajr: Instant?,
  val tomorrowFajrIqamah: String? = null
) {
  fun isExpired(now: Instant = Instant.now()) = !now.isBefore(expiresAt)

  fun focus(now: Instant = Instant.now()): PrayerFocus? {
    val congregational = entries.filter { it.key != "sunrise" }
    for (entry in congregational) {
      if (now.isBefore(entry.adhanInstant)) {
        return PrayerFocus(entry.key, entry.name, "Adhan", entry.adhan, entry.adhanInstant, entry.iqamah)
      }
      val iqamahInstant = entry.iqamahInstant
      val iqamah = entry.iqamah
      if (iqamahInstant != null && iqamah != null && now.isBefore(iqamahInstant)) {
        return PrayerFocus(entry.key, entry.name, "Iqamah", iqamah, iqamahInstant, iqamah)
      }
    }
    val fajr = entries.firstOrNull { it.key == "fajr" }
    val nextFajr = tomorrowFajr ?: return null
    if (fajr == null) return null
    val zone = ZoneId.of("America/Edmonton")
    val formatter = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH)
    val iqamahInstant = tomorrowFajrIqamah?.let { time -> runCatching {
      nextFajr.atZone(zone).toLocalDate().atTime(LocalTime.parse(time, formatter)).atZone(zone).toInstant()
    }.getOrNull() }
    return when {
      now.isBefore(nextFajr) -> PrayerFocus("fajr", "Fajr", "Adhan", formatter.withZone(zone).format(nextFajr), nextFajr, tomorrowFajrIqamah)
      iqamahInstant != null && iqamahInstant.isAfter(nextFajr) && now.isBefore(iqamahInstant) -> PrayerFocus("fajr", "Fajr", "Iqamah", tomorrowFajrIqamah!!, iqamahInstant, tomorrowFajrIqamah)
      else -> null
    }
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
        tomorrowFajr = json.optString("tomorrowFajrDate").takeIf { it.isNotBlank() && it != "null" }?.let(Instant::parse),
        tomorrowFajrIqamah = json.optString("tomorrowFajrIqamah").takeIf { it.isNotBlank() && it != "null" }
      )
    }.getOrNull()
  }
}
