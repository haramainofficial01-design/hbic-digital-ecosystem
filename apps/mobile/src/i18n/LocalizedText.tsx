import { Children, forwardRef } from "react";
import { Text as NativeText, TextInput as NativeTextInput, Image as NativeImage, Alert as NativeAlert, type TextProps, type TextInputProps, type ImageProps } from "react-native";
import { translateUi } from "@hbic/shared";
import { getDialogLanguage } from "./dialogLanguage";
import { useAppLanguage } from "./LanguageProvider";

export const Text = forwardRef<NativeText, TextProps>(function LocalizedText({ children, style, accessibilityLabel, ...props }, ref) {
  const { translate, isRtl } = useAppLanguage();
  const parts = Children.toArray(children);
  const plain = parts.every(part => typeof part === "string" || typeof part === "number");
  const content = plain ? translate(parts.join("")) : Children.map(children, child => typeof child === "string" ? translate(child) : child);
  return <NativeText {...props} ref={ref} accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : undefined}
    style={[isRtl && { writingDirection: "rtl" }, style]}>{content}</NativeText>;
});
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function LocalizedInput({ placeholder, accessibilityLabel, style, ...props }, ref) {
  const { translate, isRtl } = useAppLanguage();
  return <NativeTextInput {...props} ref={ref} placeholder={placeholder ? translate(placeholder) : undefined}
    accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : undefined} style={[isRtl && { writingDirection: "rtl", textAlign: "right" }, style]} />;
});
export const Image = forwardRef<NativeImage, ImageProps>(function OptimizedImage({ accessibilityLabel, resizeMethod = "resize", ...props }, ref) {
  const { translate } = useAppLanguage();
  return <NativeImage {...props} ref={ref} resizeMethod={resizeMethod} accessibilityLabel={accessibilityLabel ? translate(accessibilityLabel) : undefined} />;
});
export const Alert = { ...NativeAlert, alert: (...[title, message, buttons, options]: Parameters<typeof NativeAlert.alert>) => NativeAlert.alert(
  translateUi(getDialogLanguage(), title), message ? translateUi(getDialogLanguage(), message) : message,
  buttons?.map(button => ({ ...button, text: button.text ? translateUi(getDialogLanguage(), button.text) : button.text })), options) };
