import Foundation

@main
enum PrayerSnapshotTests {
    static func main() throws {
        let now = Date()
        try normalHijriDatePreservesAuthoritativeValues(now: now)
        try whiteDayFallbackRecognizesDays13To15(now: now)
        try localizedWhiteDayFallbackRecognizesUrduDigits(now: now)
        try nonWhiteDayFallbackRejectsDay16(now: now)
        try oldCachedSnapshotsDecodeSafely(now: now)
        try noDataWidgetSnapshotIsUnavailable(now: now)
        try staleWidgetSnapshotIsMarkedStale(now: now)
        try watchCachedSnapshotPreservesCompatibilityValues(now: now)
        try complicationTimelineUsesPrayerTransitions(now: now)
        try nativeConsumersAdvanceAtPrayerBoundary(now: now)
        try countdownUsesLessThanOneMinute(now: now)
        try versionOneSnapshotsRemainReadable(now: now)
        try canonicalCrossConsumerFixtureDecodes()
        try jumuahDoorTransitionUsesMasjidTimeZone()
        print("Prayer snapshot Swift tests passed")
    }

    private static func normalHijriDatePreservesAuthoritativeValues(now: Date) throws {
        let value = makeSnapshot(now: now, hijriDate: "12 Safar 1448 AH", isWhiteDay: false)
        assert(value.hijriDate == "12 Safar 1448 AH", "Expected the authoritative Hijri display value to be preserved")
        assert(!value.isWhiteDay, "Expected the authoritative White Day flag to be preserved")
    }

    private static func whiteDayFallbackRecognizesDays13To15(now: Date) throws {
        for day in 13...15 {
            let decoded = try decodeRemovingWhiteDay(makeSnapshot(now: now, hijriDate: "\(day) Safar 1448 AH", isWhiteDay: nil))
            assert(decoded.isWhiteDay, "Expected Hijri day \(day) to be a White Day when the legacy snapshot lacks the boolean")
        }
    }

    private static func nonWhiteDayFallbackRejectsDay16(now: Date) throws {
        let decoded = try decodeRemovingWhiteDay(makeSnapshot(now: now, hijriDate: "16 Safar 1448 AH", isWhiteDay: nil))
        assert(!decoded.isWhiteDay, "Expected Hijri day 16 not to be a White Day")
    }

    private static func localizedWhiteDayFallbackRecognizesUrduDigits(now: Date) throws {
        let decoded = try decodeRemovingWhiteDay(makeSnapshot(now: now, hijriDate: "١٣ صفر ١٤٤٨ هـ", isWhiteDay: nil))
        assert(decoded.hijriDate == "١٣ صفر ١٤٤٨ هـ", "Expected the localized Hijri display value to remain unchanged")
        assert(decoded.isWhiteDay, "Expected Arabic-numeral Hijri day 13 to be a White Day")
    }

    private static func oldCachedSnapshotsDecodeSafely(now: Date) throws {
        let decoded = try decodeRemovingHijriFields(makeSnapshot(now: now, hijriDate: "", isWhiteDay: nil, state: "cached"))
        assert(decoded.hijriDate.isEmpty, "Expected old cached data without Hijri text to use the explicit unavailable display")
        assert(!decoded.isWhiteDay, "Expected old cached data without Hijri text to default to non-White-Day")
    }

    private static func noDataWidgetSnapshotIsUnavailable(now: Date) throws {
        let value = makeSnapshot(now: now, prayers: [])
        assert(!value.hasUsableData, "Expected an empty schedule to remain unavailable for widgets")
    }

    private static func staleWidgetSnapshotIsMarkedStale(now: Date) throws {
        let value = makeSnapshot(now: now, state: "cached")
        assert(value.isStale(at: now), "Expected cached widget data to be marked stale")
    }

    private static func watchCachedSnapshotPreservesCompatibilityValues(now: Date) throws {
        let decoded = try decodeRemovingWhiteDay(makeSnapshot(now: now, hijriDate: "14 Safar 1448 AH", isWhiteDay: nil, state: "cached"))
        assert(decoded.state == "cached", "Expected the Watch cached state to survive decoding")
        assert(decoded.isWhiteDay, "Expected the Watch cached entry to derive White Day from Hijri day 14")
    }

