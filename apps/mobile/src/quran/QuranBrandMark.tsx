import { Image, View } from "react-native";

/** A static, small local asset: no animation, blur, network load or ASR startup.
 * Decorative beside the visible Quran heading, avoiding duplicate VoiceOver. */
export function QuranBrandMark({ size = 40 }: { size?: number }) {
  return <View accessible={false} style={{ width: size, height: size, flexShrink: 0, backgroundColor: "#FFF9EB", borderRadius: size * .25, padding: size * .06 }}>
    <Image accessible={false} source={require("../../assets/brand/hbic-quran-mark.png")} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
  </View>;
}
