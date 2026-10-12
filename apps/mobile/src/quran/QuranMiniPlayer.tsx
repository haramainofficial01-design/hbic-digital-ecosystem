import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../i18n/LocalizedText";
import type { ReturnTypeQuranAudio } from "./types";
import { QuranIconButton, QuranSurface } from "./QuranControls";
import { useAppTheme } from "../theme/ThemeProvider";
import { useAudioPlayerStatus } from "expo-audio";
import { adjacentQuranPlaybackSpeed } from "@hbic/shared";
import { isMacQuranHost } from "./macRuntime";
function time(seconds: number) { const n = Math.max(0, Math.floor(seconds || 0)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`; }
export function QuranMiniPlayer({ audio, reciter }: { audio: ReturnTypeQuranAudio; reciter: string }) {
  if (audio.playback.phase === "idle" && !audio.externalPlayback) return null;
  return <ActiveMiniPlayer audio={audio} reciter={reciter} />;
}
function ActiveMiniPlayer({ audio, reciter }: { audio: ReturnTypeQuranAudio; reciter: string }) {
  const { theme } = useAppTheme();
  const { playback } = audio;
  const status = useAudioPlayerStatus(audio.player);
  return <QuranSurface style={styles.player}>
    <View style={styles.top}>
      <Pressable accessibilityRole="button" accessibilityLabel="Expand audio player" onPress={() => audio.setExpanded(!audio.expanded)} style={styles.copy}><Text numberOfLines={2} style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700" }}>{audio.externalPlayback?.title ?? `Ayah ${playback.verse?.verseKey ?? "…"}`}</Text>
        <Text numberOfLines={2} style={{ color: theme.colors.muted, fontSize: 12, marginTop: 3 }}>{audio.externalPlayback?.subtitle ?? reciter}</Text></Pressable>
      {playback.phase === "loading" || status.isBuffering ? <ActivityIndicator color={theme.colors.teal} /> : null}
      {!audio.externalPlayback ? <QuranIconButton label="Previous ayah" icon="play-skip-back" onPress={() => void audio.navigate("previous")} /> : null}
      <QuranIconButton label={status.playing ? "Pause audio" : "Resume audio"} icon={status.playing ? "pause" : "play"} onPress={() => void audio.togglePause()} />
      {!audio.externalPlayback ? <QuranIconButton label="Next ayah" icon="play-skip-forward" onPress={() => void audio.navigate("next")} /> : null}
      <QuranIconButton label="Stop audio" icon="close" onPress={audio.stop} />
    </View>
    <View style={[styles.track, { backgroundColor: theme.colors.border }]}><View style={[styles.fill, { backgroundColor: theme.colors.teal,
      width: `${Math.min(100, status.duration > 0 ? status.currentTime / status.duration * 100 : 0)}%` }]} /></View>
    <View style={styles.top}><Text style={{ color: theme.colors.subtle, fontSize: 11 }}>{time(status.currentTime)} / {time(status.duration)}</Text>
      <Text style={{ color: theme.colors.subtle, fontSize: 11 }}>{playback.count > 1 ? `${playback.index + 1} of ${playback.count}` : ""}</Text></View>
    {playback.error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>{playback.error}</Text> : null}
    {audio.externalError ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: 13 }}>{audio.externalError}</Text> : null}
    <View style={styles.options}>
      <Pressable accessibilityRole="button" accessibilityLabel="Loop current recording" accessibilityState={{ selected: audio.loopCurrent }} onPress={() => audio.setLoopCurrent(!audio.loopCurrent)} onAccessibilityTap={isMacQuranHost ? () => audio.setLoopCurrent(!audio.loopCurrent) : undefined} style={[styles.loop, { backgroundColor: audio.loopCurrent ? theme.colors.tintSoft : theme.colors.cardStrong, borderColor: theme.colors.border }]}><Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: "700" }}>Loop {audio.loopCurrent ? "On" : "Off"}</Text></Pressable>
      <View style={styles.speed}><QuranIconButton label="Decrease playback speed" icon="remove" disabled={audio.speed <= .5} onPress={() => audio.setSpeed(adjacentQuranPlaybackSpeed(audio.speed, -1))} /><Text accessibilityLabel={`Playback speed ${audio.speed} times`} style={{ color: theme.colors.text, fontSize: 13, fontWeight: "700", minWidth: 38, textAlign: "center" }}>{audio.speed}×</Text><QuranIconButton label="Increase playback speed" icon="add" disabled={audio.speed >= 2} onPress={() => audio.setSpeed(adjacentQuranPlaybackSpeed(audio.speed, 1))} /></View>
    </View>
    {audio.expanded ? <View style={styles.top}>
      <QuranIconButton label="Back 15 seconds" icon="play-back-outline" onPress={() => void audio.seek(status.currentTime - 15)} />
      <QuranIconButton label={audio.externalPlayback ? "Replay recording" : "Replay this ayah"} icon="repeat" onPress={() => void audio.replayCurrent()} />
      <QuranIconButton label="Forward 15 seconds" icon="play-forward-outline" onPress={() => void audio.seek(status.currentTime + 15)} />
    </View> : null}
  </QuranSurface>;
}
const styles = StyleSheet.create({
  player: { padding: 10, marginHorizontal: 14, marginBottom: 6, marginTop: 0 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
  options: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginTop: 8 },
  loop: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" },
  speed: { flexDirection: "row", alignItems: "center" },
  copy: { flex: 1, minWidth: 100, paddingLeft: 6 }, track: { height: 3, borderRadius: 3, marginVertical: 6, overflow: "hidden" }, fill: { height: 3 }
});
