import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import type { ReturnTypeQuranAudio } from "./types";
import { QuranIconButton, QuranSurface } from "./QuranControls";
import { useAppTheme } from "../theme/ThemeProvider";
function time(seconds: number) { const n = Math.max(0, Math.floor(seconds || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; }
export function QuranMiniPlayer({ audio, reciter }: { audio: ReturnTypeQuranAudio; reciter: string }) {
  const { theme } = useAppTheme();
  const { playback, status, queue } = audio;
  if (playback.phase === "idle" && !audio.externalPlayback) return null;
  return <QuranSurface style={styles.player}>
    <View style={styles.top}>
      <Pressable accessibilityRole="button" accessibilityLabel="Expand audio player" onPress={() => audio.setExpanded(!audio.expanded)} style={styles.copy}><Text numberOfLines={2} style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700" }}>{audio.externalPlayback?.title ?? `Ayah ${playback.verse?.verseKey ?? "…"}`}</Text>
        <Text numberOfLines={2} style={{ color: theme.colors.muted, fontSize: 12, marginTop: 3 }}>{audio.externalPlayback?.subtitle ?? reciter}</Text></Pressable>
      {playback.phase === "loading" || status.isBuffering ? <ActivityIndicator color={theme.colors.teal} /> : null}
      {!audio.externalPlayback ? <QuranIconButton label="Previous ayah" icon="play-skip-back" onPress={() => void queue.previous()} /> : null}
      <QuranIconButton label={status.playing ? "Pause audio" : "Resume audio"} icon={status.playing ? "pause" : "play"} onPress={() => void audio.togglePause()} />
      {!audio.externalPlayback ? <QuranIconButton label="Next ayah" icon="play-skip-forward" onPress={() => void queue.next()} /> : null}
      <QuranIconButton label="Stop audio" icon="close" onPress={audio.stop} />
    </View>
    <View style={[styles.track, { backgroundColor: theme.colors.border }]}><View style={[styles.fill, { backgroundColor: theme.colors.teal,
      width: `${Math.min(100, status.duration > 0 ? status.currentTime / status.duration * 100 : 0)}%` }]} /></View>
    <View style={styles.top}><Text style={{ color: theme.colors.subtle, fontSize: 11 }}>{time(status.currentTime)} / {time(status.duration)}</Text>
      <Text style={{ color: theme.colors.subtle, fontSize: 11 }}>{playback.count > 1 ? `${playback.index + 1} of ${playback.count}` : ""}</Text></View>
    {playback.error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>{playback.error}</Text> : null}
    {audio.externalError ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>{audio.externalError}</Text> : null}
    {audio.expanded ? <View style={styles.top}>
      <QuranIconButton label="Back 15 seconds" icon="play-back-outline" onPress={() => void audio.seek(status.currentTime - 15)} />
      <QuranIconButton label={audio.externalPlayback ? "Replay recording" : "Replay this ayah"} icon="repeat" onPress={() => audio.externalPlayback ? void audio.seek(0) : void queue.replay()} />
      <QuranIconButton label="Forward 15 seconds" icon="play-forward-outline" onPress={() => void audio.seek(status.currentTime + 15)} />
      {[.75, 1, 1.25].map((rate) => <Pressable key={rate} accessibilityRole="button" accessibilityLabel={`Playback speed ${rate}`} onPress={() => audio.setSpeed(rate)} style={{ padding: 12, minHeight: 44 }}><Text style={{ color: status.playbackRate === rate ? theme.colors.teal : theme.colors.text, fontWeight: "700" }}>{rate}×</Text></Pressable>)}
    </View> : null}
  </QuranSurface>;
}
const styles = StyleSheet.create({
  player: { padding: 10, marginHorizontal: 14, marginBottom: 6, marginTop: 0 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  copy: { flex: 1, minWidth: 100, paddingLeft: 6 }, track: { height: 3, borderRadius: 3, marginVertical: 6, overflow: "hidden" }, fill: { height: 3 }
});
