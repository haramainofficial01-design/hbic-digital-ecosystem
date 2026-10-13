/** Offline settling experiment. The original spoken waveform is unchanged;
 * only a fixed, disclosed quiet tail is added, never reference speech. */
export function withRecitationAcousticTail(original: Uint8Array, tailMs: number) {
  if (!(original instanceof Uint8Array) || original.byteLength % 4 || original.byteLength < 16000 * 4
    || original.byteLength > 192000 * 4 || ![0, 600].includes(tailMs)) throw Error("Bounded mono PCM and explicit quiet-tail experiment required");
  const addedSamples = tailMs * 16;
  if (original.byteLength + addedSamples * 4 > 192000 * 4) throw Error("Quiet tail cannot truncate speech or exceed the inference bound");
  const padded = new Uint8Array(original.byteLength + addedSamples * 4);
  padded.set(original);
  return padded;
}
