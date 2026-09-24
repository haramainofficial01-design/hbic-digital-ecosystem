package ca.hbic.calgary.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import ca.hbic.calgary.app.data.PrayerRepository
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent { MasjidBilalWearApp() }
  }
}

@Composable
private fun MasjidBilalWearApp() {
  val context = androidx.compose.ui.platform.LocalContext.current
  val repository = remember { PrayerRepository(context.applicationContext) }
  var nowMillis by remember { mutableLongStateOf(System.currentTimeMillis()) }
  var refreshKey by remember { mutableLongStateOf(0L) }

  LaunchedEffect(Unit) {
    repository.refresh()
    refreshKey++
    while (true) {
      delay(1_000)
      nowMillis = System.currentTimeMillis()
    }
  }

  val now = Instant.ofEpochMilli(nowMillis)
  val snapshot = remember(refreshKey, nowMillis) { repository.cached() }
  val focus = snapshot?.focus(now)
  val stale = snapshot?.isExpired(now) != false || snapshot.sourceStale

  MaterialTheme {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(
          Brush.radialGradient(
            listOf(Color(0xFF15536C), Color(0xFF062238), Color(0xFF031827))
          )
        )
        .padding(horizontal = 22.dp, vertical = 18.dp),
      contentAlignment = Alignment.Center
    ) {
      Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
      ) {
        Text("MASJID BILAL", color = Color(0xFFE7C66B), fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(7.dp))
        if (focus == null) {
          Text("Prayer times unavailable", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
          Spacer(Modifier.height(6.dp))
          Text(repository.status(now), color = Color(0xFFCAD8DF), fontSize = 12.sp, textAlign = TextAlign.Center)
        } else {
          Text(
            if (focus.kind == "Iqamah") "IQAMAH NEXT" else "NEXT PRAYER",
            color = Color(0xFFCAD8DF),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
          )
          Text(focus.prayerName, color = Color.White, fontSize = 31.sp, fontWeight = FontWeight.Bold)
          Text(focus.displayTime, color = Color(0xFFE7C66B), fontSize = 25.sp, fontWeight = FontWeight.Bold)
          Text(formatCountdown(now, focus.instant), color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
          Spacer(Modifier.height(9.dp))
          Row(
            modifier = Modifier
              .background(Color(0x26FFFFFF), RoundedCornerShape(18.dp))
              .padding(horizontal = 11.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(
              if (stale) "Cached · refresh needed" else repository.status(now),
              color = if (stale) Color(0xFFFFD27A) else Color(0xFFC8E7E8),
              fontSize = 10.sp,
              textAlign = TextAlign.Center
            )
          }
        }
      }
    }
  }
}

private fun formatCountdown(now: Instant, target: Instant): String {
  val seconds = Duration.between(now, target).seconds.coerceAtLeast(0)
  if (seconds < 60) return "<1m"
  val minutes = seconds / 60
  val hours = minutes / 60
  return if (hours > 0) "${hours}h ${minutes % 60}m" else "${minutes}m"
}
