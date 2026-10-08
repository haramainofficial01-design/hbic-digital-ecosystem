// Only active after explicit microphone consent. Emits mono 16 kHz PCM to
// the browser page; never network I/O or retained recordings.
class HBICQuranCapture extends AudioWorkletProcessor {
  constructor() { super(); this.buffer = new Float32Array(1600); this.used = 0; this.phase = 0; this.sum = 0; this.weight = 0; }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    const ratio = sampleRate / 16000;
    for (let i = 0; i < channels[0].length; i++) {
      const value = channels.reduce((n, channel) => n + channel[i], 0) / channels.length;
      let remaining = 1;
      while (remaining > 0.000001) {
        const portion = Math.min(remaining, ratio - this.phase);
        this.sum += value * portion; this.weight += portion; this.phase += portion; remaining -= portion;
        if (this.phase >= ratio - 0.000001) {
          this.buffer[this.used++] = Math.max(-1, Math.min(1, this.sum / this.weight));
          this.phase = 0; this.sum = 0; this.weight = 0;
          if (this.used === this.buffer.length) { this.port.postMessage(this.buffer, [this.buffer.buffer]); this.buffer = new Float32Array(1600); this.used = 0; }
        }
      }
    }
    return true;
  }
}
registerProcessor("hbic-quran-capture", HBICQuranCapture);
