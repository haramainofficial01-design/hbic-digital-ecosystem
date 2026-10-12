/** Deliberately bounded, pitch-preserving recitation playback speeds. */
export const QURAN_PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export function validQuranPlaybackSpeed(rate: number) {
  return QURAN_PLAYBACK_SPEEDS.some(value => value === rate);
}
export function adjacentQuranPlaybackSpeed(rate: number, direction: -1 | 1) {
  const index = QURAN_PLAYBACK_SPEEDS.findIndex(value => value === rate);
  return QURAN_PLAYBACK_SPEEDS[Math.max(0, Math.min(QURAN_PLAYBACK_SPEEDS.length - 1, (index < 0 ? 2 : index) + direction))];
}
