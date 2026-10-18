import QRCode from "qrcode";
import { fileURLToPath } from "node:url";
import { appDownloadUrl, appDownloadQr } from "../lib/appLaunch";

// A static asset: no runtime QR generation, tracking service or embedded logo.
await QRCode.toFile(fileURLToPath(new URL(`../public${appDownloadQr}`, import.meta.url)), appDownloadUrl, {
  type: "png", errorCorrectionLevel: "H", margin: 4, scale: 16,
  color: { dark: "#062238FF", light: "#FFFFFFFF" }
});
console.log(`Generated ${appDownloadQr}: ${appDownloadUrl}`);
