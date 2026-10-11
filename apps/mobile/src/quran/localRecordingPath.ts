import type { QuranRecording } from "@hbic/shared";
/** App-container UUIDs can change on restore. Resolve only our known recording
 * filename in the current private directory; never open/delete an arbitrary URI. */
export function localRecordingPath(recording: Pick<QuranRecording, "id" | "uri">, documentDirectory: string | null) {
  const extension = /\.(m4a|wav)$/i.exec(recording.uri)?.[1].toLowerCase();
  if (!documentDirectory?.startsWith("file://") || !/^quran-\d+-[a-z0-9]+$/.test(recording.id) || !extension)
    throw new Error("This recording is unavailable on this device.");
  return `${documentDirectory.replace(/\/$/, "")}/quran-practice/${recording.id}.${extension}`;
}
