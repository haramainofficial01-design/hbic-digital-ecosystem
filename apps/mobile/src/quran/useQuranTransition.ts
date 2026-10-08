import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";
/** One short native animation per navigation, never a background/frame timer. */
export function useQuranTransition(key: string) {
  const progress = useRef(new Animated.Value(1)).current, previous = useRef(key);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    const changed = previous.current !== key; previous.current = key; progress.stopAnimation();
    if (reduced || !changed) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start(); return () => animation.stop();
  }, [key, reduced, progress]);
  return { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [.7, 1] }),
    transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [5, 0] }) }] };
}