    private static func complicationTimelineUsesPrayerTransitions(now: Date) throws {
        let value = makeSnapshot(now: now)
        let dates = value.timelineDates(after: now)
        assert(dates.contains { abs($0.timeIntervalSince(now.addingTimeInterval(3_600))) < 2 }, "Expected the complication timeline to include the next prayer transition")
    }

    private static func nativeConsumersAdvanceAtPrayerBoundary(now: Date) throws {
        let value = makeSnapshot(now: now)
        let next = value.effectiveNextPrayer(at: now.addingTimeInterval(3_601))
        assert(next?.key == "isha", "Expected native consumers to advance from Asr to Isha at the absolute boundary")

        let tomorrow = value.effectiveNextPrayer(at: now.addingTimeInterval(7_201))
        assert(tomorrow?.key == "fajr", "Expected native consumers to advance from Isha to tomorrow Fajr")
    }

    private static func countdownUsesLessThanOneMinute(now: Date) throws {
        let value = makeSnapshot(now: now)
        assert(value.countdownText(at: now.addingTimeInterval(3_570)) == "<1m", "Expected the final minute not to display 0m")
    }

    private static func versionOneSnapshotsRemainReadable(now: Date) throws {
        var payload = try JSONSerialization.jsonObject(with: JSONEncoder().encode(makeSnapshot(now: now))) as! [String: Any]
        payload["schemaVersion"] = 1
        for key in [
            "scheduleRevision",
            "masjidTimeZoneIdentifier",
            "serviceDate",
            "currentPrayer",
            "tomorrowFajrDate",
            "jumuahState",
            "availability",
            "stale",
            "staleReason",
            "hijri"
        ] {
            payload.removeValue(forKey: key)
        }
        let decoded = try decode(payload)
        assert(decoded.schemaVersion == 1, "Expected the stored schema version to remain available")
        assert(decoded.masjidTimeZoneIdentifier == "America/Edmonton", "Expected the legacy timezone alias to populate the canonical field")
        assert(decoded.availability == "available", "Expected a valid legacy schedule to remain usable")
    }

    private static func canonicalCrossConsumerFixtureDecodes() throws {
        let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let fixtureURL = root
            .appendingPathComponent("../../packages/shared/test/fixtures/canonical-prayer-snapshot-v2.json")
            .standardizedFileURL
        let fixture = try Data(contentsOf: fixtureURL)
        guard let decoded = MasjidPrayerSnapshot.decode(fixture) else {
            throw TestFailure("Expected the canonical cross-consumer fixture to decode")
        }
        let duringMaghrib = ISO8601DateFormatter().date(from: "2026-07-10T04:00:00Z")!
        assert(decoded.effectiveNextPrayer(at: duringMaghrib)?.key == "isha", "Expected Watch and widget consumers to agree on Isha")
        assert(decoded.tomorrowFajrDate == "2026-07-10T10:02:00.000Z", "Expected the shared tomorrow Fajr timestamp")
        assert(decoded.jumuahState.firstDoorsCloseTime == "2:00 PM", "Expected the shared Jumu'ah door notice")
        assert(decoded.jumuahState.title == "First Jumu'ah", "Expected the shared Jumu'ah notice title")
        assert(decoded.jumuahState.parkingNotice?.contains("park respectfully") == true, "Expected shared Jumu'ah parking guidance")
    }

    private static func jumuahDoorTransitionUsesMasjidTimeZone() throws {
        let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
        let fixtureURL = root
            .appendingPathComponent("../../packages/shared/test/fixtures/canonical-prayer-snapshot-v2.json")
            .standardizedFileURL
        let fixture = try Data(contentsOf: fixtureURL)
        guard let decoded = MasjidPrayerSnapshot.decode(fixture),
              let closeDate = decoded.jumuahDoorsCloseDateValue else {
            throw TestFailure("Expected the Jumu'ah door-closing timestamp to parse")
        }
        let expected = ISO8601DateFormatter().date(from: "2026-07-09T20:00:00Z")!
        assert(abs(closeDate.timeIntervalSince(expected)) < 1, "Expected 2:00 PM Calgary time to become the correct absolute timestamp")
        assert(decoded.isJumuahServiceDay(at: expected), "Expected the service day to be evaluated in the masjid timezone")
        let beforeClose = expected.addingTimeInterval(-60)
        assert(decoded.timelineDates(after: beforeClose).contains { abs($0.timeIntervalSince(expected)) < 1 }, "Expected widget timelines to refresh when first Jumu'ah doors close")
    }

