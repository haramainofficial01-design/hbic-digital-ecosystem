import SwiftUI
import WidgetKit

private let complicationKind = "MasjidPrayerComplications"

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
        let now = Date()
        let snapshot = MasjidPrayerSnapshot.loadFromAppGroup()
        let dates = [now] + (snapshot?.timelineDates(after: now).map { $0.addingTimeInterval(1) } ?? [])
        let entries = dates.map { ComplicationEntry(date: $0, snapshot: snapshot) }
        let refresh = dates.last ?? now.addingTimeInterval(900)
        completion(Timeline(entries: entries, policy: .after(refresh)))
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
            case .accessoryCorner:
                corner
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

    @ViewBuilder private var circular: some View {
        if let snapshot {
            Gauge(value: snapshot.progressToNextPrayer(at: entry.date)) {
                Image(systemName: "moon.stars.fill")
            } currentValueLabel: {
                VStack(spacing: 0) {
                    Text(String(snapshot.nextPrayerName.prefix(3)))
                        .font(.caption2.bold())
                    Text(snapshot.countdownText(at: entry.date))
                        .font(.system(size: 8, weight: .semibold, design: .rounded))
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
        if let snapshot {
            HStack(spacing: 7) {
                Image(systemName: "moon.stars.fill")
                    .widgetAccentable()
                VStack(alignment: .leading, spacing: 1) {
                    Text(snapshot.nextPrayerName)
                        .font(.headline)
                    Text("Adhan \(snapshot.nextPrayerTime)")
                        .font(.caption2)
                    if let iqamah = snapshot.nextIqamah {
                        Text("Iqamah \(iqamah)")
                            .font(.caption2)
                    }
                }
            }
        } else {
            Text("Open Masjid Bilal for prayer times")
        }
    }

    @ViewBuilder private var inline: some View {
        if let snapshot {
            Label("\(snapshot.nextPrayerName) \(snapshot.nextPrayerTime)", systemImage: "moon.stars.fill")
        } else {
            Label("Prayer times unavailable", systemImage: "moon.stars")
        }
    }

    @ViewBuilder private var corner: some View {
        if let snapshot {
            Text(snapshot.nextPrayerTime)
                .font(.caption2.bold().monospacedDigit())
                .widgetLabel {
                    Text(snapshot.nextPrayerName)
                }
        } else {
            Image(systemName: "moon.stars")
                .widgetLabel { Text("Masjid Bilal") }
        }
    }
}

struct MasjidPrayerComplication: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: complicationKind, provider: ComplicationProvider()) { entry in
            PrayerComplicationView(entry: entry)
        }
        .configurationDisplayName("Masjid Bilal Prayer")
        .description("See the next prayer and iqamah at a glance.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
            .accessoryCorner
        ])
    }
}

@main
struct MasjidPrayerComplicationBundle: WidgetBundle {
    var body: some Widget {
        MasjidPrayerComplication()
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
