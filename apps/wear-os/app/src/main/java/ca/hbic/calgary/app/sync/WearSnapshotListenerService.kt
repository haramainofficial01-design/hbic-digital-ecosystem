package ca.hbic.calgary.app.sync

import android.content.ComponentName
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import ca.hbic.calgary.app.complication.NextPrayerComplicationService
import ca.hbic.calgary.app.data.PrayerRepository
import ca.hbic.calgary.app.tile.NextPrayerTileService
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.WearableListenerService

class WearSnapshotListenerService : WearableListenerService() {
  override fun onDataChanged(events: DataEventBuffer) {
    var changed = false
    events.forEach { event ->
      if (event.type == DataEvent.TYPE_CHANGED && event.dataItem.uri.path == "/hbic/prayer-snapshot-v2") {
        val raw = com.google.android.gms.wearable.DataMapItem.fromDataItem(event.dataItem).dataMap.getString("snapshot")
        if (raw != null && PrayerRepository(this).accept(raw)) changed = true
      }
    }
    if (changed) {
      TileService.getUpdater(this).requestUpdate(NextPrayerTileService::class.java)
      ComplicationDataSourceUpdateRequester.create(
        this,
        ComponentName(this, NextPrayerComplicationService::class.java)
      ).requestUpdateAll()
    }
  }
}
