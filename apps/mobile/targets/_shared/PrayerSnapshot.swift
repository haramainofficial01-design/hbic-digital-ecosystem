import Foundation

enum MasjidSharedData {
    static let appGroup = "group.ca.hbic.calgary.app"
    static let snapshotKey = "masjid_prayer_snapshot_v1"
    static let schemaVersion = 2
    static let supportedSchemaVersions = 1...2
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

struct MasjidJumuahState: Codable, Hashable {
    let enabled: Bool
    let serviceDate: String
    let firstDoorsCloseTime: String?
    let title: String?
    let notice: String?
    let titleUr: String?
    let noticeUr: String?
    let parkingNotice: String?
    let capacityNotice: String?
    let sessions: [MasjidJumuahEntry]
}

struct MasjidHijriState: Codable, Hashable {
    struct WhiteDay: Codable, Hashable {
        let gregorianDate: String
        let label: String
    }

    let day: Int
    let month: String
    let year: Int
    let label: String
    let gregorianDate: String
    let adjustmentDays: Int
    let isWhiteDay: Bool
    let upcomingWhiteDays: [WhiteDay]?
}

struct MasjidEventState: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let date: String
    let startTime: String
    let location: String
    let summary: String
    let category: String
}

struct MasjidAnnouncementState: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let body: String
    let priority: String
    let destination: String?
}

struct MasjidEffectivePrayer: Hashable {
    let key: String
    let name: String
    let time: String
    let date: Date
    let iqamah: String?
    let iqamahDate: Date?
    var kind: String = "Adhan"
    var adhanTime: String = ""
}

struct MasjidPrayerSnapshot: Codable, Hashable {
    let schemaVersion: Int
    let masjidID: String
    let masjidName: String
    let scheduleRevision: String
    let masjidTimeZoneIdentifier: String
    let serviceDate: String
    let timezone: String
    let scheduleDate: String
    let currentPrayerKey: String?
    let currentPrayer: MasjidPrayerEntry?
    let nextPrayerKey: String
    let nextPrayerName: String
    let nextPrayerTime: String
    let nextPrayerDate: String
    let tomorrowFajrDate: String?
    let tomorrowFajrIqamah: String?
    let nextIqamah: String?
    let nextIqamahDate: String?
    let prayers: [MasjidPrayerEntry]
    let jumuah: [MasjidJumuahEntry]
    let jumuahState: MasjidJumuahState
    let generatedAt: String
    let sourceUpdatedAt: String
    let expiresAt: String
    let state: String
    let availability: String
    let stale: Bool
    let staleReason: String?
    let upcomingEvent: String?
    let nextEvent: MasjidEventState?
    let importantAnnouncement: MasjidAnnouncementState?
    let hijri: MasjidHijriState?
    let hijriDate: String
    let isWhiteDay: Bool

    private enum CodingKeys: String, CodingKey {
        case schemaVersion
        case masjidID
        case masjidName
        case scheduleRevision
        case masjidTimeZoneIdentifier
        case serviceDate
        case timezone
        case scheduleDate
        case currentPrayerKey
        case currentPrayer
        case nextPrayerKey
        case nextPrayerName
        case nextPrayerTime
        case nextPrayerDate
        case tomorrowFajrDate
        case tomorrowFajrIqamah
        case nextIqamah
        case nextIqamahDate
        case prayers
        case jumuah
        case jumuahState
        case generatedAt
        case sourceUpdatedAt
        case expiresAt
        case state
        case availability
        case stale
        case staleReason
        case upcomingEvent
        case nextEvent
        case importantAnnouncement
        case hijri
        case hijriDate
        case isWhiteDay
    }

