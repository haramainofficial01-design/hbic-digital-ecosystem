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
        widgetContent
        .padding(homeWidgetPadding)
        .widgetURL(URL(string: "hbiccalgary://prayer"))
        .containerBackground(for: .widget) {
            LinearGradient(
                colors: [Color(red: 0.02, green: 0.10, blue: 0.16), Color(red: 0.03, green: 0.31, blue: 0.35)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    @ViewBuilder private var widgetContent: some View {
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

    private var homeWidgetPadding: CGFloat {
        switch family {
        case .systemSmall:
            return 12
        case .systemMedium:
            return 14
        case .systemLarge:
            return 14
        default:
            return 0
        }
    }

    private var snapshot: MasjidPrayerSnapshot? {
        guard let value = entry.snapshot, value.hasUsableData else { return nil }
        return value
    }

    private var effectivePrayer: MasjidEffectivePrayer? {
        snapshot?.effectiveNextPrayer(at: entry.date)
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

    @ViewBuilder private var hijriLabel: some View {
        if let snapshot, !snapshot.hijriDate.isEmpty {
            HStack(spacing: 4) {
                Image(systemName: snapshot.isWhiteDay ? "moon.stars.fill" : "calendar")
                    .widgetAccentable()
                Text(snapshot.hijriDate)
                    .lineLimit(1)
            }
            .font(.caption2)
            .foregroundStyle(.secondary)
            .accessibilityLabel(
                snapshot.isWhiteDay
                    ? "Hijri date, \(snapshot.hijriDate), White Day, voluntary fasting reminder"
                    : "Hijri date, \(snapshot.hijriDate)"
            )
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
        if snapshot != nil, let effectivePrayer {
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
                Text(effectivePrayer.name)
                    .font(.title2.bold())
                    .minimumScaleFactor(0.75)
                Text(effectivePrayer.time)
                    .font(.headline.monospacedDigit())
                if let iqamah = effectivePrayer.iqamah {
                    Text("Iqamah \(iqamah)")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                Spacer(minLength: 2)
                if effectivePrayer.date > entry.date {
                    Text(effectivePrayer.date, style: .timer)
                        .font(.caption.bold().monospacedDigit())
                }
                hijriLabel
                staleLabel
            }
        } else {
            empty
        }
    }

    @ViewBuilder private var medium: some View {
        if let snapshot, let effectivePrayer {
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
                    Text(effectivePrayer.name)
                        .font(.title.bold())
                    Text("Adhan \(effectivePrayer.time)")
                        .font(.subheadline.bold())
                    if let iqamah = effectivePrayer.iqamah {
                        Text("Iqamah \(iqamah)")
                            .font(.subheadline)
                    }
                    if effectivePrayer.date > entry.date {
                        Text(effectivePrayer.date, style: .timer)
                            .font(.headline.monospacedDigit())
                    }
                    hijriLabel
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
                        .foregroundStyle(prayer.key == effectivePrayer.key ? .primary : .secondary)
                    }
                }
            }
        } else {
            empty
        }
    }

    @ViewBuilder private var large: some View {
        if let snapshot, let effectivePrayer {
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
                    VStack(alignment: .trailing, spacing: 2) {
                        hijriLabel
                        staleLabel
                    }
                }
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Next prayer")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(effectivePrayer.name)
                            .font(.title.bold())
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(effectivePrayer.time)
                            .font(.title3.bold().monospacedDigit())
                        if let iqamah = effectivePrayer.iqamah {
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
                        .fontWeight(prayer.key == effectivePrayer.key ? .bold : .regular)
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
                    if let notice = snapshot.jumuahState.notice, !notice.isEmpty {
                        Text(notice)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(2)
                    }
                }
            }
        } else {
            empty
        }
    }

    @ViewBuilder private var accessoryCircular: some View {
        if let snapshot, let effectivePrayer {
            Gauge(value: snapshot.progressToNextPrayer(at: entry.date)) {
                Image(systemName: "moon.stars.fill")
            } currentValueLabel: {
                VStack(spacing: 0) {
                    Text(String(effectivePrayer.name.prefix(3)))
                        .font(.caption2.bold())
                    Text(effectivePrayer.time.replacingOccurrences(of: " ", with: ""))
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
        if let snapshot, let effectivePrayer {
            VStack(alignment: .leading, spacing: 1) {
                Text("Next: \(effectivePrayer.name)")
                    .font(.headline)
                Text("Adhan \(effectivePrayer.time)")
                    .font(.caption)
                if let doorsClose = snapshot.jumuahDoorsCloseDateValue,
                   snapshot.isJumuahServiceDay(at: entry.date),
                   doorsClose > entry.date {
                    Text("First Jumu'ah doors close \(snapshot.jumuahState.firstDoorsCloseTime ?? "")")
                        .font(.caption2)
                        .lineLimit(1)
                } else if let iqamah = effectivePrayer.iqamah {
                    Text("Iqamah \(iqamah)")
                        .font(.caption2)
                }
                if !snapshot.hijriDate.isEmpty {
                    Text(snapshot.isWhiteDay ? "\(snapshot.hijriDate) · White Day" : snapshot.hijriDate)
                        .font(.caption2)
                        .lineLimit(1)
                }
            }
            .accessibilityElement(children: .combine)
        } else {
            Text("Open Masjid Bilal for prayer times")
        }
    }

    @ViewBuilder private var accessoryInline: some View {
        if snapshot != nil, let effectivePrayer {
            Label(
                snapshot?.isWhiteDay == true
                    ? "\(effectivePrayer.name) \(effectivePrayer.time) · White Day"
                    : "\(effectivePrayer.name) \(effectivePrayer.time)",
                systemImage: "moon.stars.fill"
            )
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
