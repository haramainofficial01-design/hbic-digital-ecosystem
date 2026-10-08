type Permission = { granted: boolean; canAskAgain: boolean };
type Foreground = { isActive: () => boolean; subscribe: (check: () => void) => { remove: () => void } };
/** Permission dialogs temporarily deactivate the Activity; never capture there. */
export async function quranRecordingPermission<T extends Permission>(api: {
  getRecordingPermissionsAsync: () => Promise<T>; requestRecordingPermissionsAsync: () => Promise<T>;
}, foreground: Foreground, dialog: (waiting: boolean) => void) {
  const existing = await api.getRecordingPermissionsAsync();
  if (existing.granted) return existing; // Do not reopen a granted permission Activity.
  dialog(true);
  try {
    const permission = await api.requestRecordingPermissionsAsync();
    // Wait for the OS dialog to close, not for a recording to run in background.
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return; settled = true; clearTimeout(deadline); clearTimeout(stable); listener.remove();
        if (error) reject(error); else resolve();
      };
      const check = () => { clearTimeout(stable); if (foreground.isActive()) stable = setTimeout(() => {
        if (foreground.isActive()) finish();
      }, 150); };
      let stable: ReturnType<typeof setTimeout> | undefined;
      const deadline = setTimeout(() => finish(new Error("Recording cancelled. Return to the app and try again.")), 1500);
      const listener = foreground.subscribe(check); check();
    });
    return permission;
  } finally { dialog(false); }
}
