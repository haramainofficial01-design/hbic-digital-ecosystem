import Foundation

enum MasjidSharedData {
    static let appGroup = "group.ca.hbic.calgary.app"
    static let snapshotKey = "masjid_prayer_snapshot_v1"
    static let schemaVersion = 1
}

struct MasjidPrayerEntry: Codable, Hashable, Identifiable {
    let key: String
    let name: String
    let adhan: String
    let adhanDate: String
    let iqamah: String?
    let iqamahDate: String?

    var id: String { key }
    var adhanDateValue: Date? { MasjidDateParser.date(from: adhanDate) }
    var iqamahDateValue: Date? { iqamahDate.flatMap(MasjidDateParser.date(from:)) }
}

struct MasjidJumuahEntry: Codable, Hashable, Identifiable {
    let label: String
    let khutbah: String
    let iqamah: String

    var id: String { label }
}

struct MasjidPrayerSnapshot: Codable, Hashable {
    let schemaVersion: Int
    let masjidID: String
    let masjidName: String
    let timezone: String
    let scheduleDate: String
    let currentPrayerKey: String?
    let nextPrayerKey: String
    let nextPrayerName: String
    let nextPrayerTime: String
    let nextPrayerDate: String
    let nextIqamah: String?
    let nextIqamahDate: String?
    let prayers: [MasjidPrayerEntry]
    let jumuah: [MasjidJumuahEntry]
    let generatedAt: String
    let sourceUpdatedAt: String
    let expiresAt: String
    let state: String
    let upcomingEvent: String?

    var nextPrayerDateValue: Date? { MasjidDateParser.date(from: nextPrayerDate) }
    var generatedAtValue: Date? { MasjidDateParser.date(from: generatedAt) }
    var expiresAtValue: Date? { MasjidDateParser.date(from: expiresAt) }
    var hasUsableData: Bool { schemaVersion == MasjidSharedData.schemaVersion && !prayers.isEmpty && nextPrayerDateValue != nil }

    func isStale(at date: Date = Date()) -> Bool {
        state == "cached" || (expiresAtValue.map { $0 <= date } ?? true)
    }

    func countdownText(at date: Date = Date()) -> String {
        guard let target = nextPrayerDateValue else { return "Open app" }
        let remaining = max(0, Int(target.timeIntervalSince(date)))
        let hours = remaining / 3_600
        let minutes = (remaining % 3_600) / 60
        return hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
    }

    func progressToNextPrayer(at date: Date = Date()) -> Double {
        guard let target = nextPrayerDateValue else { return 0 }
        let prayerDates = prayers.compactMap(\.adhanDateValue)
        let previous = prayerDates.filter { $0 <= date }.max()
            ?? prayerDates.max().flatMap { latest in
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = TimeZone(identifier: timezone) ?? .current
                return calendar.date(byAdding: .day, value: -1, to: latest)
            }
            ?? date
        let total = max(1, target.timeIntervalSince(previous))
        let elapsed = min(max(0, date.timeIntervalSince(previous)), total)
        return elapsed / total
    }

    func timelineDates(after date: Date = Date()) -> [Date] {
        let transitions = prayers.flatMap { prayer in
            [prayer.adhanDateValue, prayer.iqamahDateValue].compactMap { $0 }
        }
        .filter { $0 > date }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: timezone) ?? .current
        let midnight = calendar.nextDate(
            after: date,
            matching: DateComponents(hour: 0, minute: 1),
            matchingPolicy: .nextTime
        )

        return Array(Set(transitions + [midnight].compactMap { $0 })).sorted()
    }

    static func decode(_ data: Data) -> MasjidPrayerSnapshot? {
        guard let value = try? JSONDecoder().decode(MasjidPrayerSnapshot.self, from: data),
              value.schemaVersion == MasjidSharedData.schemaVersion else {
            return nil
        }
        return value
    }

    static func loadFromAppGroup() -> MasjidPrayerSnapshot? {
        guard let data = UserDefaults(suiteName: MasjidSharedData.appGroup)?.data(forKey: MasjidSharedData.snapshotKey) else {
            return nil
        }
        return decode(data)
    }

    static let preview = MasjidPrayerSnapshot(
        schemaVersion: 1,
        masjidID: "masjid-bilal-calgary",
        masjidName: "Masjid Bilal",
        timezone: "America/Edmonton",
        scheduleDate: "2026-07-10",
        currentPrayerKey: "dhuhr",
        nextPrayerKey: "asr",
        nextPrayerName: "Asr",
        nextPrayerTime: "6:01 PM",
        nextPrayerDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(3_900)),
        nextIqamah: "6:30 PM",
        nextIqamahDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(5_640)),
        prayers: [
            MasjidPrayerEntry(key: "fajr", name: "Fajr", adhan: "4:03 AM", adhanDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-30_000)), iqamah: "4:30 AM", iqamahDate: nil),
            MasjidPrayerEntry(key: "sunrise", name: "Sunrise", adhan: "5:33 AM", adhanDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-24_000)), iqamah: nil, iqamahDate: nil),
            MasjidPrayerEntry(key: "dhuhr", name: "Dhuhr", adhan: "1:42 PM", adhanDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3_000)), iqamah: "2:00 PM", iqamahDate: nil),
            MasjidPrayerEntry(key: "asr", name: "Asr", adhan: "6:01 PM", adhanDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(3_900)), iqamah: "6:30 PM", iqamahDate: nil),
            MasjidPrayerEntry(key: "maghrib", name: "Maghrib", adhan: "9:49 PM", adhanDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(17_000)), iqamah: "9:59 PM", iqamahDate: nil),
            MasjidPrayerEntry(key: "isha", name: "Isha", adhan: "11:19 PM", adhanDate: ISO8601DateFormatter().string(from: Date().addingTimeInterval(22_000)), iqamah: "11:24 PM", iqamahDate: nil)
        ],
        jumuah: [
            MasjidJumuahEntry(label: "First Jumu'ah", khutbah: "1:45 PM", iqamah: "1:45 PM"),
            MasjidJumuahEntry(label: "Second Jumu'ah", khutbah: "2:30 PM", iqamah: "2:30 PM")
        ],
        generatedAt: ISO8601DateFormatter().string(from: Date()),
        sourceUpdatedAt: ISO8601DateFormatter().string(from: Date()),
        expiresAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(43_200)),
        state: "fresh",
        upcomingEvent: "Community programme"
    )
}

enum MasjidDateParser {
    private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let standard = ISO8601DateFormatter()

    static func date(from value: String) -> Date? {
        fractional.date(from: value) ?? standard.date(from: value)
    }
}
