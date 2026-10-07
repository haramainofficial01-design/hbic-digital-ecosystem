package ca.hbic.calgary.wearbridge

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/** Uses canonical resolved absolute dates; never calculates adhan or iqamah. */
class HBICPrayerWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = refreshAll(context)

  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) = refreshAll(context)

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action !in setOf(AppWidgetManager.ACTION_APPWIDGET_UPDATE, AppWidgetManager.ACTION_APPWIDGET_OPTIONS_CHANGED,
        Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED, advanceAction, refreshAction)) return
    refreshAll(context)
    val manager = AppWidgetManager.getInstance(context)
    if (manager.getAppWidgetIds(ComponentName(context, HBICPrayerWidgetProvider::class.java)).isEmpty()) return
    val prefs = context.getSharedPreferences("hbic_prayer_widget", Context.MODE_PRIVATE)
    val elapsed = System.currentTimeMillis() - prefs.getLong("lastFetch", 0)
    // Prayer transitions advance from absolute cached dates. Resizing or
    // simultaneous launcher broadcasts need not fetch the same schedule again.
    if (intent.action != refreshAction && elapsed in 0 until 300_000) return
    if (!fetching.compareAndSet(false, true)) return
    val pending = goAsync()
    executor.execute {
      try {
        val connection = URL("https://hbic.ca/api/content/prayer-snapshot").openConnection() as HttpURLConnection
        try {
          connection.connectTimeout = 2500
          connection.readTimeout = 4000
          connection.setRequestProperty("Accept", "application/json")
          if (connection.responseCode == 200) {
            val response = connection.inputStream.bufferedReader().use { it.readText() }
            if (acceptSnapshot(context, JSONObject(response).getJSONObject("snapshot").toString())) {
              prefs.edit().putLong("lastFetch", System.currentTimeMillis()).apply()
            }
          }
        } finally { connection.disconnect() }
      } catch (_: Exception) { /* Offline: keep labeled canonical cache, never invent times. */ }
      finally { fetching.set(false); pending.finish() }
    }
  }

  override fun onDisabled(context: Context) {
    val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarm.cancel(advanceIntent(context))
  }

  companion object {
    private const val advanceAction = "ca.hbic.calgary.app.PRAYER_WIDGET_ADVANCE"
    private const val refreshAction = "ca.hbic.calgary.app.PRAYER_WIDGET_REFRESH"
    private val fetching = AtomicBoolean(false)
    private val executor = Executors.newSingleThreadExecutor()

    private fun instant(value: String): Long? = runCatching {
      val pattern = if (value.contains('.')) "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'" else "yyyy-MM-dd'T'HH:mm:ss'Z'"
      SimpleDateFormat(pattern, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC"); isLenient = false }.parse(value)?.time
    }.getOrNull()

    fun acceptSnapshot(context: Context, raw: String): Boolean {
      val value = runCatching { JSONObject(raw) }.getOrNull() ?: return false
      if (value.optInt("schemaVersion") != 2 || value.optString("masjidID") != "masjid-bilal-calgary" ||
          value.optString("masjidTimeZoneIdentifier") != "America/Edmonton" || value.optString("availability") != "available") return false
      val prefs = context.getSharedPreferences("hbic_prayer_widget", Context.MODE_PRIVATE)
      val previous = runCatching { JSONObject(prefs.getString("snapshot", "") ?: "") }.getOrNull()
      if ((instant(previous?.optString("generatedAt") ?: "") ?: 0) > (instant(value.optString("generatedAt")) ?: 0)) return false
      if (prefs.getString("snapshot", null) == raw) return true
      prefs.edit().putString("snapshot", raw).apply()
      refreshAll(context)
      return true
    }

    private data class Focus(val name: String, val kind: String, val time: String, val at: Long)

    private fun focus(snapshot: JSONObject?, now: Long): Focus? {
      if (snapshot == null) return null
      val events = mutableListOf<Focus>()
      val prayers = snapshot.optJSONArray("prayers") ?: return null
      for (index in 0 until prayers.length()) {
        val prayer = prayers.getJSONObject(index)
        if (prayer.optString("key") == "sunrise") continue
        instant(prayer.optString("adhanDate"))?.let { events.add(Focus(prayer.optString("name"), "Adhan", prayer.optString("adhan"), it)) }
        instant(prayer.optString("iqamahDate"))?.let { events.add(Focus(prayer.optString("name"), "Iqamah", prayer.optString("iqamah"), it)) }
      }
      for ((field, kind) in listOf("tomorrowFajrDate" to "Adhan", "tomorrowFajrIqamahDate" to "Iqamah")) {
        instant(snapshot.optString(field))?.let { at ->
          val zone = if (at >= 1793520000000L) "GMT-06:00" else "America/Edmonton"
          val display = SimpleDateFormat("h:mm a", Locale.CANADA).apply { timeZone = TimeZone.getTimeZone(zone) }.format(at)
          events.add(Focus("Fajr", kind, display, at))
        }
      }
      return events.filter { it.at > now }.minByOrNull { it.at }
    }

    private fun advanceIntent(context: Context) = PendingIntent.getBroadcast(context, 31071,
      Intent(context, HBICPrayerWidgetProvider::class.java).setAction(advanceAction), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, HBICPrayerWidgetProvider::class.java))
      if (ids.isEmpty()) return
      val now = System.currentTimeMillis()
      val snapshot = runCatching { JSONObject(context.getSharedPreferences("hbic_prayer_widget", Context.MODE_PRIVATE).getString("snapshot", "") ?: "") }.getOrNull()
      val next = focus(snapshot, now)
      for (id in ids) {
        val options = manager.getAppWidgetOptions(id)
        val compact = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 150) < 180
        val views = RemoteViews(context.packageName, R.layout.hbic_prayer_widget)
        views.setTextViewText(R.id.widget_next_prayer, next?.name ?: "Prayer times")
        views.setTextViewText(R.id.widget_time, next?.let { "${it.kind} ${it.time}" } ?: "Open the app to refresh")
        views.setTextViewText(R.id.widget_status, if (snapshot == null) "Connect to refresh" else if ((instant(snapshot.optString("expiresAt")) ?: 0) <= now || snapshot.optBoolean("stale")) "Cached schedule · tap to refresh" else "Calgary · live schedule")
        views.setViewVisibility(R.id.widget_status, if (compact) View.GONE else View.VISIBLE)
        views.setViewVisibility(R.id.widget_brand, if (compact && context.resources.configuration.fontScale > 1.3f) View.GONE else View.VISIBLE)
        views.setViewVisibility(R.id.widget_countdown, if (next == null) View.GONE else View.VISIBLE)
        views.setTextViewTextSize(R.id.widget_next_prayer, android.util.TypedValue.COMPLEX_UNIT_SP, if (compact) 20f else 24f)
        if (next != null) {
          views.setChronometer(R.id.widget_countdown, SystemClock.elapsedRealtime() + next.at - now, "%s remaining", true)
          views.setChronometerCountDown(R.id.widget_countdown, true)
        }
        context.packageManager.getLaunchIntentForPackage(context.packageName)?.let { launch ->
          views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        }
        views.setOnClickPendingIntent(R.id.widget_refresh, PendingIntent.getBroadcast(context, 31072,
          Intent(context, HBICPrayerWidgetProvider::class.java).setAction(refreshAction), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        manager.updateAppWidget(id, views)
      }
      if (next != null) {
        // No new exact-alarm permission. Android may defer background work in
        // power-saving modes; the native Chronometer itself ticks in the launcher.
        (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).set(AlarmManager.RTC_WAKEUP, next.at + 1000, advanceIntent(context))
      }
    }
  }
}
