import SwiftUI
import WidgetKit

private let complicationKind = "MasjidPrayerComplications"
private let hijriComplicationKind = "MasjidHijriComplications"
private let jumuahComplicationKind = "MasjidJumuahComplications"
private let upcomingComplicationKind = "MasjidUpcomingComplications"

struct ComplicationEntry: TimelineEntry {
    let date: Date
    let snapshot: MasjidPrayerSnapshot?
}

struct ComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> ComplicationEntry {
        ComplicationEntry(date: Date(), snapshot: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (ComplicationEntry) -> Void) {
        completion(ComplicationEntry(date: Date(), snapshot: context.isPreview ? .preview : .loadFromAppGroup()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ComplicationEntry>) -> Void) {
        Task {
            let snapshot = await MasjidPrayerSnapshot.refreshedFromCanonicalSource()
            let now = Date()
            let dates = [now] + (snapshot?.timelineDates(after: now) ?? [])
            let entries = dates.map { ComplicationEntry(date: $0, snapshot: snapshot) }
            let refresh = max(now.addingTimeInterval(60), min(snapshot?.expiresAtValue ?? now.addingTimeInterval(1800), now.addingTimeInterval(1800)))
            completion(Timeline(entries: entries, policy: .after(refresh)))
        }
    }
}

struct PrayerComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    var body: some View {
        Group {
            switch family {
            case .accessoryCircular:
                circular
            case .accessoryRectangular:
                rectangular
            case .accessoryInline:
                inline
            #if os(watchOS)
            case .accessoryCorner:
                corner
            #endif
            default:
                rectangular
            }
        }
        .containerBackground(.clear, for: .widget)
        .widgetURL(URL(string: "hbiccalgary://prayer"))
    }

    private var snapshot: MasjidPrayerSnapshot? {
        guard let value = entry.snapshot, value.hasUsableData else { return nil }
        return value
    }

    private var effectivePrayer: MasjidEffectivePrayer? {
        snapshot?.effectiveNextPrayer(at: entry.date)
    }

    @ViewBuilder private var circular: some View {
        if let snapshot, let effectivePrayer {
            Gauge(value: snapshot.progressToNextPrayer(at: entry.date)) {
                Image(systemName: "moon.stars.fill")
            } currentValueLabel: {
                VStack(spacing: 0) {
                    Text(String(effectivePrayer.name.prefix(3)))
                        .font(.caption2.bold())
                    Text(timerInterval: entry.date...max(entry.date, effectivePrayer.date), countsDown: true)
                        .font(.system(size: 9, weight: .semibold, design: .rounded).monospacedDigit())
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                }
            }
            .gaugeStyle(.accessoryCircular)
            .widgetAccentable()
        } else {
            Image(systemName: "moon.stars")
        }
    }

