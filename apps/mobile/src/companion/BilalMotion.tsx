import { useEffect, useRef, type PropsWithChildren } from "react";
import { Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Brief tactile feedback; only transforms run on the native compositor. */
export function BilalPressable({ reduced = true, style, children, ...props }: PropsWithChildren<Omit<PressableProps, "style" | "children"> & { reduced?: boolean; style?: StyleProp<ViewStyle> }>) {
  const scale = useRef(new Animated.Value(1)).current, animation = useRef<Animated.CompositeAnimation | null>(null);
  useEffect(() => { scale.setValue(1); return () => animation.current?.stop(); }, [reduced, scale]);
  const move = (pressed: boolean) => {
    animation.current?.stop();
    if (reduced) { scale.setValue(1); return; }
    animation.current = Animated.timing(scale, { toValue: pressed ? .97 : 1, duration: pressed ? 100 : 170, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.current.start();
  };
  return <AnimatedPressable {...props} onPressIn={event => { move(true); props.onPressIn?.(event); }} onPressOut={event => { move(false); props.onPressOut?.(event); }} style={[style, !reduced && { transform: [{ scale }] }]}>{children}</AnimatedPressable>;
}

/** Finite, compositor-driven motion. No loop, frame callback or idle timer. */
export function BilalMotion({ children, style, reduced = true, phase = "enter", accessibilityViewIsModal, testID }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>; reduced?: boolean; phase?: string | number; accessibilityViewIsModal?: boolean; testID?: string;
}>) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true, isInteraction: false });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [phase, reduced, progress]);
  return <Animated.View testID={testID} accessibilityViewIsModal={accessibilityViewIsModal} style={[style, !reduced && {
    opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
  }]}>{children}</Animated.View>;
}
