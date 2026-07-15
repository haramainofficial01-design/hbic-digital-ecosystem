import SwiftUI

private enum WatchPalette {
    static let navy = Color(red: 0.02, green: 0.10, blue: 0.16)
    static let teal = Color(red: 0.05, green: 0.61, blue: 0.66)
    static let gold = Color(red: 0.92, green: 0.73, blue: 0.34)
}

private struct WatchBackdrop: View {
    var body: some View {
        LinearGradient(
            colors: [WatchPalette.navy, Color(red: 0.02, green: 0.24, blue: 0.27)],
            startPoint: .top,
            endPoint: .bottom
        )
        .ignoresSafeArea()
    }
}

struct WatchHomeView: View {
    @EnvironmentObject private var store: WatchPrayerStore
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        NavigationStack {
            ZStack {
                WatchBackdrop()

                ScrollView {
                    VStack(spacing: 7) {
                        brandHeader
                        nextPrayer
                        navigation
                        freshness
                    }
                    .padding(.horizontal, 6)
                    .padding(.bottom, 8)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .animation(reduceMotion ? nil : .easeInOut(duration: 0.25), value: store.snapshot?.nextPrayerKey)
        }
        .tint(WatchPalette.teal)
    }

    private var brandHeader: some View {
        HStack(spacing: 7) {
            Image("MasjidMark")
                .resizable()
                .scaledToFit()
                .clipShape(Circle())
                .frame(width: 28, height: 28)
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 0) {
                Text("MASJID BILAL")
                    .font(.caption2.bold())
                    .foregroundStyle(.white)
                Text("Calgary")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.62))
            }
            Spacer(minLength: 0)
        }
    }

    @ViewBuilder private var nextPrayer: some View {
        if let snapshot = store.snapshot, snapshot.hasUsableData {
            TimelineView(.periodic(from: Date(), by: 60)) { context in
                VStack(spacing: 6) {
                    HStack(spacing: 9) {
                        Gauge(value: snapshot.progressToNextPrayer(at: context.date)) {
                            Text("Next prayer")
                        } currentValueLabel: {
                            Image(systemName: "moon.stars.fill")
                                .foregroundStyle(WatchPalette.gold)
                        }
                        .gaugeStyle(.accessoryCircularCapacity)
                        .tint(WatchPalette.teal)
                        .frame(width: 48, height: 48)

                        VStack(alignment: .leading, spacing: 1) {
                            Text("NEXT PRAYER")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(.white.opacity(0.58))
                            Text(snapshot.nextPrayerName)
                                .font(.system(.title2, design: .rounded, weight: .bold))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                            Text(snapshot.countdownText(at: context.date))
                                .font(.system(.subheadline, design: .rounded, weight: .semibold))
                                .foregroundStyle(WatchPalette.gold)
                                .monospacedDigit()
                        }
                        Spacer(minLength: 0)
                    }

                    HStack(spacing: 6) {
                        timePill(label: "Adhan", value: snapshot.nextPrayerTime, color: WatchPalette.teal)
                        if let iqamah = snapshot.nextIqamah {
                            timePill(label: "Iqamah", value: iqamah, color: WatchPalette.gold)
                        }
                    }
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 7)
                .frame(maxWidth: .infinity)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .accessibilityElement(children: .combine)
                .accessibilityLabel("Next prayer \(snapshot.nextPrayerName), adhan \(snapshot.nextPrayerTime), \(snapshot.countdownText(at: context.date)) remaining")
            }
        } else {
            VStack(spacing: 6) {
                HStack(spacing: 7) {
                    Image(systemName: "clock.badge.questionmark")
                        .font(.title3)
                        .foregroundStyle(WatchPalette.gold)
                    Text("Prayer times unavailable")
                        .font(.subheadline.bold())
                        .multilineTextAlignment(.leading)
                }
                Button { Task { await store.refresh() } } label: {
                    Label(store.isRefreshing ? "Refreshing" : "Try again", systemImage: "arrow.clockwise")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .disabled(store.isRefreshing)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private func timePill(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 1) {
            Text(label)
                .font(.system(size: 9, weight: .medium))
                .foregroundStyle(.white.opacity(0.6))
            Text(value)
                .font(.caption2.bold().monospacedDigit())
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 5)
        .background(.white.opacity(0.07), in: Capsule())
    }

    private var navigation: some View {
        VStack(spacing: 5) {
            NavigationLink {
                DailyPrayerView()
            } label: {
                Label("Today's prayers", systemImage: "list.bullet.rectangle")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            NavigationLink {
                JumuahWatchView()
            } label: {
                Label("Jumu'ah", systemImage: "person.3.fill")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            HStack(spacing: 5) {
                NavigationLink {
                    CommunityWatchView()
                } label: {
                    Image(systemName: "heart.text.square.fill")
                        .accessibilityLabel("Community")
                }
                NavigationLink {
                    WatchSettingsView()
                } label: {
                    Image(systemName: "gearshape.fill")
                        .accessibilityLabel("Settings")
                }
            }
        }
        .buttonStyle(.bordered)
    }

    @ViewBuilder private var freshness: some View {
        if store.isShowingCachedData {
            Label("Showing last updated times", systemImage: "clock.arrow.circlepath")
                .font(.system(size: 9))
                .foregroundStyle(.white.opacity(0.62))
        } else if let message = store.refreshMessage {
            Text(message)
                .font(.system(size: 9))
                .foregroundStyle(.white.opacity(0.62))
                .multilineTextAlignment(.center)
        }
    }
}

struct DailyPrayerView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop()
            ScrollView {
                LazyVStack(spacing: 6) {
                    if let snapshot = store.snapshot, !snapshot.prayers.isEmpty {
                        ForEach(snapshot.prayers) { prayer in
                            HStack(spacing: 8) {
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(prayer.name)
                                        .font(.subheadline.bold())
                                        .lineLimit(1)
                                        .minimumScaleFactor(0.78)
                                        .layoutPriority(1)
                                    if prayer.key == snapshot.nextPrayerKey {
                                        Text("NEXT")
                                            .font(.system(size: 8, weight: .bold))
                                            .foregroundStyle(WatchPalette.gold)
                                    }
                                }
                                Spacer(minLength: 2)
                                VStack(alignment: .trailing, spacing: 1) {
                                    Text("Adhan  \(prayer.adhan)")
                                    if let iqamah = prayer.iqamah {
                                        Text("Iqamah  \(iqamah)")
                                            .foregroundStyle(prayer.key == snapshot.nextPrayerKey ? WatchPalette.gold : .secondary)
                                    }
                                }
                                .font(.system(size: 10, weight: .semibold, design: .rounded).monospacedDigit())
                            }
                            .padding(.horizontal, 9)
                            .padding(.vertical, 7)
                            .background(
                                prayer.key == snapshot.nextPrayerKey ? WatchPalette.teal.opacity(0.18) : .white.opacity(0.055),
                                in: RoundedRectangle(cornerRadius: 12, style: .continuous)
                            )
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel("\(prayer.name), adhan \(prayer.adhan)\(prayer.iqamah.map { ", iqamah \($0)" } ?? "")")
                        }
                    } else {
                        Label("Prayer times unavailable", systemImage: "clock.badge.questionmark")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.top, 18)
                    }
                }
                .padding(.horizontal, 5)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle("Today")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct JumuahWatchView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop()
            ScrollView {
                VStack(spacing: 9) {
                    Image(systemName: "person.3.fill")
                        .font(.title3)
                        .foregroundStyle(WatchPalette.gold)
                    if let entries = store.snapshot?.jumuah, !entries.isEmpty {
                        ForEach(entries) { item in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.label)
                                        .font(.subheadline.bold())
                                    Text("Khutbah")
                                        .font(.system(size: 9))
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text(item.khutbah)
                                        .font(.headline.monospacedDigit())
                                        .foregroundStyle(WatchPalette.gold)
                                    if item.iqamah != item.khutbah {
                                        Text("Iqamah \(item.iqamah)")
                                            .font(.system(size: 9).monospacedDigit())
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                            .padding(.horizontal, 9)
                            .padding(.vertical, 8)
                            .background(.white.opacity(0.065), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                        }
                    } else {
                        Text("Jumu'ah times are unavailable.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 5)
            }
        }
        .navigationTitle("Jumu'ah")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CommunityWatchView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop()
            ScrollView {
                VStack(spacing: 10) {
                    Image(systemName: "heart.text.square.fill")
                        .font(.title2)
                        .foregroundStyle(WatchPalette.teal)
                    Text("Hazrat Bilal Islamic Centre")
                        .font(.headline)
                        .multilineTextAlignment(.center)
                    if let event = store.snapshot?.upcomingEvent {
                        VStack(spacing: 3) {
                            Text("UPCOMING")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(WatchPalette.gold)
                            Text(event)
                                .font(.caption)
                                .multilineTextAlignment(.center)
                        }
                    }
                    Link(destination: URL(string: "https://hbic-calgary.vercel.app/events")!) {
                        Label("View events", systemImage: "arrow.up.right")
                    }
                }
            }
        }
        .navigationTitle("Community")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct WatchSettingsView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop()
            ScrollView {
                VStack(spacing: 8) {
                    Button {
                        Task { await store.refresh() }
                    } label: {
                        Label(store.isRefreshing ? "Refreshing…" : "Refresh times", systemImage: "arrow.clockwise")
                            .font(.subheadline.bold())
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity)
                            .frame(minHeight: 40)
                            .background(WatchPalette.teal.opacity(0.18), in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .disabled(store.isRefreshing)

                    if store.isShowingCachedData {
                        Label("Showing last updated times", systemImage: "clock.arrow.circlepath")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if store.hasUsableData {
                        Label("Prayer times are up to date", systemImage: "checkmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(WatchPalette.teal)
                    }
                }
                .padding(.horizontal, 5)
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}