    @ViewBuilder private var rectangular: some View {
        if let snapshot, let effectivePrayer {
            HStack(spacing: 7) {
                Image(systemName: "moon.stars.fill")
                    .widgetAccentable()
                VStack(alignment: .leading, spacing: 1) {
                    Text(effectivePrayer.name)
                        .font(.headline)
                    Text("\(effectivePrayer.kind) \(effectivePrayer.time)")
                        .font(.caption2)
                        .lineLimit(1)
                    if let doorsClose = snapshot.jumuahDoorsCloseDateValue,
                       snapshot.isJumuahServiceDay(at: entry.date),
                       doorsClose > entry.date {
                        Text("Doors close \(snapshot.jumuahState.firstDoorsCloseTime ?? "")")
                            .font(.caption2)
                            .lineLimit(1)
                    } else {
                        HStack(spacing: 4) {
                            Text(timerInterval: entry.date...max(entry.date, effectivePrayer.date), countsDown: true)
                                .font(.caption2.bold().monospacedDigit())
                                .lineLimit(1)
                            if let iqamah = effectivePrayer.iqamah {
                                Text("Iq \(iqamah)")
                                    .font(.caption2)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(
                snapshot.isWhiteDay
                    ? "Next prayer \(effectivePrayer.name), adhan \(effectivePrayer.time), White Day, voluntary fasting reminder"
                    : "Next prayer \(effectivePrayer.name), adhan \(effectivePrayer.time), Hijri date \(snapshot.hijriDate)"
            )
        } else {
            Text("Open Masjid Bilal for prayer times")
        }
    }

    @ViewBuilder private var inline: some View {
        if let snapshot, let effectivePrayer {
            Label(
                snapshot.isWhiteDay
                    ? "\(effectivePrayer.name) \(effectivePrayer.time) · White Day"
                    : "\(effectivePrayer.name) \(effectivePrayer.time)",
                systemImage: "moon.stars.fill"
            )
        } else {
            Label("Prayer times unavailable", systemImage: "moon.stars")
        }
    }

    @ViewBuilder private var corner: some View {
        if snapshot != nil, let effectivePrayer {
            Text(effectivePrayer.time)
                .font(.caption2.bold().monospacedDigit())
                .widgetLabel {
                    Text(effectivePrayer.name)
                }
        } else {
            Image(systemName: "moon.stars")
                .widgetLabel { Text("Masjid Bilal") }
        }
    }
}

struct MasjidPrayerComplication: Widget {
    private var supportedComplicationFamilies: [WidgetFamily] {
        #if os(watchOS)
        return [.accessoryCircular, .accessoryRectangular, .accessoryInline, .accessoryCorner]
        #else
        return [.accessoryCircular, .accessoryRectangular, .accessoryInline]
        #endif
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: complicationKind, provider: ComplicationProvider()) { entry in
            PrayerComplicationView(entry: entry)
        }
        .configurationDisplayName("Masjid Bilal Prayer")
        .description("See the next prayer and iqamah at a glance.")
        .supportedFamilies(supportedComplicationFamilies)
    }
}

struct HijriComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    var body: some View {
        let snapshot = entry.snapshot
        Group {
            switch family {
            case .accessoryCircular:
                VStack(spacing: 0) {
                    Image(systemName: snapshot?.isWhiteDay == true ? "moon.stars.fill" : "calendar")
                        .widgetAccentable()
                    Text(snapshot?.hijri.map { String($0.day) } ?? "—")
                        .font(.caption.bold())
                }
            case .accessoryInline:
                Label(snapshot?.hijriDate.isEmpty == false ? snapshot!.hijriDate : "Hijri date unavailable", systemImage: "moon.stars")
            default:
                VStack(alignment: .leading, spacing: 2) {
                    Label(snapshot?.isWhiteDay == true ? "White Day" : "Hijri date", systemImage: "moon.stars.fill")
                        .font(.headline)
                        .widgetAccentable()
                    Text(snapshot?.hijriDate.isEmpty == false ? snapshot!.hijriDate : "Open Masjid Bilal")
                        .font(.caption)
                        .lineLimit(1)
                }
            }
        }
        .containerBackground(.clear, for: .widget)
        .widgetURL(URL(string: "hbiccalgary://prayer"))
    }
}

struct MasjidHijriComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: hijriComplicationKind, provider: ComplicationProvider()) { entry in
            HijriComplicationView(entry: entry)
        }
        .configurationDisplayName("Masjid Bilal Hijri Date")
        .description("The shared Hijri date and White Day indicator.")
        .supportedFamilies([.accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}

struct JumuahComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ComplicationEntry

    private var snapshot: MasjidPrayerSnapshot? {
        guard let value = entry.snapshot, !value.jumuah.isEmpty else { return nil }
        return value
    }

    var body: some View {
        Group {
            if family == .accessoryInline {
                Label(inlineText, systemImage: "person.3.fill")
            } else if let snapshot {
                VStack(alignment: .leading, spacing: 2) {
                    Label(snapshot.isJumuahServiceDay(at: entry.date) ? "Jumu'ah Today" : "Next Jumu'ah", systemImage: "person.3.fill")
                        .font(.headline)
                        .widgetAccentable()
                    if let close = snapshot.jumuahState.firstDoorsCloseTime,
                       snapshot.isJumuahServiceDay(at: entry.date),
                       (snapshot.jumuahDoorsCloseDateValue ?? .distantPast) > entry.date {
                        Text("Doors close \(close)")
                            .font(.caption)
                    } else {
                        Text(snapshot.jumuah.map(\.khutbah).joined(separator: " · "))
                            .font(.caption.monospacedDigit())
                    }
                }
            } else {
                Text("Jumu'ah times unavailable")
            }
        }
        .containerBackground(.clear, for: .widget)
        .widgetURL(URL(string: "hbiccalgary://prayer"))
    }

    private var inlineText: String {
        guard let snapshot else { return "Jumu'ah times unavailable" }
        if snapshot.isJumuahServiceDay(at: entry.date),
           let close = snapshot.jumuahState.firstDoorsCloseTime,
           (snapshot.jumuahDoorsCloseDateValue ?? .distantPast) > entry.date {
            return "Jumu'ah · doors \(close)"
        }
        let firstKhutbah = snapshot.jumuah.first?.khutbah ?? "Open app"
        return "Jumu'ah · \(firstKhutbah)"
    }
}

struct MasjidJumuahComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: jumuahComplicationKind, provider: ComplicationProvider()) { entry in
            JumuahComplicationView(entry: entry)
        }
        .configurationDisplayName("Masjid Bilal Jumu'ah")
        .description("Jumu'ah sessions and the current doors-close notice.")
        .supportedFamilies([.accessoryRectangular, .accessoryInline])
    }
}

struct UpcomingComplicationView: View {
    let entry: ComplicationEntry

    var body: some View {
        Group {
            if let event = entry.snapshot?.nextEvent {
                VStack(alignment: .leading, spacing: 2) {
                    Label("Upcoming", systemImage: "calendar.badge.clock")
                        .font(.headline)
                        .widgetAccentable()
                    Text(event.title)
                        .font(.caption.bold())
                        .lineLimit(1)
                    Text("\(event.date) · \(event.startTime)")
                        .font(.caption2)
                        .lineLimit(1)
                }
            } else {
                Label("No upcoming event", systemImage: "calendar")
            }
        }
        .containerBackground(.clear, for: .widget)
        .widgetURL(URL(string: "hbiccalgary://events"))
    }
}

struct MasjidUpcomingComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: upcomingComplicationKind, provider: ComplicationProvider()) { entry in
            UpcomingComplicationView(entry: entry)
        }
        .configurationDisplayName("Masjid Bilal Upcoming")
        .description("The next confirmed published Masjid Bilal event.")
        .supportedFamilies([.accessoryRectangular])
    }
}

@main
struct MasjidPrayerComplicationBundle: WidgetBundle {
    var body: some Widget {
        MasjidPrayerComplication()
        MasjidHijriComplication()
        MasjidJumuahComplication()
        MasjidUpcomingComplication()
    }
}

#if os(watchOS)
#Preview("Circular", as: .accessoryCircular) {
    MasjidPrayerComplication()
} timeline: {
    ComplicationEntry(date: Date(), snapshot: .preview)
}

#Preview("Rectangular", as: .accessoryRectangular) {
    MasjidPrayerComplication()
} timeline: {
    ComplicationEntry(date: Date(), snapshot: .preview)
}
#endif
