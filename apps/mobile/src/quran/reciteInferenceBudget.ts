/** Pacing only; acoustic thresholds and selected-ayah judging stay unchanged. */
export class ReciteInferenceBudget {
  private nextAt = 0;
  private lastEnd = 0;
  private earliestAt = 0;
  // Six-second windows need >= half-window overlap for independent word
  // support. Keep the qualified 2.5s cadence; reduce waste, not coverage.
  constructor(private readonly intervalMs = 2500) {}
  ready(now: number, endSample: number, speechSinceLastCheck: boolean, finishingUtterance = false) {
    return now >= (finishingUtterance ? this.earliestAt : this.nextAt) && endSample - this.lastEnd >= 16000 && (speechSinceLastCheck || finishingUtterance);
  }
  started(endSample: number) { this.lastEnd = endSample; }
  finished(now: number, durationMs: number) {
    this.earliestAt = now + Math.max(1000, durationMs);
    // Ensure at least as much idle time as inference time on slower devices.
    this.nextAt = now + Math.max(750, this.intervalMs - durationMs, durationMs);
  }
}
export function containsVoiceEnergy(samples: readonly number[]) {
  if (!samples.length) return false;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length) >= .003;
}

/** Let actual captured quiet samples finish an utterance. Never fabricate PCM
 * or keep inferring forever on silence. Manual resets discard the tail. */
export class ReciteUtteranceTail {
  private lastVoiceEnd = -1;
  private remaining = 0;
  append(endSample: number, voiced: boolean) {
    if (voiced) { this.lastVoiceEnd = endSample; this.remaining = 3; }
  }
  pending(endSample: number) {
    return this.remaining > 0 && this.lastVoiceEnd >= 0 && endSample > this.lastVoiceEnd
      && endSample - this.lastVoiceEnd <= 4 * 16000;
  }
  analyzed(voiced: boolean) { if (!voiced) this.remaining = Math.max(0, this.remaining - 1); }
  reset() { this.lastVoiceEnd = -1; this.remaining = 0; }
}
