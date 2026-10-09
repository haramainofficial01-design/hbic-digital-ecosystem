import type { LanguageCode } from "@hbic/shared";
let language: LanguageCode = "en";
export function setDialogLanguage(value: LanguageCode) { language = value; }
export function getDialogLanguage() { return language; }
