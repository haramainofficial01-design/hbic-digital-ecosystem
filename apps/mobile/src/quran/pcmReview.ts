export interface PcmSink { write(bytes: Uint8Array): void; seek(offset: number): void; close(): void; remove(): void }
export function wavHeader(samples: number, sampleRate = 16000) {
  const bytes = new Uint8Array(44), view = new DataView(bytes.buffer);
  const ascii = (at: number, text: string) => { for (let i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i); };
  ascii(0, "RIFF"); view.setUint32(4, 36 + samples * 2, true); ascii(8, "WAVE"); ascii(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, "data"); view.setUint32(40, samples * 2, true); return bytes;
}
/** Stream optional private review audio to disk, not an unbounded JS array.
 * One mono 16-bit two-minute file is capped at 3.84 MB plus its WAV header. */
export class PcmReviewWriter {
  private samples = 0; private closed = false;
  constructor(private readonly sink: PcmSink, private readonly maxSamples = 16000 * 120) {
    try { sink.write(wavHeader(0)); }
    catch (error) { this.closed = true; try { sink.close(); } finally { sink.remove(); } throw error; }
  }
  get durationMillis() { return this.samples / 16; }
  append(chunk: readonly number[]) {
    if (this.closed) return;
    const length = Math.min(chunk.length, this.maxSamples - this.samples); if (length <= 0) return;
    const bytes = new Uint8Array(length * 2), view = new DataView(bytes.buffer);
    for (let i = 0; i < length; i++) { const value = Number.isFinite(chunk[i]) ? Math.max(-1, Math.min(1, chunk[i])) : 0; view.setInt16(i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true); }
    this.sink.write(bytes); this.samples += length;
  }
  finish() {
    if (this.closed) return 0;
    try { this.sink.seek(0); this.sink.write(wavHeader(this.samples)); }
    finally { this.closed = true; this.sink.close(); }
    if (!this.samples) this.sink.remove();
    return this.durationMillis;
  }
  discard() {
    try { if (!this.closed) { this.closed = true; this.sink.close(); } }
    finally { this.sink.remove(); }
  }
}
