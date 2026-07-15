import SwiftUI
import WidgetKit

private let prayerWidgetKind = "MasjidPrayerWidgets"

struct PrayerTimelineEntry: TimelineEntry {
    let date: Date
    let snapshot: MasjidPrayerSnapshot?
}

struct PrayerTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> PrayerTimelineEntry {
        PrayerTimelineEntry(date: Date(), snapshot: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (PrayerTimelineEntry) -> Void) {
        completion(PrayerTimelineEntry(date: Date(), snapshot: context.isPreview ? .preview : .loadFromAppGroup()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PrayerTimelineEntry>) -> Void) {
        let now = Date()
        let snapshot = MasjidPrayerSnapshot.loadFromAppGroup()
        let dates = [now] + (snapshot?.timelineDates(after: now).map { $0.addingTimeInterval(1) } ?? [])
        let entries = dates.map { PrayerTimelineEntry(date: $0, snapshot: snapshot) }
        completion(Timeline(entries: entries, policy: .after(dates.last ?? now.addingTimeInterval(900))))
    }
}

struct MasjidPrayerWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: PrayerTimelineEntry

    var body: some View {
        Group {
            switch family {
            case .accessoryCircular:
                accessoryCircular
            case .accessoryRectangular:
                accessoryRectangular
            case .accessoryInline:
                accessoryInline
            case .systemMedium:
                medium
            case .systemLarge:
                large
            default:
                small
            }
        }
        .widgetURL(URL(string: "hbiccalgary://prayer"))
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [Color(red: 0.02, green: 0.10, blue: 0.16), Color(red: 0.03, green: 0.31, blue: 0.35)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    private var snapshot: MasjidPrayerSnapshot? {
        guard let value = entry.snapshot, value.hasUsableData else { return nil }
        return value
    }

    private var staleLabel: some View {
        Group {
            if snapshot?.isStale(at: entry.date) == true {
                Label("Updated earlier", systemImage: "clock.arrow.circlepath")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var empty: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image("MasjidMark")
                .resizable()
                .scaledToFit()
                .clipShape(Circle())
                .frame(width: 30, height: 30)
            Text("Masjid Bilal")
                .font(.headline)
            Text("Open the app to load prayer times.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    @ViewBuilder private var small: some View {
        if let snapshot {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 5) {
                    Image("MasjidMark")
                        .resizable()
                        .scaledToFit()
                        .clipShape(Circle())
                        .frame(width: 18, height: 18)
                    Text("Next prayer")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.teal)
                }
                Text(snapshot.nextPrayerName)
                    .font(.title2.bold())
                    .minimumScaleFactor(0.75)
                Text(snapshot.nextPrayerTime)
                    .font(.headline.monospacedDigit())
                if let iqamah = snapshot.nextIqamah {
                    Text("Iqamah \(iqamah)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 2)
                if let target = snapshot.nextPrayerDateValue, target > entry.date {
                    Text(target, style: .timer)
                        .font(.caption.bold().monospacedDigit())
                }
                staleLabel
            }
        } else {
            empty
        }
    }

    @ViewBuilder private var medium: some View {
        if let snapshot {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 5) {
                        Image("MasjidMark")
                            .resizable()
                            .scaledToFit()
                            .clipShape(Circle())
                            .frame(width: 20, height: 20)
                        Text("MASJID BILAL")
                            .font(.caption2.bold())
                            .foregroundStyle(.teal)
                    }
                    Text(snapshot.nextPrayerName)
                        .font(.title.bold())
                    Text("Adhan \(snapshot.nextPrayerTime)")
                        .font(.subheadline.bold())
                    if let iqamah = snapshot.nextIqamah {
                        Text("Iqamah \(iqamah)")
                            .font(.subheadline)
                    }
                    if let target = snapshot.nextPrayerDateValue, target > entry.date {
                        Text(target, style: .timer)
                            .font(.headline.monospacedDigit())
                    }
                    staleLabel
                }
                Divider().overlay(.white.opacity(0.18))
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(snapshot.prayers.prefix(4)) { prayer in
                        HStack {
                            Text(prayer.name)
                            Spacer()
                            Text(prayer.adhan)
                                .monospacedDigit()
                        }
                        .font(.caption)
                        .foregroundStyle(prayer.key == snapshot.nextPrayerKey ? .primary : .secondary)
                    }
                }
            }
        } else {
            empty
        }
    }

