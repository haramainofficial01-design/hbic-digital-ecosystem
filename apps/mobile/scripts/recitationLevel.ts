/** Isolated comparison frontend, NOT app audio processing or qualification.
 * One constant, bounded gain for the whole recording. No expected words, VAD,
 * time removal, compression, generated samples, clipping or pitch correction. */
export function recitationLevel(pcm: Float32Array) {
  if (!(pcm instanceof Float32Array) || pcm.length < 4000 || pcm.length > 16000 * 90) {
    throw Error("Bounded 16 kHz research waveform required");
  }
  let power = 0, peak = 0;
  for (const value of pcm) {
    if (!Number.isFinite(value) || Math.abs(value) > 1.00001) throw Error("Valid real PCM required");
    power += value * value;
    peak = Math.max(peak, Math.abs(value));
  }
  const rms = Math.sqrt(power / pcm.length);
  // Leave effectively silent input unchanged; amplification is not evidence of
  // speech and cannot grant recognition confidence or a recitation score.
  const gain = rms > .0001 && peak > 0 ? Math.min(4, Math.max(.25, .1 / rms), .95 / peak) : 1;
  const output = Float32Array.from(pcm, sample => sample * gain);
  return { pcm: output, gain, originalRms: rms, originalPeak: peak, referenceConditioned: false as const };
}
