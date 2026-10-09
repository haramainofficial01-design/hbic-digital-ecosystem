import { en } from "./en";
import { ur } from "./ur";
import type { LanguageCode } from "../types";
import { translateUi } from "./ui";
export * from "./ui";

export const translations = { en, ur,
  "fa-AF": Object.fromEntries(Object.entries(en).map(([key, value]) => [key, translateUi("fa-AF", value)])) as typeof en,
  ar: Object.fromEntries(Object.entries(en).map(([key, value]) => [key, translateUi("ar", value)])) as typeof en };
export type TranslationKey = keyof typeof en;

export function t(language: LanguageCode, key: TranslationKey): string {
  return translations[language][key] ?? en[key];
}
