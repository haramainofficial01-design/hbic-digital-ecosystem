/** No visual second timer. Count foreground engagement conservatively, pause
 * after 60 seconds without touch unless audio or active practice capture runs. */
export class ChallengePracticeClock {
  private lastTick: number;
  private lastTouch: number;
  private millis = 0;
  constructor(now: number) { this.lastTick = now; this.lastTouch = now; }
  touch(now: number) { this.lastTouch = now; }
  sample(now: number, foregroundPractice: boolean, playing: boolean) {
    if (now < this.lastTick) { this.lastTick = now; return; }
    if (foregroundPractice) {
      const end = playing ? now : Math.min(now, this.lastTouch + 60000);
      // A long delayed timer is not evidence of continuous foreground use.
      this.millis += Math.max(0, Math.min(20000, end - this.lastTick));
    }
    this.lastTick = now;
  }
  get seconds() { return Math.min(300, Math.floor(this.millis / 1000)); }
}
