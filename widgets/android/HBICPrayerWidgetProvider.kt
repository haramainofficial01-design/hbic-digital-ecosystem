package ca.hbic.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

class HBICPrayerWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { widgetId ->
            val snapshot = loadSnapshot(context)
            val views = RemoteViews(context.packageName, R.layout.hbic_prayer_widget)

            views.setTextViewText(R.id.widget_masjid_name, snapshot.masjidName)
            views.setTextViewText(R.id.widget_next_prayer, snapshot.nextPrayer)
            views.setTextViewText(R.id.widget_adhan_time, "Adhan ${snapshot.nextPrayerTime}")
            views.setTextViewText(R.id.widget_iqamah_time, snapshot.nextIqamah?.let { "Iqamah $it" } ?: "Iqamah unavailable")
            views.setTextViewText(R.id.widget_countdown, snapshot.countdown)
            views.setTextViewText(R.id.widget_jumuah, "Jumu'ah ${snapshot.jumuah}")

            appWidgetManager.updateAppWidget(widgetId, views)
        }
    }

    private fun loadSnapshot(context: Context): PrayerSnapshot {
        val prefs = context.getSharedPreferences("hbic_widget", Context.MODE_PRIVATE)
        val json = prefs.getString("widget_prayer_snapshot", null) ?: return PrayerSnapshot.fallback
        return try {
            val payload = JSONObject(json)
            PrayerSnapshot(
                masjidName = payload.optString("masjidName", "Masjid Bilal"),
                nextPrayer = payload.optString("nextPrayer", "Prayer times"),
                nextPrayerTime = payload.optString("nextPrayerTime", "Unavailable"),
                nextIqamah = payload.optString("nextIqamah").ifBlank { null },
                countdown = payload.optString("countdown", "Open app"),
                jumuah = payload.optString("jumuah", "1:45 PM / 2:30 PM")
            )
        } catch (_: Exception) {
            PrayerSnapshot.fallback
        }
    }
}

data class PrayerSnapshot(
    val masjidName: String,
    val nextPrayer: String,
    val nextPrayerTime: String,
    val nextIqamah: String?,
    val countdown: String,
    val jumuah: String
) {
    companion object {
        val fallback = PrayerSnapshot(
            masjidName = "Masjid Bilal",
            nextPrayer = "Prayer times",
            nextPrayerTime = "Unavailable",
            nextIqamah = null,
            countdown = "Open app",
            jumuah = "1:45 PM / 2:30 PM"
        )
    }
}
