package ca.hbic.calgary.app.tile

import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.protolayout.material.Colors
import androidx.wear.protolayout.material.layouts.PrimaryLayout
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import ca.hbic.calgary.app.data.PrayerRepository
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import java.time.Duration
import java.time.Instant

class NextPrayerTileService : TileService() {
  override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
    val now = Instant.now()
    val repository = PrayerRepository(this)
    val snapshot = repository.cached()
    val focus = snapshot?.focus(now)
    val title = if (focus == null) "Prayer times unavailable" else if (focus.kind == "Iqamah") "${focus.prayerName} iqamah" else focus.prayerName
    val time = focus?.displayTime ?: "Open app"
    val countdown = focus?.let {
      val minutes = Duration.between(now, it.instant).toMinutes().coerceAtLeast(0)
      if (minutes >= 60) "${minutes / 60}h ${minutes % 60}m" else "${minutes}m"
    } ?: repository.status(now)
    val stale = snapshot?.isExpired(now) != false || snapshot.sourceStale

    val safeWidth = (requestParams.deviceConfiguration.screenWidthDp - 40f).coerceIn(120f, 180f)
    val main = LayoutElementBuilders.Column.Builder()
      .setWidth(dp(safeWidth))
      .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
      .addContent(text("MASJID BILAL", 12f, 0xFFE7C66B.toInt()))
      .addContent(spacer(8f))
      .addContent(text(title, 22f, 0xFFFFFFFF.toInt()))
      .addContent(text(time, 26f, 0xFFE7C66B.toInt()))
      .addContent(text(countdown, 14f, 0xFFFFFFFF.toInt()))
      .addContent(spacer(7f))
      .addContent(text(if (stale) "Cached · refresh needed" else "Synced with HBIC", 10f, if (stale) 0xFFFFD27A.toInt() else 0xFFC8E7E8.toInt()))
      .build()

    val layout = PrimaryLayout.Builder(requestParams.deviceConfiguration)
      .setResponsiveContentInsetEnabled(true)
      .setContent(main)
      .build()

    return Futures.immediateFuture(
      TileBuilders.Tile.Builder()
        .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout))
        .setFreshnessIntervalMillis(60_000)
        .build()
    )
  }

  private fun text(value: String, size: Float, color: Int) = LayoutElementBuilders.Text.Builder()
    .setText(value)
    .setMaxLines(1)
    .setOverflow(LayoutElementBuilders.TEXT_OVERFLOW_ELLIPSIZE_END)
    .setFontStyle(
      LayoutElementBuilders.FontStyle.Builder()
        .setSize(sp(size))
        .setColor(argb(color))
        .build()
    )
    .build()

  private fun spacer(height: Float) = LayoutElementBuilders.Spacer.Builder().setHeight(dp(height)).build()
}
