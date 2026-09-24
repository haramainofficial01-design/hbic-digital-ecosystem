import { en } from "./en";
import { ur } from "./ur";
import type { LanguageCode } from "../types";

export const translations = { en, ur };
export type TranslationKey = keyof typeof en;

export function t(language: LanguageCode, key: TranslationKey): string {
  return translations[language][key] ?? en[key];
}
