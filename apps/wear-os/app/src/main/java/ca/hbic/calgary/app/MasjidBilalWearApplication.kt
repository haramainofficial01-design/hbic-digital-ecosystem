package ca.hbic.calgary.app

import android.app.Application
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import ca.hbic.calgary.app.sync.SnapshotSyncWorker
import java.util.concurrent.TimeUnit

class MasjidBilalWearApplication : Application() {
  override fun onCreate() {
    super.onCreate()
    val request = PeriodicWorkRequestBuilder<SnapshotSyncWorker>(15, TimeUnit.MINUTES)
      .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
      .build()
    WorkManager.getInstance(this).enqueueUniquePeriodicWork(
      "hbic-prayer-snapshot",
      ExistingPeriodicWorkPolicy.UPDATE,
      request
    )
  }
}
