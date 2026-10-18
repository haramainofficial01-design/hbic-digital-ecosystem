import { useEffect, useRef, type PropsWithChildren } from "react";
import { Animated, Easing, type StyleProp, type ViewStyle } from "react-native";

/** Finite, compositor-driven motion. No loop, frame callback or idle timer. */
export function BilalMotion({ children, style, reduced = true, phase = "enter", accessibilityViewIsModal }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>; reduced?: boolean; phase?: string | number; accessibilityViewIsModal?: boolean;
}>) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [phase, reduced, progress]);
  return <Animated.View accessibilityViewIsModal={accessibilityViewIsModal} style={[style, !reduced && {
    opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
  }]}>{children}</Animated.View>;
}
