/** Pacing only; acoustic thresholds and selected-ayah judging stay unchanged. */
export class ReciteInferenceBudget {
  private nextAt = 0;
  private lastEnd = 0;
  // Six-second windows need >= half-window overlap for independent word
  // support. Keep the qualified 2.5s cadence; reduce waste, not coverage.
  constructor(private readonly intervalMs = 2500) {}
  ready(now: number, endSample: number, speechSinceLastCheck: boolean) {
    return now >= this.nextAt && endSample - this.lastEnd >= 16000 && speechSinceLastCheck;
  }
  started(endSample: number) { this.lastEnd = endSample; }
  finished(now: number, durationMs: number) {
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
