package ca.hbic.calgary.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.Image
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.gestures.scrollBy
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.material3.Text
import androidx.wear.compose.material3.Button
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import ca.hbic.calgary.app.data.PrayerRepository
import java.time.Duration
import java.time.Instant
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject

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
  var refreshing by remember { mutableStateOf(false) }
  val scope = rememberCoroutineScope()
  val lifecycle = LocalLifecycleOwner.current.lifecycle
  val listState = rememberLazyListState()
  val focusRequester = remember { FocusRequester() }

  fun refresh() {
    if (refreshing) return
    refreshing = true
    scope.launch {
      try { repository.refresh(); refreshKey++ }
      finally { refreshing = false }
    }
  }

  DisposableEffect(lifecycle) {
    val observer = LifecycleEventObserver { _, event ->
      if (event == Lifecycle.Event.ON_RESUME) { nowMillis = System.currentTimeMillis(); refresh() }
    }
    lifecycle.addObserver(observer)
    if (lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) refresh()
    onDispose { lifecycle.removeObserver(observer) }
  }

  LaunchedEffect(lifecycle) {
    focusRequester.requestFocus()
    lifecycle.repeatOnLifecycle(Lifecycle.State.RESUMED) {
      while (true) {
        nowMillis = System.currentTimeMillis()
        delay(1_000)
      }
    }
  }

  val now = Instant.ofEpochMilli(nowMillis)
  val snapshot = remember(refreshKey, nowMillis) { repository.cached() }
  val focus = snapshot?.focus(now)
  val stale = snapshot?.isExpired(now) != false || snapshot.sourceStale
  LaunchedEffect(nowMillis / 60_000) {
    if (snapshot?.isExpired(now) != false && lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) refresh()
  }
  val hijri = snapshot?.let { JSONObject(it.raw).optString("hijriDate") }.orEmpty()

  MaterialTheme {
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(
          Brush.radialGradient(
            listOf(Color(0xFF15536C), Color(0xFF062238), Color(0xFF031827))
          )
        ),
      contentAlignment = Alignment.Center
    ) {
      LazyColumn(
        modifier = Modifier.fillMaxSize().focusRequester(focusRequester)
          .onRotaryScrollEvent { event -> scope.launch { listState.scrollBy(event.verticalScrollPixels) }; true }
          .focusable(),
        state = listState,
        contentPadding = PaddingValues(horizontal = 30.dp, vertical = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp)
      ) {
        item {
          Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Image(painterResource(R.mipmap.ic_launcher_foreground), contentDescription = null, modifier = Modifier.size(28.dp))
            Column {
              Text("Masjid Bilal", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
              Text("Calgary", color = Color(0xFFACCCD5), fontSize = 10.sp)
            }
          }
        }
        item {
          Column(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF17495E), Color(0xFF0B2B40))))
            .border(1.dp, Color(0x35C8E7E8), RoundedCornerShape(24.dp)).padding(10.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(if (focus?.kind == "Iqamah") "NEXT IQAMAH" else "NEXT PRAYER", color = Color(0xFFA8D4D9), fontSize = 10.sp, fontWeight = FontWeight.Bold)
            Text(focus?.prayerName ?: "Prayer times", color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            Text(focus?.displayTime ?: "Unavailable", color = Color(0xFFF0D286), fontSize = 21.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            if (focus != null) {
              Text(formatCountdown(now, focus.instant), color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
              focus.iqamah?.let {
                Text("Iqamah $it", color = Color(0xFFC7E1E7), fontSize = 11.sp)
              }
            }
          }
        }
        if (hijri.isNotBlank()) item { Text(hijri, color = Color(0xFFF0D286), fontSize = 11.sp, textAlign = TextAlign.Center) }
        if (snapshot != null) {
          item { Text("Today's prayers", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold) }
          items(snapshot.entries, key = { it.key }) { prayer ->
            Row(modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(18.dp))
              .background(if (prayer.key == focus?.prayerKey) Color(0x382DC4CC) else Color(0x13FFFFFF)).padding(horizontal = 12.dp, vertical = 9.dp),
              horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
              Text(prayer.name, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
              Column(horizontalAlignment = Alignment.End) {
                Text(prayer.adhan, color = Color.White, fontSize = 12.sp)
                prayer.iqamah?.let { Text("Iqamah $it", color = Color(0xFFACCCD5), fontSize = 10.sp) }
              }
            }
          }
        }
        item { Text(if (stale) "Cached · refresh needed" else "Synced with HBIC", color = if (stale) Color(0xFFFFD27A) else Color(0xFFB3D8DB), fontSize = 10.sp, textAlign = TextAlign.Center) }
        item { Button(onClick = { refresh() }, enabled = !refreshing) { Text(if (refreshing) "Refreshing…" else "Refresh times") } }
        item { Spacer(Modifier.height(14.dp)) }
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
