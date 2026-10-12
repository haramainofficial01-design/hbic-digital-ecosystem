import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
test("private phone test requires consented registration and sends only device proof, not a broadcast", () => {
  const service = readFileSync(new URL("../src/services/notifications.ts", import.meta.url), "utf8");
  const start = service.indexOf("export async function createPrivateNotificationTestCodeAsync");
  const code = service.slice(start);
  assert.match(code, /registerForPushNotificationsAsync\(\{ requestPermission: true \}\)/);
  assert.match(code, /if \(!token\) throw/);
  assert.match(code, /installationId: await installationId\(\)/);
  assert.match(code, /\/api\/notifications\/test-code/);
  assert.doesNotMatch(code, /\/api\/admin\/notifications\/send/);
  assert.match(service, /ios: \{ allowAlert: true, allowBadge: true, allowSound: true \}/);
  assert.match(service, /name: "Community updates"/);
  const layout = readFileSync(new URL("../app/_layout.tsx", import.meta.url), "utf8");
  assert.match(layout, /resolveNotificationDestination\(data\)/);
  assert.match(layout, /getLastNotificationResponseAsync/);
  assert.match(layout, /addNotificationResponseReceivedListener/);
});
