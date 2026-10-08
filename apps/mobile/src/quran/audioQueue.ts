import { validAudioUrl, type QuranVerse } from "@hbic/shared";
export interface QuranAudioPort { replace(uri: string): void; play(): void; pause(): void; seekTo(seconds: number): Promise<void> }
export interface QuranPlayback { phase: "idle" | "loading" | "playing" | "paused" | "error"; verse: QuranVerse | null; index: number; count: number; error: string | null }
/** One player, cancellation-safe loads, and explicit interruption recovery. */
export class QuranAudioQueue {
  private epoch = 0;
  private sequence: number[] = [];
  private load: ((ayah: number) => Promise<QuranVerse>) | null = null;
  private state: QuranPlayback = { phase: "idle", verse: null, index: 0, count: 0, error: null };
  constructor(private port: QuranAudioPort, private changed: (state: QuranPlayback) => void) {}
  snapshot() { return this.state; }
  private publish(patch: Partial<QuranPlayback>) { this.state = { ...this.state, ...patch }; this.changed(this.state); }
  async start(sequence: number[], load: (ayah: number) => Promise<QuranVerse>) {
    this.stop(); this.sequence = sequence; this.load = load;
    if (sequence.length) await this.select(0);
  }
  private async select(index: number) {
    if (!this.load || index < 0 || index >= this.sequence.length) { this.stop(); return; }
    const epoch = ++this.epoch;
    this.port.pause(); this.publish({ phase: "loading", verse: null, index, count: this.sequence.length, error: null });
    try {
      const verse = await this.load(this.sequence[index]);
      if (epoch !== this.epoch) return;
      if (!verse.audioUrl || !validAudioUrl(verse.audioUrl)) throw new Error("Reference audio is unavailable for this ayah. Try another verified reciter.");
      this.port.replace(verse.audioUrl); this.port.play(); this.publish({ phase: "playing", verse });
    } catch (error) {
      if (epoch === this.epoch) this.publish({ phase: "error", error: error instanceof Error ? error.message : "Audio is unavailable." });
    }
  }
  async finished() { if (this.state.phase === "playing") await this.select(this.state.index + 1); }
  async next() { await this.select(this.state.index + 1); }
  async previous() { await this.select(Math.max(0, this.state.index - 1)); }
  async replay() { await this.select(this.state.index); }
  pause() { ++this.epoch; this.port.pause(); if (this.state.phase !== "idle") this.publish({ phase: "paused" }); }
  async resume() {
    if (this.state.phase !== "paused" && this.state.phase !== "error") return;
    if (!this.state.verse || this.state.phase === "error") await this.select(this.state.index);
    else { this.port.play(); this.publish({ phase: "playing", error: null }); }
  }
  stop() {
    ++this.epoch; this.port.pause(); this.sequence = []; this.load = null;
    this.publish({ phase: "idle", verse: null, index: 0, count: 0, error: null });
  }
  interrupted() { this.pause(); }
  fail(message: string) {
    if (this.state.phase === "idle") return;
    ++this.epoch; this.port.pause(); this.publish({ phase: "error", error: message });
  }
}
