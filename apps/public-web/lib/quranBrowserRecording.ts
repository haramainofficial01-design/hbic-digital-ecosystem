export interface BrowserRecordingState {
  phase: "idle" | "preparing" | "recording" | "review";
  url: string | null;
  mimeType: string | null;
  error: string | null;
}
export interface BrowserRecordingPort {
  getUserMedia(): Promise<MediaStream>;
  recorder(stream: MediaStream): MediaRecorder;
  createUrl(blob: Blob): string;
  revokeUrl(url: string): void;
  isVisible(): boolean;
}

/** Browser-only recording. Audio is never persisted or sent over the network. */
export function createBrowserRecording(port: BrowserRecordingPort, changed: (state: BrowserRecordingState) => void) {
  let epoch = 0, recorder: MediaRecorder | null = null, stream: MediaStream | null = null;
  let chunks: Blob[] = [], url: string | null = null, timer: ReturnType<typeof setTimeout> | null = null;
  let saveOnStop = false, disposed = false, ownsStream = true;
  const publish = (state: BrowserRecordingState) => { if (!disposed) changed(state); };
  function stopTracks() { if (ownsStream) stream?.getTracks().forEach((track) => track.stop()); stream = null; }
  function clearReview() { if (url) port.revokeUrl(url); url = null; chunks = []; }
  function erase() {
    ++epoch; saveOnStop = false;
    if (timer) clearTimeout(timer); timer = null;
    const previous = recorder; recorder = null;
    if (previous) { previous.ondataavailable = null; previous.onstop = null; previous.onerror = null;
      if (previous.state !== "inactive") { try { previous.stop(); } catch { /* Tracks still close below. */ } } }
    stopTracks(); clearReview();
    publish({ phase: "idle", url: null, mimeType: null, error: null });
  }
  // Recognition can lend its stream: recording never opens a second microphone
  // or closes the owner's tracks. The recognition owner handles their lifetime.
  async function start(sharedStream?: MediaStream) {
    if (disposed) return;
    erase(); const run = epoch;
    publish({ phase: "preparing", url: null, mimeType: null, error: null });
    try {
      const granted = sharedStream ?? await port.getUserMedia();
      if (disposed || run !== epoch || !port.isVisible()) { if (!sharedStream) granted.getTracks().forEach((track) => track.stop()); return; }
      ownsStream = !sharedStream;
      stream = granted; const capture = port.recorder(granted); recorder = capture;
      capture.ondataavailable = (event) => { if (run === epoch && event.data.size) chunks.push(event.data); };
      capture.onstop = () => {
        if (run !== epoch || disposed) return;
        if (timer) clearTimeout(timer); timer = null; stopTracks(); recorder = null;
        if (!saveOnStop || !port.isVisible()) { clearReview(); publish({ phase: "idle", url: null, mimeType: null, error: null }); return; }
        const mimeType = capture.mimeType || chunks[0]?.type || "audio/webm";
        const blob = new Blob(chunks, { type: mimeType }); chunks = [];
        if (!blob.size) { publish({ phase: "idle", url: null, mimeType: null, error: "This browser did not produce a recording. Please retry." }); return; }
        url = port.createUrl(blob); publish({ phase: "review", url, mimeType, error: null });
      };
      capture.onerror = () => { erase(); publish({ phase: "idle", url: null, mimeType: null, error: "Recording stopped unexpectedly. Please retry." }); };
      capture.start(1000);
      publish({ phase: "recording", url: null, mimeType: null, error: null });
      timer = setTimeout(() => stop(), 300_000);
    } catch (reason) {
      if (disposed || run !== epoch) return;
      erase(); publish({ phase: "idle", url: null, mimeType: null, error: reason instanceof Error && reason.name === "NotAllowedError"
        ? "Microphone access was declined. You can still listen and practise." : "Private recording is unavailable in this browser. Use HTTPS and try again." });
    }
  }
  function stop() {
    if (!recorder || recorder.state === "inactive") return;
    saveOnStop = true;
    if (timer) clearTimeout(timer); timer = null;
    try { recorder.stop(); stopTracks(); }
    catch { erase(); publish({ phase: "idle", url: null, mimeType: null, error: "The recording could not finish. Please retry." }); }
  }
  return { start, stop, erase, dispose() { erase(); disposed = true; } };
}

export function recordingExtension(mimeType: string) {
  return /mp4|aac/i.test(mimeType) ? "m4a" : /ogg/i.test(mimeType) ? "ogg" : /wav/i.test(mimeType) ? "wav" : "webm";
}
