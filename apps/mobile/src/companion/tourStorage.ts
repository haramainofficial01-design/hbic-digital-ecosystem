import { BilalTourLedger } from "@hbic/shared";
import * as FileSystem from "expo-file-system/legacy";
const file = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-bilal-tour.txt` : "";
export const bilalTourLedger = new BilalTourLedger({
  read: async () => { if (!file) throw Error("Local preferences unavailable"); const info = await FileSystem.getInfoAsync(file); return info.exists ? FileSystem.readAsStringAsync(file) : null; },
  write: async value => { if (!file) throw Error("Local preferences unavailable"); if (value === null) await FileSystem.deleteAsync(file, { idempotent: true }); else await FileSystem.writeAsStringAsync(file, value); }
});
