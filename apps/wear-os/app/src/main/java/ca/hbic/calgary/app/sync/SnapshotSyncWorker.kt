package ca.hbic.calgary.app.sync

import android.content.Context
import android.content.ComponentName
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import ca.hbic.calgary.app.complication.NextPrayerComplicationService
import ca.hbic.calgary.app.data.PrayerRepository
import ca.hbic.calgary.app.tile.NextPrayerTileService

class SnapshotSyncWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
  override suspend fun doWork(): Result {
    return if (PrayerRepository(applicationContext).refresh().isSuccess) {
      TileService.getUpdater(applicationContext).requestUpdate(NextPrayerTileService::class.java)
      ComplicationDataSourceUpdateRequester.create(
        applicationContext,
        ComponentName(applicationContext, NextPrayerComplicationService::class.java)
      ).requestUpdateAll()
      Result.success()
    } else {
      if (PrayerRepository(applicationContext).cached() != null) Result.success() else Result.retry()
    }
  }
}
