package ca.hbic.calgary.wearbridge

import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class MasjidWearBridgeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MasjidWearBridge")

    Function("updatePrayerSnapshot") { json: String ->
      val context = appContext.reactContext ?: return@Function false
      val snapshot = runCatching { JSONObject(json) }.getOrNull() ?: return@Function false
      if (snapshot.optInt("schemaVersion") != 2 ||
        snapshot.optString("masjidID") != "masjid-bilal-calgary" ||
        snapshot.optString("masjidTimeZoneIdentifier") != "America/Edmonton"
      ) return@Function false

      HBICPrayerWidgetProvider.acceptSnapshot(context, json)

      val request = PutDataMapRequest.create("/hbic/prayer-snapshot-v2").apply {
        dataMap.putString("snapshot", json)
        dataMap.putInt("schemaVersion", 2)
        dataMap.putString("scheduleRevision", snapshot.optString("scheduleRevision"))
        dataMap.putString("generatedAt", snapshot.optString("generatedAt"))
      }.asPutDataRequest().setUrgent()

      Wearable.getDataClient(context).putDataItem(request)
      true
    }
  }
}
