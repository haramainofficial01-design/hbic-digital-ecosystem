import type { useQuranAudio } from "./useQuranAudio";
import type { useQuranLibrary } from "./useQuranLibrary";
export type ReturnTypeQuranAudio = ReturnType<typeof useQuranAudio>;
export type QuranLibrary = ReturnType<typeof useQuranLibrary>;
export type QuranMode = "home" | "read" | "listen" | "practice" | "memorize" | "bookmarks" | "search" | "test" | "settings";
