package ca.hbic.calgary.app.complication

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationText
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import ca.hbic.calgary.app.data.PrayerRepository
import java.time.Instant

class NextPrayerComplicationService : SuspendingComplicationDataSourceService() {
  override fun getPreviewData(type: ComplicationType): ComplicationData? = dataFor(type, "Asr", "5:03 PM", "Next prayer")

  override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData {
    val now = Instant.now()
    val snapshot = PrayerRepository(this).cached()
    val focus = snapshot?.focus(now) ?: return NoDataComplicationData()
    val status = when {
      snapshot.isExpired(now) -> "Cached · refresh"
      snapshot.sourceStale -> "Cached schedule"
      focus.kind == "Iqamah" -> "Iqamah next"
      else -> "Next prayer"
    }
    return dataFor(request.complicationType, focus.prayerName, focus.displayTime, status)
  }

  private fun dataFor(type: ComplicationType, prayer: String, time: String, status: String): ComplicationData {
    val contentDescription: ComplicationText = PlainComplicationText.Builder("$prayer $time, $status").build()
    return when (type) {
      ComplicationType.LONG_TEXT -> LongTextComplicationData.Builder(
        PlainComplicationText.Builder("$prayer · $time").build(),
        contentDescription
      ).setTitle(PlainComplicationText.Builder(status).build()).build()
      else -> ShortTextComplicationData.Builder(
        PlainComplicationText.Builder(time).build(),
        contentDescription
      ).setTitle(PlainComplicationText.Builder(prayer).build()).build()
    }
  }
}
