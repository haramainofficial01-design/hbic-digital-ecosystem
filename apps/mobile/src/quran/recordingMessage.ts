export function recordingMessage(error: unknown, action: "start" | "save") {
  const message = error instanceof Error ? error.message : "";
  if (/Microphone access|Enable microphone|Recording cancelled|100 recordings|storage is unavailable/i.test(message)) return message;
  return action === "start" ? "Recording couldn’t start. Check microphone access and available storage, then retry. Reading and listening still work."
    : "This recording couldn’t be saved. Check available space and try again; your kept recordings are unchanged.";
}