    @ViewBuilder private var large: some View {
        if let snapshot {
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    HStack(spacing: 6) {
                        Image("MasjidMark")
                            .resizable()
                            .scaledToFit()
                            .clipShape(Circle())
                            .frame(width: 22, height: 22)
                        Text("Masjid Bilal")
                            .font(.headline)
                            .foregroundStyle(.teal)
                    }
                    Spacer()
                    staleLabel
                }
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Next prayer")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(snapshot.nextPrayerName)
                            .font(.title.bold())
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(snapshot.nextPrayerTime)
                            .font(.title3.bold().monospacedDigit())
                        if let iqamah = snapshot.nextIqamah {
                            Text("Iqamah \(iqamah)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                Divider().overlay(.white.opacity(0.18))
                Grid(horizontalSpacing: 10, verticalSpacing: 7) {
                    GridRow {
                        Text("Prayer").gridColumnAlignment(.leading)
                        Text("Adhan").gridColumnAlignment(.trailing)
                        Text("Iqamah").gridColumnAlignment(.trailing)
                    }
                    .font(.caption2.bold())
                    .foregroundStyle(.secondary)
                    ForEach(snapshot.prayers) { prayer in
                        GridRow {
                            Text(prayer.name)
                            Text(prayer.adhan).monospacedDigit()
                            Text(prayer.iqamah ?? "—").monospacedDigit()
                        }
                        .font(.caption)
                        .fontWeight(prayer.key == snapshot.nextPrayerKey ? .bold : .regular)
                    }
                }
                if !snapshot.jumuah.isEmpty {
                    Divider().overlay(.white.opacity(0.18))
                    HStack {
                        Text("Jumu'ah")
                            .font(.caption.bold())
                        Spacer()
                        Text(snapshot.jumuah.map(\.khutbah).joined(separator: "  •  "))
                            .font(.caption.monospacedDigit())
                    }
                }
            }
        } else {
            empty
        }
    }

    @ViewBuilder private var accessoryCircular: some View {
        if let snapshot {
            Gauge(value: snapshot.progressToNextPrayer(at: entry.date)) {
                Image(systemName: "moon.stars.fill")
            } currentValueLabel: {
                VStack(spacing: 0) {
                    Text(String(snapshot.nextPrayerName.prefix(3)))
                        .font(.caption2.bold())
                    Text(snapshot.nextPrayerTime.replacingOccurrences(of: " ", with: ""))
                        .font(.system(size: 8, weight: .semibold, design: .rounded))
                        .minimumScaleFactor(0.6)
                }
            }
            .gaugeStyle(.accessoryCircular)
            .widgetAccentable()
        } else {
            Image(systemName: "moon.stars")
        }
    }

    @ViewBuilder private var accessoryRectangular: some View {
        if let snapshot {
            VStack(alignment: .leading, spacing: 1) {
                Text("Next: \(snapshot.nextPrayerName)")
                    .font(.headline)
                Text("Adhan \(snapshot.nextPrayerTime)")
                    .font(.caption)
                if let iqamah = snapshot.nextIqamah {
                    Text("Iqamah \(iqamah)")
                        .font(.caption2)
                }
            }
        } else {
            Text("Open Masjid Bilal for prayer times")
        }
    }

    @ViewBuilder private var accessoryInline: some View {
        if let snapshot {
            Label("\(snapshot.nextPrayerName) \(snapshot.nextPrayerTime)", systemImage: "moon.stars.fill")
        } else {
            Label("Prayer times unavailable", systemImage: "moon.stars")
        }
    }
}

struct MasjidPrayerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: prayerWidgetKind, provider: PrayerTimelineProvider()) { entry in
            MasjidPrayerWidgetView(entry: entry)
        }
        .configurationDisplayName("Masjid Bilal Prayer Times")
        .description("Next prayer, adhan, iqamah, and today's schedule.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

@main
struct MasjidPrayerWidgetBundle: WidgetBundle {
    var body: some Widget {
        MasjidPrayerWidget()
    }
}

#Preview("Small", as: .systemSmall) {
    MasjidPrayerWidget()
} timeline: {
    PrayerTimelineEntry(date: Date(), snapshot: .preview)
}

#Preview("Medium", as: .systemMedium) {
    MasjidPrayerWidget()
} timeline: {
    PrayerTimelineEntry(date: Date(), snapshot: .preview)
}

#Preview("Large", as: .systemLarge) {
    MasjidPrayerWidget()
} timeline: {
    PrayerTimelineEntry(date: Date(), snapshot: .preview)
}

#Preview("Lock Screen", as: .accessoryRectangular) {
    MasjidPrayerWidget()
} timeline: {
    PrayerTimelineEntry(date: Date(), snapshot: .preview)
}
