package ca.hbic.calgary.app.data

import android.content.Context
import java.net.HttpURLConnection
import java.net.URL
import java.time.Instant
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class PrayerRepository(private val context: Context) {
  private val preferences = context.getSharedPreferences("hbic_prayer_snapshot", Context.MODE_PRIVATE)

  fun cached(): PrayerSnapshot? = preferences.getString("snapshot", null)?.let(PrayerSnapshot::parse)

  fun accept(raw: String): Boolean {
    val incoming = PrayerSnapshot.parse(raw) ?: return false
    if (incoming.availability != "available") return false
    val current = cached()
    if (current != null && incoming.generatedAt.isBefore(current.generatedAt)) return false
    preferences.edit().putString("snapshot", raw).apply()
    return true
  }

  suspend fun refresh(): Result<PrayerSnapshot> = withContext(Dispatchers.IO) {
    runCatching {
      val connection = (URL("https://hbic.ca/api/content/prayer-snapshot").openConnection() as HttpURLConnection).apply {
        connectTimeout = 8_000
        readTimeout = 8_000
        requestMethod = "GET"
        setRequestProperty("Accept", "application/json")
      }
      try {
        require(connection.responseCode in 200..299)
        val response = connection.inputStream.bufferedReader().use { it.readText() }
        val raw = JSONObject(response).getJSONObject("snapshot").toString()
        require(accept(raw))
        requireNotNull(cached())
      } finally {
        connection.disconnect()
      }
    }
  }

  fun status(now: Instant = Instant.now()): String {
    val snapshot = cached() ?: return "Open the phone app or connect to Wi-Fi"
    return when {
      snapshot.isExpired(now) -> "Schedule expired · refresh needed"
      snapshot.sourceStale -> "Cached schedule"
      else -> "Updated from Masjid Bilal"
    }
  }
}
