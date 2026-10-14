/** Idle Recite Assist must not deactivate another feature's audio session.
 * Stop also waits for an owned in-flight start; cancellation cannot leave a
 * native microphone running after a late start callback. */
export class OwnedPcmCapture {
  private owns = false;
  private starting: Promise<unknown> | null = null;
  private stopping: Promise<void> | null = null;
  async start(job: () => Promise<unknown>) {
    if (this.owns || this.stopping) throw new Error("Microphone is already in use.");
    this.owns = true;
    const pending = Promise.resolve().then(job); this.starting = pending;
    try { await pending; }
    finally { if (this.starting === pending) this.starting = null; }
  }
  stop(job: () => Promise<unknown>): Promise<void> {
    if (this.stopping) return this.stopping;
    if (!this.owns) return Promise.resolve();
    const starting = this.starting;
    this.stopping = (async () => {
      await starting?.catch(() => {}); await job();
      // A rejected native stop cannot certify microphone shutdown. Retain
      // ownership for an explicit retry and reject competing starts meanwhile.
      this.owns = false;
    })().finally(() => { this.stopping = null; });
    return this.stopping;
  }
}
