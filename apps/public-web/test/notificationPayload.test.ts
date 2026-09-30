import assert from "node:assert/strict";
import test from "node:test";
import {
  buildContentUpdateExpoPushMessage,
  buildVisibleExpoPushMessage,
  communityNotificationChannelId,
  decideTokenRotation,
  visibleIqamahChanges
} from "../lib/notificationPayload";

test("visible community pushes use the stable high-priority sound channel", () => {
  const message = buildVisibleExpoPushMessage("ExponentPushToken[test]", {
    title: "Community update",
    body: "A new announcement is available.",
    route: "/community",
    type: "announcement"
  });

  assert.equal(message.channelId, communityNotificationChannelId);
  assert.equal(message.sound, "default");
  assert.equal(message.priority, "high");
  assert.equal(message.interruptionLevel, "active");
  assert.deepEqual(message.data, { route: "/community", type: "announcement" });
});

test("routine prayer pushes are rejected so local schedules cannot duplicate", () => {
  assert.throws(
    () => buildVisibleExpoPushMessage("ExponentPushToken[test]", {
      title: "Fajr",
      body: "Prayer time",
      type: "prayerReminder"
    }),
    /scheduled locally/
  );
});

test("content update signals are headless and versioned", () => {
  const message = buildContentUpdateExpoPushMessage("ExponentPushToken[test]", {
    contentVersion: 42,
    publicationRevision: 7,
    scheduleRevision: "rev-42",
    publishedAt: "2026-08-23T12:00:00.000Z"
  });

  assert.equal(message.contentAvailable, true);
  assert.equal(message.priority, "high");
  assert.equal(message.ttl, 300);
  assert.equal(message.title, undefined);
  assert.equal(message.body, undefined);
  assert.equal(message.channelId, undefined);
  assert.equal(message.data.contentVersion, 42);
  assert.equal(message.data.publicationRevision, 7);
});

test("legacy registrations can retain their pre-upgrade Android channel", () => {
  const message = buildVisibleExpoPushMessage("ExponentPushToken[test]", {
    title: "Masjid update",
    body: "Open the app for details.",
    androidChannelId: "default"
  });
  assert.equal(message.channelId, "default");
});

test("token rotation removes only a matching installation and safely disables legacy tokens", () => {
  assert.equal(decideTokenRotation("device-hash", "device-hash"), "delete");
  assert.equal(decideTokenRotation("device-hash", undefined), "disable-legacy");
  assert.equal(decideTokenRotation("device-hash", "another-device"), "ignore");
  assert.equal(decideTokenRotation(undefined, "another-device"), "ignore");
});

test("change alerts respect global and per-prayer consent without leaking hidden times", () => {
  const changes = [
    { prayer: "fajr" as const, oldTime: "6:20 AM", newTime: "6:30 AM" },
    { prayer: "asr" as const, oldTime: "5:30 PM", newTime: "5:15 PM" }
  ];
  assert.deepEqual(visibleIqamahChanges(changes, false), []);
  assert.deepEqual(visibleIqamahChanges(changes, true, { enabled: false, prayers: {} }), []);
  assert.deepEqual(visibleIqamahChanges(changes, true, { enabled: true, prayers: { fajr: false, asr: true } }), [changes[1]]);
  assert.deepEqual(visibleIqamahChanges(changes, true), changes);
});
