import { en } from "./en";
import { ur } from "./ur";
import type { LanguageCode } from "../types";

export const translations = { en, ur };

export function t(language: LanguageCode, key: keyof typeof en): string {
  return translations[language][key] ?? en[key];
}
