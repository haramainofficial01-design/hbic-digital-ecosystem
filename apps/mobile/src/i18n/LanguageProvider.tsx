import { t as translateShared, type LanguageCode, type TranslationKey } from "@hbic/shared";
import * as FileSystem from "expo-file-system/legacy";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface LanguageContextValue {
  language: LanguageCode;
  isRtl: boolean;
  setLanguage: (language: LanguageCode) => Promise<void>;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);
const languageFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-language.txt` : "";

function isLanguage(value: string | null | undefined): value is LanguageCode {
  return value === "en" || value === "ur";
}

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setStoredLanguage] = useState<LanguageCode>("en");

  useEffect(() => {
    let mounted = true;

    async function loadLanguage() {
      if (!languageFile) return;
      try {
        const info = await FileSystem.getInfoAsync(languageFile);
        if (!info.exists) return;
        const saved = (await FileSystem.readAsStringAsync(languageFile)).trim();
        if (mounted && isLanguage(saved)) setStoredLanguage(saved);
      } catch {
        // English remains the safe approved fallback.
      }
    }

    void loadLanguage();
    return () => {
      mounted = false;
    };
  }, []);

  const setLanguage = useCallback(async (nextLanguage: LanguageCode) => {
    setStoredLanguage(nextLanguage);
    if (!languageFile) return;
    try {
      await FileSystem.writeAsStringAsync(languageFile, nextLanguage);
    } catch {
      // The selected language still applies for this session.
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isRtl: language === "ur",
      setLanguage,
      t: (key) => translateShared(language, key)
    }),
    [language, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useAppLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useAppLanguage must be used inside LanguageProvider");
  return value;
}
