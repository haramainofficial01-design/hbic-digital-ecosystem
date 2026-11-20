import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Animated, StyleSheet, View } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { calculateQiblaBearing, isAlignedWithQibla, qiblaRotation } from "@hbic/shared";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

import { createSensorSession, shouldSuspendSensor } from "../src/services/sensorSession";

export default function QiblaScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const [bearing, setBearing] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [message, setMessage] = useState("Your location is used only while Qibla is open to calculate the direction.");
  const [busy, setBusy] = useState(false);
  const session = useRef(createSensorSession()).current;
  const visible = useRef(false);
  const requestingPermission = useRef(false);
  const hapticSent = useRef(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const aligned = bearing !== null && heading !== null && isAlignedWithQibla(bearing, heading);

  useEffect(() => {
    if (bearing === null) return;
    const animation = Animated.timing(rotation, { toValue: heading === null ? bearing : qiblaRotation(bearing, heading), duration: 250, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [bearing, heading, rotation]);

  useEffect(() => {
    if (aligned && !hapticSent.current) {
      hapticSent.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!aligned) hapticSent.current = false;
  }, [aligned]);

  useFocusEffect(useCallback(() => {
    visible.current = true;
    const state = AppState.addEventListener("change", value => {
      // iOS permission sheets briefly make the app inactive. A real
      // background transition still retires the pending request.
      if (shouldSuspendSensor(value, requestingPermission.current)) { session.stop(); setHeading(null); setBusy(false); }
    });
    return () => { visible.current = false; session.stop(); setBusy(false); setHeading(null); state.remove(); };
  }, [session]));

  async function start() {
    if (!visible.current || AppState.currentState !== "active") return;
    const token = session.begin();
    setBusy(true);
    try {
      requestingPermission.current = true;
      let permission: Location.LocationPermissionResponse;
      try { permission = await Location.requestForegroundPermissionsAsync(); }
      finally { requestingPermission.current = false; }
      if (!session.current(token)) return;
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setMessage("Location was not allowed. Use the Calgary fallback for a static bearing.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (!session.current(token)) return;
      setBearing(calculateQiblaBearing(location.coords));
      setAccuracy(location.coords.accuracy ?? null);
      setMessage("Hold your phone flat and rotate slowly until the marker points up.");
      const sensor = await Location.watchHeadingAsync((reading) => {
        if (!session.current(token)) return;
        if (reading.trueHeading >= 0) setHeading(reading.trueHeading);
        else {
          // A magnetic heading is not interchangeable with the true-north bearing.
          setHeading(null);
          setMessage("True-north compass is unavailable. Use the static bearing with another compass.");
        }
      });
      session.attach(token, sensor);
    } catch (error) { if (session.current(token)) setMessage(error instanceof Error ? error.message : "Qibla could not be started."); }
    finally { if (session.current(token)) setBusy(false); }
  }

  function calgary() {
    session.stop();
    setBusy(false);
    setHeading(null);
    setAccuracy(null);
    setBearing(calculateQiblaBearing({ latitude: 51.0447, longitude: -114.0719 }));
    setMessage("Showing Calgary’s static Qibla bearing. No location was requested.");
  }

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Qibla" subtitle="A private direction finder for wherever you are." />
      <GlassCard tone="navy" style={styles.card}>
        <View style={[styles.compass, { borderColor: aligned ? theme.colors.green : "rgba(255,255,255,.22)" }]} accessibilityLabel={aligned ? "Aligned with Qibla" : bearing === null ? "Qibla waiting for location" : `Qibla bearing ${bearing.toFixed(1)} degrees`}>
          <Text style={styles.north}>N</Text>
          <View style={styles.ring} />
          <Animated.View style={[styles.needle, { transform: [{ rotate: rotation.interpolate({ inputRange: [-360, 360], outputRange: ["-360deg", "360deg"] }) }] }]}>
            <View style={styles.marker}><Text style={styles.markerText}>◆</Text></View>
            <View style={styles.line} />
          </Animated.View>
          <View style={styles.center} />
          <Text style={[styles.readout, aligned && { color: theme.colors.green }]}>{aligned ? "Aligned" : bearing === null ? "Qibla" : `${bearing.toFixed(0)}°`}</Text>
        </View>
        <Text style={styles.message}>{message}</Text>
      </GlassCard>
      <View style={styles.actions}>
        <AppButton label={busy ? "Finding Qibla…" : "Use my location"} icon="locate" disabled={busy} onPress={start} style={styles.flex} />
        <AppButton label="Use Calgary" icon="map-outline" variant="secondary" onPress={calgary} style={styles.flex} />
      </View>
      {bearing !== null ? <GlassCard tone="teal">
        <Text style={[styles.detail, { color: theme.colors.text }]}>Qibla {bearing.toFixed(1)}° from true north</Text>
        <Text style={[styles.detailSub, { color: theme.colors.muted }]}>{heading === null ? "Static direction — compass unavailable" : `Device heading ${heading.toFixed(0)}°`}{accuracy !== null ? ` · Location accuracy ${Math.round(accuracy)} m` : ""}</Text>
      </GlassCard> : null}
      <Text style={[styles.privacy, { color: theme.colors.muted }]}>Calculation happens on your device. HBIC does not receive your precise location.</Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", paddingVertical: spacing.xl },
  compass: { width: 290, height: 290, maxWidth: "100%", borderRadius: 150, borderWidth: 1, backgroundColor: "rgba(255,255,255,.045)", alignItems: "center", justifyContent: "center" },
  north: { color: "rgba(255,255,255,.6)", fontSize: 12, fontWeight: "900", position: "absolute", top: 18 },
  ring: { position: "absolute", inset: 43, borderRadius: 120, borderWidth: 1, borderColor: "rgba(255,255,255,.12)" },
  needle: { position: "absolute", inset: 20, alignItems: "center" },
  marker: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: "#E7C66B", backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  markerText: { color: "#E7C66B", fontSize: 18 },
  line: { width: 2, height: 90, backgroundColor: "#E7C66B" },
  center: { width: 18, height: 18, borderRadius: 9, borderWidth: 5, borderColor: "#E7C66B", backgroundColor: "#062238" },
  readout: { position: "absolute", bottom: 52, color: "white", fontWeight: "900" },
  message: { color: "rgba(255,255,255,.72)", lineHeight: 21, textAlign: "center", marginTop: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  flex: { flex: 1 },
  detail: { fontSize: 18, fontWeight: "900" },
  detailSub: { marginTop: 6, lineHeight: 20 },
  privacy: { fontSize: 12, lineHeight: 19, paddingHorizontal: spacing.sm }
});
