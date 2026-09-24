package ca.hbic.calgary.app.data

import java.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class PrayerSnapshotTest {
  private val fixture = """
    {
      "schemaVersion":2,
      "masjidID":"masjid-bilal-calgary",
      "masjidTimeZoneIdentifier":"America/Edmonton",
      "scheduleRevision":"fixture",
      "generatedAt":"2026-07-09T18:00:00Z",
      "expiresAt":"2026-07-10T06:00:00Z",
      "availability":"available",
      "stale":false,
      "tomorrowFajrDate":"2026-07-10T10:02:00Z",
      "prayers":[
        {"key":"fajr","name":"Fajr","adhan":"4:02 AM","adhanDate":"2026-07-09T10:02:00Z","iqamah":"5:00 AM","iqamahDate":"2026-07-09T11:00:00Z"},
        {"key":"dhuhr","name":"Dhuhr","adhan":"1:32 PM","adhanDate":"2026-07-09T19:32:00Z","iqamah":"2:00 PM","iqamahDate":"2026-07-09T20:00:00Z"},
        {"key":"asr","name":"Asr","adhan":"6:01 PM","adhanDate":"2026-07-10T00:01:00Z","iqamah":"6:30 PM","iqamahDate":"2026-07-10T00:30:00Z"},
        {"key":"maghrib","name":"Maghrib","adhan":"9:41 PM","adhanDate":"2026-07-10T03:41:00Z","iqamah":"9:51 PM","iqamahDate":"2026-07-10T03:51:00Z"},
        {"key":"isha","name":"Isha","adhan":"11:20 PM","adhanDate":"2026-07-10T05:20:00Z","iqamah":"11:30 PM","iqamahDate":"2026-07-10T05:30:00Z"}
      ]
    }
  """.trimIndent()

  @Test fun promotesIqamahAfterAdhan() {
    val snapshot = PrayerSnapshot.parse(fixture)
    assertNotNull(snapshot)
    val focus = snapshot!!.focus(Instant.parse("2026-07-09T19:45:00Z"))
    assertEquals("dhuhr", focus?.prayerKey)
    assertEquals("Iqamah", focus?.kind)
    assertEquals("2:00 PM", focus?.displayTime)
  }

  @Test fun advancesAfterIqamah() {
    val focus = PrayerSnapshot.parse(fixture)!!.focus(Instant.parse("2026-07-09T20:00:00Z"))
    assertEquals("asr", focus?.prayerKey)
    assertEquals("Adhan", focus?.kind)
  }
}