    init(
        schemaVersion: Int,
        masjidID: String,
        masjidName: String,
        timezone: String,
        scheduleDate: String,
        currentPrayerKey: String?,
        nextPrayerKey: String,
        nextPrayerName: String,
        nextPrayerTime: String,
        nextPrayerDate: String,
        nextIqamah: String?,
        nextIqamahDate: String?,
        prayers: [MasjidPrayerEntry],
        jumuah: [MasjidJumuahEntry],
        generatedAt: String,
        sourceUpdatedAt: String,
        expiresAt: String,
        state: String,
        upcomingEvent: String?,
        nextEvent: MasjidEventState? = nil,
        importantAnnouncement: MasjidAnnouncementState? = nil,
        hijriDate: String = "",
        isWhiteDay: Bool? = nil,
        scheduleRevision: String = "",
        masjidTimeZoneIdentifier: String = "",
        serviceDate: String = "",
        currentPrayer: MasjidPrayerEntry? = nil,
        tomorrowFajrDate: String? = nil,
        jumuahState: MasjidJumuahState? = nil,
        availability: String = "available",
        stale: Bool? = nil,
        staleReason: String? = nil,
        hijri: MasjidHijriState? = nil,
        tomorrowFajrIqamah: String? = nil
    ) {
        self.schemaVersion = schemaVersion
        self.masjidID = masjidID
        self.masjidName = masjidName
        self.scheduleRevision = scheduleRevision
        self.masjidTimeZoneIdentifier = masjidTimeZoneIdentifier.isEmpty ? timezone : masjidTimeZoneIdentifier
        self.serviceDate = serviceDate.isEmpty ? scheduleDate : serviceDate
        self.timezone = timezone
        self.scheduleDate = scheduleDate
        self.currentPrayerKey = currentPrayerKey
        self.currentPrayer = currentPrayer
        self.nextPrayerKey = nextPrayerKey
        self.nextPrayerName = nextPrayerName
        self.nextPrayerTime = nextPrayerTime
        self.nextPrayerDate = nextPrayerDate
        self.tomorrowFajrDate = tomorrowFajrDate
        self.tomorrowFajrIqamah = tomorrowFajrIqamah
        self.nextIqamah = nextIqamah
        self.nextIqamahDate = nextIqamahDate
        self.prayers = prayers
        self.jumuah = jumuah
        self.jumuahState = jumuahState ?? MasjidJumuahState(
            enabled: !jumuah.isEmpty,
            serviceDate: scheduleDate,
            firstDoorsCloseTime: nil,
            title: nil,
            notice: nil,
            titleUr: nil,
            noticeUr: nil,
            parkingNotice: nil,
            capacityNotice: nil,
            sessions: jumuah
        )
        self.generatedAt = generatedAt
        self.sourceUpdatedAt = sourceUpdatedAt
        self.expiresAt = expiresAt
        self.state = state
        self.availability = availability
        self.stale = stale ?? (state == "cached")
        self.staleReason = staleReason
        self.upcomingEvent = upcomingEvent
        self.nextEvent = nextEvent
        self.importantAnnouncement = importantAnnouncement
        self.hijri = hijri
        self.hijriDate = hijriDate.trimmingCharacters(in: .whitespacesAndNewlines)
        self.isWhiteDay = isWhiteDay ?? Self.whiteDay(from: self.hijriDate)
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        schemaVersion = try container.decode(Int.self, forKey: .schemaVersion)
        masjidID = try container.decode(String.self, forKey: .masjidID)
        masjidName = try container.decode(String.self, forKey: .masjidName)
        scheduleRevision = try container.decodeIfPresent(String.self, forKey: .scheduleRevision) ?? ""
        masjidTimeZoneIdentifier = try container.decodeIfPresent(String.self, forKey: .masjidTimeZoneIdentifier)
            ?? container.decodeIfPresent(String.self, forKey: .timezone)
            ?? "America/Edmonton"
        timezone = try container.decodeIfPresent(String.self, forKey: .timezone) ?? masjidTimeZoneIdentifier
        serviceDate = try container.decodeIfPresent(String.self, forKey: .serviceDate)
            ?? container.decodeIfPresent(String.self, forKey: .scheduleDate)
            ?? ""
        scheduleDate = try container.decodeIfPresent(String.self, forKey: .scheduleDate) ?? serviceDate
        currentPrayerKey = try container.decodeIfPresent(String.self, forKey: .currentPrayerKey)
        currentPrayer = try container.decodeIfPresent(MasjidPrayerEntry.self, forKey: .currentPrayer)
        nextPrayerKey = try container.decodeIfPresent(String.self, forKey: .nextPrayerKey) ?? ""
        nextPrayerName = try container.decodeIfPresent(String.self, forKey: .nextPrayerName) ?? "Prayer times"
        nextPrayerTime = try container.decodeIfPresent(String.self, forKey: .nextPrayerTime) ?? "Unavailable"
        nextPrayerDate = try container.decodeIfPresent(String.self, forKey: .nextPrayerDate) ?? ""
        tomorrowFajrDate = try container.decodeIfPresent(String.self, forKey: .tomorrowFajrDate)
        tomorrowFajrIqamah = try container.decodeIfPresent(String.self, forKey: .tomorrowFajrIqamah)
        nextIqamah = try container.decodeIfPresent(String.self, forKey: .nextIqamah)
        nextIqamahDate = try container.decodeIfPresent(String.self, forKey: .nextIqamahDate)
        prayers = try container.decodeIfPresent([MasjidPrayerEntry].self, forKey: .prayers) ?? []
        jumuah = try container.decodeIfPresent([MasjidJumuahEntry].self, forKey: .jumuah) ?? []
        jumuahState = try container.decodeIfPresent(MasjidJumuahState.self, forKey: .jumuahState)
            ?? MasjidJumuahState(
                enabled: !jumuah.isEmpty,
                serviceDate: scheduleDate,
                firstDoorsCloseTime: nil,
                title: nil,
                notice: nil,
                titleUr: nil,
                noticeUr: nil,
                parkingNotice: nil,
                capacityNotice: nil,
                sessions: jumuah
            )
        generatedAt = try container.decodeIfPresent(String.self, forKey: .generatedAt) ?? ""
        sourceUpdatedAt = try container.decodeIfPresent(String.self, forKey: .sourceUpdatedAt) ?? generatedAt
        expiresAt = try container.decodeIfPresent(String.self, forKey: .expiresAt) ?? ""
        state = try container.decodeIfPresent(String.self, forKey: .state) ?? "cached"
        availability = try container.decodeIfPresent(String.self, forKey: .availability)
            ?? (prayers.isEmpty ? "unavailable" : "available")
        stale = try container.decodeIfPresent(Bool.self, forKey: .stale) ?? (state == "cached")
        staleReason = try container.decodeIfPresent(String.self, forKey: .staleReason)
        upcomingEvent = try container.decodeIfPresent(String.self, forKey: .upcomingEvent)
        nextEvent = try container.decodeIfPresent(MasjidEventState.self, forKey: .nextEvent)
        importantAnnouncement = try container.decodeIfPresent(MasjidAnnouncementState.self, forKey: .importantAnnouncement)
        hijri = try container.decodeIfPresent(MasjidHijriState.self, forKey: .hijri)
        hijriDate = (try container.decodeIfPresent(String.self, forKey: .hijriDate))?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        isWhiteDay = try container.decodeIfPresent(Bool.self, forKey: .isWhiteDay) ?? Self.whiteDay(from: hijriDate)
    }

