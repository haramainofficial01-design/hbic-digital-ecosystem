import * as FileSystem from "expo-file-system/legacy";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import {
  createOnboardingRecord,
  currentOnboardingVersion,
  normalizeOnboardingRecord,
  shouldPresentOnboarding,
  type OnboardingRecord
} from "./onboardingState";

const onboardingFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-onboarding.json` : "";
const legacyFiles = [
  "hbic-published-content.json",
  "hbic-language.txt",
  "hbic-theme-mode.txt",
  "hbic-notification-preferences.json",
  "hbic-notification-installation.txt"
];

interface OnboardingContextValue {
  active: boolean;
  initialStep: number;
  replaying: boolean;
  saveProgress: (step: number) => Promise<void>;
  complete: () => Promise<void>;
  startReplay: () => void;
  cancelReplay: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

async function writeRecord(record: OnboardingRecord) {
  if (!onboardingFile) return;
  await FileSystem.writeAsStringAsync(onboardingFile, JSON.stringify(record, null, 2));
}

async function readRecord() {
  if (!onboardingFile) return null;
  try {
    const info = await FileSystem.getInfoAsync(onboardingFile);
    if (!info.exists) return null;
    return normalizeOnboardingRecord(JSON.parse(await FileSystem.readAsStringAsync(onboardingFile)));
  } catch {
    return null;
  }
}

async function hasLegacyInstallState() {
  if (!FileSystem.documentDirectory) return false;
  const results = await Promise.all(
    legacyFiles.map((name) => FileSystem.getInfoAsync(`${FileSystem.documentDirectory}${name}`).catch(() => ({ exists: false })))
  );
  return results.some((result) => result.exists);
}

export function OnboardingProvider({ children }: PropsWithChildren) {
  const { theme } = useAppTheme();
  const [hydrated, setHydrated] = useState(false);
  const [active, setActive] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [initialStep, setInitialStep] = useState(0);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const existing = await readRecord();
      if (existing) {
        if (mounted) {
          setInitialStep(existing.status === "in-progress" ? existing.currentStep : 0);
          setActive(shouldPresentOnboarding(existing));
        }
      } else if (await hasLegacyInstallState()) {
        await writeRecord(createOnboardingRecord({ status: "complete", source: "legacy-migration" }));
      } else if (mounted) {
        const created = createOnboardingRecord();
        await writeRecord(created);
        setInitialStep(0);
        setActive(true);
      }
      if (mounted) setHydrated(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const saveProgress = useCallback(async (step: number) => {
    if (replaying) return;
    setInitialStep(step);
    await writeRecord(createOnboardingRecord({ currentStep: step }));
  }, [replaying]);

  const complete = useCallback(async () => {
    if (!replaying) {
      await writeRecord(createOnboardingRecord({
        currentStep: 0,
        status: "complete",
        source: "first-install"
      }));
    }
    setActive(false);
    setReplaying(false);
    setInitialStep(0);
  }, [replaying]);

  const startReplay = useCallback(() => {
    setInitialStep(0);
    setReplaying(true);
    setActive(true);
  }, []);

  const cancelReplay = useCallback(() => {
    setActive(false);
    setReplaying(false);
    setInitialStep(0);
  }, []);

  const value = useMemo(
    () => ({ active, initialStep, replaying, saveProgress, complete, startReplay, cancelReplay }),
    [active, cancelReplay, complete, initialStep, replaying, saveProgress, startReplay]
  );

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.teal} accessibilityLabel="Opening Masjid Bilal" />
      </View>
    );
  }

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider");
  return value;
}

export const onboardingDiagnostics = {
  currentVersion: currentOnboardingVersion,
  persistenceFileName: "hbic-onboarding.json"
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  }
});