    private static func makeSnapshot(
        now: Date,
        hijriDate: String = "12 Safar 1448 AH",
        isWhiteDay: Bool? = false,
        state: String = "fresh",
        prayers: [MasjidPrayerEntry]? = nil
    ) -> MasjidPrayerSnapshot {
        let formatter = ISO8601DateFormatter()
        let nextPrayerDate = now.addingTimeInterval(3_600)
        let entries = prayers ?? [
            MasjidPrayerEntry(
                key: "fajr",
                name: "Fajr",
                adhan: "4:02 AM",
                adhanDate: formatter.string(from: now.addingTimeInterval(-10_800)),
                iqamah: "4:30 AM",
                iqamahDate: formatter.string(from: now.addingTimeInterval(-9_120))
            ),
            MasjidPrayerEntry(
                key: "asr",
                name: "Asr",
                adhan: "6:01 PM",
                adhanDate: formatter.string(from: nextPrayerDate),
                iqamah: "6:30 PM",
                iqamahDate: formatter.string(from: nextPrayerDate.addingTimeInterval(1_740))
            ),
            MasjidPrayerEntry(
                key: "isha",
                name: "Isha",
                adhan: "11:20 PM",
                adhanDate: formatter.string(from: now.addingTimeInterval(7_200)),
                iqamah: "11:25 PM",
                iqamahDate: formatter.string(from: now.addingTimeInterval(7_500))
            )
        ]

        return MasjidPrayerSnapshot(
            schemaVersion: 2,
            masjidID: "masjid-bilal-calgary",
            masjidName: "Masjid Bilal",
            timezone: "America/Edmonton",
            scheduleDate: "2026-07-26",
            currentPrayerKey: nil,
            nextPrayerKey: "asr",
            nextPrayerName: "Asr",
            nextPrayerTime: "6:01 PM",
            nextPrayerDate: formatter.string(from: nextPrayerDate),
            nextIqamah: "6:30 PM",
            nextIqamahDate: formatter.string(from: nextPrayerDate.addingTimeInterval(1_740)),
            prayers: entries,
            jumuah: [],
            generatedAt: formatter.string(from: now),
            sourceUpdatedAt: formatter.string(from: now),
            expiresAt: formatter.string(from: now.addingTimeInterval(86_400)),
            state: state,
            upcomingEvent: nil,
            hijriDate: hijriDate,
            isWhiteDay: isWhiteDay,
            scheduleRevision: "test-revision",
            masjidTimeZoneIdentifier: "America/Edmonton",
            serviceDate: "2026-07-26",
            tomorrowFajrDate: formatter.string(from: now.addingTimeInterval(14_400)),
            availability: entries.isEmpty ? "unavailable" : "available",
            stale: state == "cached"
        )
    }

    private static func decodeRemovingWhiteDay(_ snapshot: MasjidPrayerSnapshot) throws -> MasjidPrayerSnapshot {
        var payload = try JSONSerialization.jsonObject(with: JSONEncoder().encode(snapshot)) as! [String: Any]
        payload.removeValue(forKey: "isWhiteDay")
        return try decode(payload)
    }

    private static func decodeRemovingHijriFields(_ snapshot: MasjidPrayerSnapshot) throws -> MasjidPrayerSnapshot {
        var payload = try JSONSerialization.jsonObject(with: JSONEncoder().encode(snapshot)) as! [String: Any]
        payload.removeValue(forKey: "hijriDate")
        payload.removeValue(forKey: "isWhiteDay")
        return try decode(payload)
    }

    private static func decode(_ payload: [String: Any]) throws -> MasjidPrayerSnapshot {
        let data = try JSONSerialization.data(withJSONObject: payload)
        guard let snapshot = MasjidPrayerSnapshot.decode(data) else {
            throw TestFailure("Expected a compatible prayer snapshot")
        }
        return snapshot
    }
}

private struct TestFailure: Error {
    let message: String

    init(_ message: String) {
        self.message = message
    }
}