    private static func whiteDay(from hijriDate: String) -> Bool {
        let normalizedDigits = String(String.UnicodeScalarView(hijriDate.unicodeScalars.map { scalar in
            switch scalar.value {
            case 0x0660...0x0669:
                return UnicodeScalar(0x0030 + scalar.value - 0x0660)!
            case 0x06F0...0x06F9:
                return UnicodeScalar(0x0030 + scalar.value - 0x06F0)!
            default:
                return scalar
            }
        }))
        guard let dayText = normalizedDigits.split(whereSeparator: { !$0.isNumber }).first,
              let day = Int(dayText) else {
            return false
        }
        return (13...15).contains(day)
    }

    var nextPrayerDateValue: Date? { MasjidDateParser.date(from: nextPrayerDate) }
    var tomorrowFajrDateValue: Date? { tomorrowFajrDate.flatMap(MasjidDateParser.date(from:)) }
    var tomorrowFajrIqamahDateValue: Date? {
        guard let target = tomorrowFajrDateValue, let time = tomorrowFajrIqamah else { return nil }
        return MasjidDateParser.localDate(serviceDate: MasjidDateParser.serviceDate(target, timeZoneIdentifier: masjidTimeZoneIdentifier), time: time, timeZoneIdentifier: masjidTimeZoneIdentifier)
    }
    var generatedAtValue: Date? { MasjidDateParser.date(from: generatedAt) }
    var expiresAtValue: Date? { MasjidDateParser.date(from: expiresAt) }
    var jumuahDoorsCloseDateValue: Date? {
        guard jumuahState.enabled,
              let closeTime = jumuahState.firstDoorsCloseTime,
              !jumuahState.serviceDate.isEmpty else {
            return nil
        }
        return MasjidDateParser.localDate(
            serviceDate: jumuahState.serviceDate,
            time: closeTime,
            timeZoneIdentifier: masjidTimeZoneIdentifier
        )
    }

    func isJumuahServiceDay(at date: Date = Date()) -> Bool {
        guard jumuahState.enabled, !jumuahState.serviceDate.isEmpty else { return false }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = MasjidDateParser.resolvedTimeZone(date, identifier: masjidTimeZoneIdentifier)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date) == jumuahState.serviceDate
    }

    func jumuahSessionDate(_ session: MasjidJumuahEntry) -> Date? {
        MasjidDateParser.localDate(
            serviceDate: jumuahState.serviceDate,
            time: session.khutbah,
            timeZoneIdentifier: masjidTimeZoneIdentifier
        )
    }

    func upcomingJumuahSessions(at date: Date = Date()) -> [MasjidJumuahEntry] {
        jumuahState.sessions.filter { session in
            guard let sessionDate = jumuahSessionDate(session) else { return true }
            return sessionDate > date
        }
    }
    var hasUsableData: Bool {
        MasjidSharedData.supportedSchemaVersions.contains(schemaVersion)
            && availability != "unavailable"
            && !prayers.isEmpty
            && effectiveNextPrayer(at: Date()) != nil
    }

    func isStale(at date: Date = Date()) -> Bool {
        stale || state == "cached" || (expiresAtValue.map { $0 <= date } ?? true)
    }

    func effectiveNextPrayer(at date: Date = Date()) -> MasjidEffectivePrayer? {
        if let upcoming = prayers
            .filter({ $0.key != "sunrise" })
            .compactMap({ prayer -> MasjidEffectivePrayer? in
                guard let adhanDate = prayer.adhanDateValue else { return nil }
                let iqamahDate = prayer.iqamahDateValue
                let waitingForIqamah = adhanDate <= date && (iqamahDate.map { $0 > adhanDate && $0 > date } ?? false)
                guard adhanDate > date || waitingForIqamah else { return nil }
                return MasjidEffectivePrayer(
                    key: prayer.key,
                    name: prayer.name,
                    time: waitingForIqamah ? (prayer.iqamah ?? prayer.adhan) : prayer.adhan,
                    date: waitingForIqamah ? iqamahDate! : adhanDate,
                    iqamah: prayer.iqamah,
                    iqamahDate: iqamahDate,
                    kind: waitingForIqamah ? "Iqamah" : "Adhan",
                    adhanTime: prayer.adhan
                )
            })
            .sorted(by: { $0.date < $1.date })
            .first {
            return upcoming
        }

        guard let tomorrowFajrDateValue,
              let fajr = prayers.first(where: { $0.key == "fajr" }) else {
            return nil
        }
        let tomorrowIqamahDate = tomorrowFajrIqamahDateValue
        let waitingForIqamah = tomorrowFajrDateValue <= date && (tomorrowIqamahDate.map { $0 > tomorrowFajrDateValue && $0 > date } ?? false)
        guard tomorrowFajrDateValue > date || waitingForIqamah else { return nil }
        return MasjidEffectivePrayer(
            key: fajr.key,
            name: fajr.name,
            time: waitingForIqamah ? tomorrowFajrIqamah! : MasjidDateParser.displayTime(tomorrowFajrDateValue, timeZoneIdentifier: masjidTimeZoneIdentifier),
            date: waitingForIqamah ? tomorrowIqamahDate! : tomorrowFajrDateValue,
            iqamah: tomorrowFajrIqamah,
            iqamahDate: tomorrowIqamahDate,
            kind: waitingForIqamah ? "Iqamah" : "Adhan",
            adhanTime: MasjidDateParser.displayTime(tomorrowFajrDateValue, timeZoneIdentifier: masjidTimeZoneIdentifier)
        )
    }

    func countdownText(at date: Date = Date()) -> String {
        guard let target = effectiveNextPrayer(at: date)?.date else { return "Open app" }
        let interval = target.timeIntervalSince(date)
        if interval > 0 && interval < 60 { return "<1m" }
        let remaining = max(0, Int(interval))
        let hours = remaining / 3_600
        let minutes = (remaining % 3_600) / 60
        return hours > 0 ? "\(hours)h \(minutes)m" : "\(minutes)m"
    }

    func progressToNextPrayer(at date: Date = Date()) -> Double {
        guard let target = effectiveNextPrayer(at: date)?.date else { return 0 }
        let prayerDates = prayers.compactMap(\.adhanDateValue)
        let previous = prayerDates.filter { $0 <= date }.max()
            ?? prayerDates.max().flatMap { latest in
                var calendar = Calendar(identifier: .gregorian)
                calendar.timeZone = MasjidDateParser.resolvedTimeZone(latest, identifier: timezone)
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
        .filter { $0 > date } + [tomorrowFajrDateValue, tomorrowFajrIqamahDateValue, jumuahDoorsCloseDateValue]
            .compactMap { $0 }
            .filter { $0 > date }
            + jumuahState.sessions.compactMap(jumuahSessionDate).filter { $0 > date }

        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = MasjidDateParser.resolvedTimeZone(date, identifier: timezone)
        let midnight = calendar.nextDate(
            after: date,
            matching: DateComponents(hour: 0, minute: 0),
            matchingPolicy: .nextTime
        )

        return Array(Set(transitions + [midnight].compactMap { $0 })).sorted()
    }

    static func decode(_ data: Data) -> MasjidPrayerSnapshot? {
        guard let value = try? JSONDecoder().decode(MasjidPrayerSnapshot.self, from: data),
              MasjidSharedData.supportedSchemaVersions.contains(value.schemaVersion) else {
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

    /// Extensions use the same published resolver as the phone, never a second calculation.
    /// A bounded request also refreshes widgets while the phone app is closed.
    static func refreshedFromCanonicalSource() async -> MasjidPrayerSnapshot? {
        let cached = loadFromAppGroup()
        do {
            var request = URLRequest(url: URL(string: "https://hbic.ca/api/content/prayer-snapshot")!)
            request.timeoutInterval = 5
            request.cachePolicy = .reloadIgnoringLocalCacheData
            let (data, response) = try await URLSession.shared.data(for: request)
            struct Envelope: Decodable { let ok: Bool; let snapshot: MasjidPrayerSnapshot }
            guard (response as? HTTPURLResponse)?.statusCode == 200,
                  let envelope = try? JSONDecoder().decode(Envelope.self, from: data), envelope.ok,
                  MasjidSharedData.supportedSchemaVersions.contains(envelope.snapshot.schemaVersion),
                  envelope.snapshot.masjidID == "masjid-bilal-calgary",
                  envelope.snapshot.masjidTimeZoneIdentifier == "America/Edmonton" else { return cached }
            let incoming = envelope.snapshot
            if let existingDate = cached?.generatedAtValue, let incomingDate = incoming.generatedAtValue, incomingDate < existingDate { return cached }
            if let encoded = try? JSONEncoder().encode(incoming) {
                UserDefaults(suiteName: MasjidSharedData.appGroup)?.set(encoded, forKey: MasjidSharedData.snapshotKey)
            }
            return incoming
        } catch { return cached }
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
        upcomingEvent: "Youth Community Night",
        nextEvent: MasjidEventState(
            id: "preview-youth-night",
            title: "Youth Community Night",
            date: "2026-08-15",
            startTime: "7:00 PM",
            location: "Masjid Bilal",
            summary: "An evening of beneficial reminders and community connection.",
            category: "Youth"
        ),
        importantAnnouncement: MasjidAnnouncementState(
            id: "preview-announcement",
            title: "Jumu'ah parking reminder",
            body: "Please arrive early and follow the parking team on Friday.",
            priority: "High",
            destination: "/prayer"
        ),
        hijriDate: "14 Safar 1448 AH",
        isWhiteDay: true,
        hijri: MasjidHijriState(
            day: 14,
            month: "Safar",
            year: 1448,
            label: "14 Safar 1448 AH",
            gregorianDate: "2026-08-08",
            adjustmentDays: 0,
            isWhiteDay: true,
            upcomingWhiteDays: [
                MasjidHijriState.WhiteDay(gregorianDate: "2026-08-07", label: "13 Safar 1448 AH"),
                MasjidHijriState.WhiteDay(gregorianDate: "2026-08-08", label: "14 Safar 1448 AH"),
                MasjidHijriState.WhiteDay(gregorianDate: "2026-08-09", label: "15 Safar 1448 AH")
            ]
        )
    )
}

enum MasjidDateParser {
    // Match the shared canonical conversion on devices with older timezone databases.
    // Alberta remains UTC−6 from November 2026; historical DST remains intact.
    static func resolvedTimeZone(_ date: Date, identifier: String) -> TimeZone {
        if identifier == "America/Edmonton", date.timeIntervalSince1970 >= 1793520000 {
            return TimeZone(secondsFromGMT: -21600)!
        }
        return TimeZone(identifier: identifier) ?? TimeZone(identifier: "America/Edmonton")!
    }
    static func serviceDate(_ date: Date, timeZoneIdentifier: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = resolvedTimeZone(date, identifier: timeZoneIdentifier)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    static func displayTime(_ date: Date, timeZoneIdentifier: String) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = resolvedTimeZone(date, identifier: timeZoneIdentifier)
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: date)
    }
    private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let standard = ISO8601DateFormatter()

    static func date(from value: String) -> Date? {
        fractional.date(from: value) ?? standard.date(from: value)
    }

    static func localDate(serviceDate: String, time: String, timeZoneIdentifier: String) -> Date? {
        let formats = ["yyyy-MM-dd h:mm a", "yyyy-MM-dd hh:mm a", "yyyy-MM-dd HH:mm"]
        for format in formats {
            let formatter = DateFormatter()
            formatter.locale = Locale(identifier: "en_US_POSIX")
            formatter.calendar = Calendar(identifier: .gregorian)
            formatter.timeZone = timeZoneIdentifier == "America/Edmonton" && serviceDate >= "2026-11-01"
                ? TimeZone(secondsFromGMT: -21600)! : (TimeZone(identifier: timeZoneIdentifier) ?? .current)
            formatter.dateFormat = format
            if let value = formatter.date(from: "\(serviceDate) \(time)") {
                return value
            }
        }
        return nil
    }
}
