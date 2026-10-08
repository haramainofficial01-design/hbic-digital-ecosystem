import SwiftUI

private enum WatchPalette {
    static let navy = Color(red: 0.015, green: 0.075, blue: 0.13)
    static let blue = Color(red: 0.035, green: 0.28, blue: 0.48)
    static let teal = Color(red: 0.05, green: 0.61, blue: 0.66)
    static let green = Color(red: 0.14, green: 0.58, blue: 0.34)
    static let gold = Color(red: 0.92, green: 0.73, blue: 0.34)
    static let coral = Color(red: 0.84, green: 0.35, blue: 0.28)
}

private struct WatchBackdrop: View {
    let prayerKey: String?
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency

    private var colors: [Color] {
        guard !isLuminanceReduced else { return [Color.black, WatchPalette.navy] }
        switch prayerKey {
        case "fajr": return [WatchPalette.navy, WatchPalette.blue.opacity(0.82)]
        case "dhuhr": return [WatchPalette.navy, WatchPalette.teal.opacity(0.68)]
        case "asr": return [WatchPalette.navy, Color(red: 0.28, green: 0.25, blue: 0.12)]
        case "maghrib": return [WatchPalette.navy, WatchPalette.coral.opacity(0.54)]
        case "isha": return [Color.black, WatchPalette.navy, WatchPalette.blue.opacity(0.42)]
        default: return [WatchPalette.navy, Color(red: 0.015, green: 0.21, blue: 0.24)]
        }
    }

    var body: some View {
        LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
            .overlay {
                if !isLuminanceReduced && !reduceTransparency {
                    Circle()
                        .fill(WatchPalette.gold.opacity(0.08))
                        .frame(width: 120, height: 120)
                        .blur(radius: 28)
                        .offset(x: 70, y: -92)
                }
            }
            .ignoresSafeArea()
    }
}

private extension View {
    @ViewBuilder
    func masjidGlassButtonStyle() -> some View {
        if #available(watchOS 26.0, *) {
            self.buttonStyle(.glass)
        } else {
            self.buttonStyle(.bordered)
        }
    }

    @ViewBuilder
    func masjidGlassSurface(cornerRadius: CGFloat = 18) -> some View {
        if #available(watchOS 26.0, *) {
            self.glassEffect(.regular, in: .rect(cornerRadius: cornerRadius))
        } else {
            self.background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        }
    }
}

private struct WatchBrandHeader: View {
    var body: some View {
        HStack(spacing: 7) {
            Image("MasjidMark")
                .resizable()
                .scaledToFit()
                .clipShape(Circle())
                .frame(width: 27, height: 27)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 0) {
                Text("Masjid Bilal")
                    .font(.caption.bold())
                    .foregroundStyle(.white)
                Text("Calgary")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundStyle(.white.opacity(0.62))
            }
            Spacer(minLength: 0)
        }
    }
}

struct WatchHomeView: View {
    @EnvironmentObject private var store: WatchPrayerStore
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isLuminanceReduced) private var isLuminanceReduced
    @AppStorage("watch.showCountdown") private var showCountdown = true
    @AppStorage("watch.showHijri") private var showHijri = true
    @AppStorage("watch.showWhiteDays") private var showWhiteDays = true

    var body: some View {
        NavigationStack {
            Group {
                if scenePhase == .active && !isLuminanceReduced {
                    TimelineView(.periodic(from: MasjidPrayerSnapshot.displayMinuteStart(), by: 60)) { context in
                        home(at: context.date)
                    }
                } else {
                    home(at: Date())
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .tint(WatchPalette.teal)
    }

    private func home(at now: Date) -> some View {
        let snapshot = store.snapshot
        let effective = snapshot?.effectiveNextPrayer(at: now)
        return ZStack {
            WatchBackdrop(prayerKey: effective?.key)
            ScrollView {
                VStack(spacing: 8) {
                    WatchBrandHeader()
                    prayerHero(snapshot: snapshot, effective: effective, now: now)
                    if let snapshot, snapshot.isJumuahServiceDay(at: now) {
                        fridayCard(snapshot: snapshot, now: now)
                    }
                    if showHijri, let snapshot, !snapshot.hijriDate.isEmpty {
                        hijriLink(snapshot: snapshot)
                    }
                    communityGlance(snapshot: snapshot)
                    navigation
                    freshness
                }
                .padding(.horizontal, 6)
                .padding(.bottom, 10)
            }
        }
        .animation(reduceMotion || isLuminanceReduced ? nil : .easeInOut(duration: 0.24), value: effective?.key)
    }

    @ViewBuilder
    private func prayerHero(
        snapshot: MasjidPrayerSnapshot?,
        effective: MasjidEffectivePrayer?,
        now: Date
    ) -> some View {
        if let snapshot, snapshot.hasUsableData, let effective {
            VStack(alignment: .leading, spacing: 7) {
                HStack(alignment: .center, spacing: 8) {
                    Gauge(value: snapshot.progressToNextPrayer(at: now)) {
                        Text("Next prayer")
                    } currentValueLabel: {
                        Image(systemName: prayerSymbol(effective.key))
                            .foregroundStyle(WatchPalette.gold)
                    }
                    .gaugeStyle(.accessoryCircularCapacity)
                    .tint(WatchPalette.teal)
                    .frame(width: 46, height: 46)
                    .accessibilityHidden(true)

                    VStack(alignment: .leading, spacing: 0) {
                        Text("NEXT \(effective.kind.uppercased())")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(.white.opacity(0.6))
                        Text(effective.name)
                            .font(.system(size: 25, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                        Text(effective.time)
                            .font(.system(size: 17, weight: .bold, design: .rounded).monospacedDigit())
                            .foregroundStyle(.white)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                        if showCountdown && !isLuminanceReduced && scenePhase == .active {
                            Text(snapshot.countdownText(at: now))
                                .font(.system(size: 12, weight: .bold, design: .rounded).monospacedDigit())
                                .foregroundStyle(WatchPalette.gold)
                                .lineLimit(1)
                                .minimumScaleFactor(0.72)
                        }
                    }
                    Spacer(minLength: 0)
                }

                if let iqamah = effective.iqamah {
                    HStack(spacing: 7) {
                        VStack(alignment: .leading, spacing: 1) {
                            Text("ADHAN")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(.white.opacity(0.58))
                            Text(effective.adhanTime)
                                .font(.system(size: 10, weight: .semibold, design: .rounded).monospacedDigit())
                        }
                        Divider().frame(height: 24)
                        VStack(alignment: .leading, spacing: 1) {
                            Text("IQAMAH")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(.white.opacity(0.58))
                            Text(iqamah)
                                .font(.system(size: 10, weight: .semibold, design: .rounded).monospacedDigit())
                        }
                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(.white.opacity(0.82))
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("Adhan \(effective.adhanTime), iqamah \(iqamah)")
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .frame(maxWidth: .infinity)
            .masjidGlassSurface()
            .accessibilityElement(children: .combine)
            .accessibilityLabel(
                "Next prayer, \(effective.name), at \(effective.time), \(snapshot.countdownText(at: now)) remaining"
                + (effective.iqamah.map { ", iqamah \($0)" } ?? "")
            )
        } else {
            VStack(spacing: 8) {
                Image(systemName: "clock.badge.questionmark")
                    .font(.title2)
                    .foregroundStyle(WatchPalette.gold)
                Text("Prayer times unavailable")
                    .font(.headline)
                    .multilineTextAlignment(.center)
                Text("Open Masjid Bilal on your iPhone to sync.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                Button { Task { await store.refresh() } } label: {
                    Label(store.isRefreshing ? "Refreshing" : "Try again", systemImage: "arrow.clockwise")
                }
                .masjidGlassButtonStyle()
                .controlSize(.small)
                .disabled(store.isRefreshing)
            }
            .frame(maxWidth: .infinity)
            .padding(10)
            .masjidGlassSurface()
        }
    }

    private func fridayCard(snapshot: MasjidPrayerSnapshot, now: Date) -> some View {
        NavigationLink {
            JumuahWatchView()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "person.3.fill")
                    .foregroundStyle(WatchPalette.gold)
                VStack(alignment: .leading, spacing: 1) {
                    Text("Jumu'ah Today")
                        .font(.caption.bold())
                    if let closeTime = snapshot.jumuahState.firstDoorsCloseTime,
                       let closeDate = snapshot.jumuahDoorsCloseDateValue,
                       closeDate > now {
                        Text("Doors close \(closeTime)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else if let nextSession = snapshot.upcomingJumuahSessions(at: now).first {
                        Text("\(nextSession.label) · \(nextSession.khutbah)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.caption2.bold())
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 9)
            .padding(.vertical, 7)
            .frame(maxWidth: .infinity)
        }
        .masjidGlassButtonStyle()
    }

    private func hijriLink(snapshot: MasjidPrayerSnapshot) -> some View {
        NavigationLink {
            HijriWatchView()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: snapshot.isWhiteDay && showWhiteDays ? "moon.stars.fill" : "calendar")
                    .foregroundStyle(snapshot.isWhiteDay && showWhiteDays ? WatchPalette.gold : WatchPalette.teal)
                Text(snapshot.isWhiteDay && showWhiteDays ? "White Day · \(snapshot.hijriDate)" : snapshot.hijriDate)
                    .font(.system(size: 10, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Spacer(minLength: 0)
                Image(systemName: "chevron.right")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
        }
        .masjidGlassButtonStyle()
        .accessibilityLabel(
            snapshot.isWhiteDay && showWhiteDays
                ? "Hijri date, \(snapshot.hijriDate), White Day, voluntary fasting reminder"
                : "Hijri date, \(snapshot.hijriDate)"
        )
    }

    @ViewBuilder
    private func communityGlance(snapshot: MasjidPrayerSnapshot?) -> some View {
        if let announcement = snapshot?.importantAnnouncement {
            NavigationLink {
                CommunityWatchView()
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: "bell.badge.fill")
                        .foregroundStyle(announcement.priority == "Urgent" ? WatchPalette.coral : WatchPalette.gold)
                    Text(announcement.title)
                        .font(.caption2.bold())
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 6)
            }
            .masjidGlassButtonStyle()
        } else if let event = snapshot?.nextEvent {
            NavigationLink {
                CommunityWatchView()
            } label: {
                HStack(spacing: 7) {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(WatchPalette.teal)
                    Text(event.title)
                        .font(.caption2.bold())
                        .lineLimit(1)
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 9)
                .padding(.vertical, 6)
            }
            .masjidGlassButtonStyle()
        }
    }

    @ViewBuilder private var navigation: some View {
        if #available(watchOS 26.0, *) {
            GlassEffectContainer(spacing: 6) { navigationContent }
        } else {
            navigationContent
        }
    }

    private var navigationContent: some View {
        VStack(spacing: 6) {
            NavigationLink { WatchQuranHome() } label: {
                Label("Quran & Recite", systemImage: "book.closed.fill").frame(maxWidth: .infinity)
            }
            .masjidGlassButtonStyle()
            HStack(spacing: 6) {
                NavigationLink { DailyPrayerView() } label: {
                    Label("Today", systemImage: "list.bullet.rectangle")
                        .frame(maxWidth: .infinity)
                }
                .masjidGlassButtonStyle()
                NavigationLink { JumuahWatchView() } label: {
                    Label("Jumu'ah", systemImage: "person.3.fill")
                        .frame(maxWidth: .infinity)
                }
                .masjidGlassButtonStyle()
            }
            HStack(spacing: 6) {
                NavigationLink { CommunityWatchView() } label: {
                    Label("Community", systemImage: "heart.text.square.fill")
                        .frame(maxWidth: .infinity)
                }
                .masjidGlassButtonStyle()
                NavigationLink { WatchSettingsView() } label: {
                    Label("More", systemImage: "ellipsis.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .masjidGlassButtonStyle()
            }
        }
        .font(.caption2.bold())
    }

    @ViewBuilder private var freshness: some View {
        if store.isShowingCachedData {
            Label("Prayer information may be outdated", systemImage: "clock.arrow.circlepath")
                .font(.system(size: 9))
                .foregroundStyle(.white.opacity(0.64))
        } else if let message = store.refreshMessage {
            Text(message)
                .font(.system(size: 9))
                .foregroundStyle(.white.opacity(0.64))
                .multilineTextAlignment(.center)
        }
    }

    private func prayerSymbol(_ key: String) -> String {
        switch key {
        case "fajr": return "sun.horizon.fill"
        case "dhuhr": return "sun.max.fill"
        case "asr": return "sun.min.fill"
        case "maghrib": return "sunset.fill"
        default: return "moon.stars.fill"
        }
    }

    private func countdownLabel(_ value: String) -> String {
        value == "<1m" ? "In <1m" : "In \(value)"
    }
}

struct DailyPrayerView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop(prayerKey: store.snapshot?.nextPrayerKey)
            ScrollView {
                TimelineView(.periodic(from: Date(), by: 60)) { context in
                    LazyVStack(spacing: 6) {
                        if let snapshot = store.snapshot, !snapshot.prayers.isEmpty {
                            let effectiveKey = snapshot.effectiveNextPrayer(at: context.date)?.key
                            let currentKey = snapshot.prayers
                                .filter { $0.key != "sunrise" && ($0.adhanDateValue ?? .distantFuture) <= context.date }
                                .max { ($0.adhanDateValue ?? .distantPast) < ($1.adhanDateValue ?? .distantPast) }?.key
                            ForEach(snapshot.prayers) { prayer in
                                prayerRow(
                                    prayer,
                                    isNext: prayer.key == effectiveKey,
                                    isCurrent: prayer.key == currentKey,
                                    isPassed: (prayer.adhanDateValue ?? .distantFuture) <= context.date
                                )
                            }
                        } else {
                            Label("Prayer times unavailable", systemImage: "clock.badge.questionmark")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .padding(.top, 18)
                        }
                    }
                }
                .padding(.horizontal, 5)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle("Today")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func prayerRow(
        _ prayer: MasjidPrayerEntry,
        isNext: Bool,
        isCurrent: Bool,
        isPassed: Bool
    ) -> some View {
        HStack(spacing: 8) {
            Image(systemName: prayer.key == "sunrise" ? "sunrise.fill" : isNext ? "arrow.forward.circle.fill" : "circle.fill")
                .font(prayer.key == "sunrise" || isNext ? .caption : .system(size: 5))
                .foregroundStyle(isNext ? WatchPalette.gold : prayer.key == "sunrise" ? WatchPalette.teal : .white.opacity(isPassed ? 0.3 : 0.65))
                .frame(width: 15)
            VStack(alignment: .leading, spacing: 1) {
                Text(prayer.name)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                    .minimumScaleFactor(0.76)
                Text(prayer.key == "sunrise" ? "Schedule marker" : isNext ? "NEXT" : isCurrent ? "CURRENT" : isPassed ? "PASSED" : "LATER")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(isNext ? WatchPalette.gold : .secondary)
            }
            Spacer(minLength: 2)
            VStack(alignment: .trailing, spacing: 1) {
                Text(prayer.adhan)
                    .font(.system(size: 11, weight: .bold, design: .rounded).monospacedDigit())
                if let iqamah = prayer.iqamah {
                    Text("Iqamah \(iqamah)")
                        .font(.system(size: 9, weight: .semibold, design: .rounded).monospacedDigit())
                        .foregroundStyle(isNext ? WatchPalette.gold : .secondary)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .background(
            isNext ? WatchPalette.teal.opacity(0.2) : .white.opacity(isPassed ? 0.035 : 0.065),
            in: RoundedRectangle(cornerRadius: 13, style: .continuous)
        )
        .opacity(isPassed && !isCurrent ? 0.7 : 1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(
            prayer.key == "sunrise"
                ? "Sunrise, \(prayer.adhan), schedule marker"
                : "\(prayer.name). Adhan \(prayer.adhan)\(prayer.iqamah.map { ". Iqamah \($0)" } ?? "")"
        )
    }
}

struct JumuahWatchView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop(prayerKey: "dhuhr")
            ScrollView {
                TimelineView(.periodic(from: Date(), by: 60)) { context in
                    VStack(spacing: 8) {
                        Image(systemName: "person.3.fill")
                            .font(.title3)
                            .foregroundStyle(WatchPalette.gold)
                        if let snapshot = store.snapshot, !snapshot.jumuah.isEmpty {
                            serviceContext(snapshot, now: context.date)
                            ForEach(snapshot.jumuah) { item in
                                sessionRow(snapshot, item: item, now: context.date)
                            }
                            notices(snapshot, now: context.date)
                        } else {
                            Text("Jumu'ah times are unavailable.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding(.horizontal, 5)
                    .padding(.bottom, 8)
                }
            }
        }
        .navigationTitle("Jumu'ah")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func serviceContext(_ snapshot: MasjidPrayerSnapshot, now: Date) -> some View {
        VStack(spacing: 2) {
            Text(snapshot.isJumuahServiceDay(at: now) ? "Jumu'ah Today" : "Next Jumu'ah")
                .font(.headline)
            Text(formattedDate(snapshot.jumuahState.serviceDate))
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func sessionRow(_ snapshot: MasjidPrayerSnapshot, item: MasjidJumuahEntry, now: Date) -> some View {
        let sessionDate = snapshot.jumuahSessionDate(item)
        let passed = sessionDate.map { $0 <= now } ?? false
        return HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.label)
                    .font(.subheadline.bold())
                Text(passed && snapshot.isJumuahServiceDay(at: now) ? "Completed" : "Khutbah")
                    .font(.system(size: 9))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(item.khutbah)
                    .font(.headline.monospacedDigit())
                    .foregroundStyle(passed ? .secondary : WatchPalette.gold)
                if item.iqamah != item.khutbah {
                    Text("Salah \(item.iqamah)")
                        .font(.system(size: 9).monospacedDigit())
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 8)
        .background(.white.opacity(passed ? 0.035 : 0.07), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
        .opacity(passed ? 0.68 : 1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(item.label), khutbah \(item.khutbah), salah \(item.iqamah)")
    }

    @ViewBuilder
    private func notices(_ snapshot: MasjidPrayerSnapshot, now: Date) -> some View {
        if let closeTime = snapshot.jumuahState.firstDoorsCloseTime,
           let closeDate = snapshot.jumuahDoorsCloseDateValue,
           closeDate > now,
           snapshot.isJumuahServiceDay(at: now) {
            VStack(alignment: .leading, spacing: 4) {
                Label("Doors close at \(closeTime)", systemImage: "door.left.hand.closed")
                    .font(.caption.bold())
                    .foregroundStyle(WatchPalette.gold)
                Text(snapshot.jumuahState.notice ?? "Please arrive early.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                if let parking = snapshot.jumuahState.parkingNotice, !parking.isEmpty {
                    Label(parking, systemImage: "parkingsign.circle")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(9)
            .frame(maxWidth: .infinity, alignment: .leading)
            .masjidGlassSurface(cornerRadius: 13)
        }
    }

    private func formattedDate(_ value: String) -> String {
        let input = DateFormatter()
        input.locale = Locale(identifier: "en_US_POSIX")
        input.dateFormat = "yyyy-MM-dd"
        guard let date = input.date(from: value) else { return value }
        return date.formatted(.dateTime.weekday(.wide).month(.abbreviated).day())
    }
}

struct HijriWatchView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop(prayerKey: store.snapshot?.nextPrayerKey)
            ScrollView {
                VStack(spacing: 9) {
                    if let snapshot = store.snapshot, let hijri = snapshot.hijri {
                        Image(systemName: hijri.isWhiteDay ? "moon.stars.fill" : "calendar")
                            .font(.title2)
                            .foregroundStyle(hijri.isWhiteDay ? WatchPalette.gold : WatchPalette.teal)
                        Text(hijri.label)
                            .font(.headline)
                            .multilineTextAlignment(.center)
                        Text(hijri.gregorianDate)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        if hijri.isWhiteDay {
                            VStack(spacing: 2) {
                                Text("White Day")
                                    .font(.caption.bold())
                                    .foregroundStyle(WatchPalette.gold)
                                Text("Voluntary fasting day")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .padding(8)
                            .frame(maxWidth: .infinity)
                            .masjidGlassSurface(cornerRadius: 13)
                        }
                        if let upcoming = hijri.upcomingWhiteDays, !upcoming.isEmpty {
                            Text("Upcoming White Days")
                                .font(.caption.bold())
                                .frame(maxWidth: .infinity, alignment: .leading)
                            ForEach(upcoming, id: \.gregorianDate) { day in
                                HStack {
                                    Image(systemName: "moon.circle.fill")
                                        .foregroundStyle(WatchPalette.gold)
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text(day.label)
                                            .font(.caption.bold())
                                            .lineLimit(1)
                                        Text(day.gregorianDate)
                                            .font(.caption2)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer(minLength: 0)
                                }
                                .padding(7)
                                .background(.white.opacity(0.055), in: RoundedRectangle(cornerRadius: 11))
                            }
                        }
                    } else {
                        Text("Hijri date unavailable")
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal, 5)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle("Hijri")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct CommunityWatchView: View {
    @EnvironmentObject private var store: WatchPrayerStore

    var body: some View {
        ZStack {
            WatchBackdrop(prayerKey: store.snapshot?.nextPrayerKey)
            ScrollView {
                VStack(spacing: 9) {
                    Image(systemName: "heart.text.square.fill")
                        .font(.title2)
                        .foregroundStyle(WatchPalette.teal)
                    if let announcement = store.snapshot?.importantAnnouncement {
                        VStack(alignment: .leading, spacing: 4) {
                            Label(announcement.priority, systemImage: "bell.badge.fill")
                                .font(.caption2.bold())
                                .foregroundStyle(announcement.priority == "Urgent" ? WatchPalette.coral : WatchPalette.gold)
                            Text(announcement.title)
                                .font(.headline)
                            Text(announcement.body)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .lineLimit(4)
                        }
                        .padding(9)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .masjidGlassSurface(cornerRadius: 14)
                    }
                    if let event = store.snapshot?.nextEvent {
                        NavigationLink {
                            EventWatchView(event: event)
                        } label: {
                            VStack(alignment: .leading, spacing: 3) {
                                Label("Upcoming", systemImage: "calendar.badge.clock")
                                    .font(.caption2.bold())
                                    .foregroundStyle(WatchPalette.gold)
                                Text(event.title)
                                    .font(.headline)
                                    .lineLimit(2)
                                Text("\(event.date) · \(event.startTime)")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                        }
                        .masjidGlassButtonStyle()
                    }
                    if store.snapshot?.importantAnnouncement == nil && store.snapshot?.nextEvent == nil {
                        VStack(spacing: 4) {
                            Text("No urgent community updates")
                                .font(.caption.bold())
                            Text("Prayer and Jumu'ah information remains available here on Watch.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(9)
                    }
                    Link(destination: URL(string: "hbiccalgary://community")!) {
                        Label("Open on iPhone", systemImage: "iphone.and.arrow.forward")
                            .frame(maxWidth: .infinity)
                    }
                    .masjidGlassButtonStyle()
                }
                .padding(.horizontal, 5)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle("Community")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct EventWatchView: View {
    let event: MasjidEventState

    private var deepLink: URL {
        let encoded = event.id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? event.id
        return URL(string: "hbiccalgary://event-detail?id=\(encoded)")!
    }

    var body: some View {
        ZStack {
            WatchBackdrop(prayerKey: nil)
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    Label(event.category, systemImage: "calendar.badge.clock")
                        .font(.caption2.bold())
                        .foregroundStyle(WatchPalette.gold)
                    Text(event.title)
                        .font(.headline)
                    Label("\(event.date) · \(event.startTime)", systemImage: "clock")
                        .font(.caption)
                    Label(event.location, systemImage: "mappin.and.ellipse")
                        .font(.caption)
                    Text(event.summary)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Link(destination: deepLink) {
                        Label("Open on iPhone", systemImage: "iphone.and.arrow.forward")
                            .frame(maxWidth: .infinity)
                    }
                    .masjidGlassButtonStyle()
                }
                .padding(.horizontal, 7)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle("Upcoming")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct WatchSettingsView: View {
    @EnvironmentObject private var store: WatchPrayerStore
    @AppStorage("watch.showCountdown") private var showCountdown = true
    @AppStorage("watch.showHijri") private var showHijri = true
    @AppStorage("watch.showWhiteDays") private var showWhiteDays = true

    var body: some View {
        ZStack {
            WatchBackdrop(prayerKey: store.snapshot?.nextPrayerKey)
            ScrollView {
                VStack(spacing: 8) {
                    Toggle("Countdown", isOn: $showCountdown)
                    Toggle("Hijri date", isOn: $showHijri)
                    Toggle("White Days", isOn: $showWhiteDays)

                    Button {
                        Task { await store.refresh() }
                    } label: {
                        Label(store.isRefreshing ? "Refreshing" : "Refresh times", systemImage: "arrow.clockwise")
                            .font(.subheadline.bold())
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity)
                    }
                    .masjidGlassButtonStyle()
                    .disabled(store.isRefreshing)

                    if let message = store.refreshMessage {
                        Text(message)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    } else if store.isShowingCachedData {
                        Label("Prayer information may be outdated", systemImage: "clock.arrow.circlepath")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    } else if store.hasUsableData {
                        Label("Prayer times are up to date", systemImage: "checkmark.circle.fill")
                            .font(.caption2)
                            .foregroundStyle(WatchPalette.teal)
                    }

                    Link(destination: URL(string: "hbiccalgary://settings")!) {
                        Label("Manage on iPhone", systemImage: "iphone")
                            .frame(maxWidth: .infinity)
                    }
                    .masjidGlassButtonStyle()
                }
                .padding(.horizontal, 5)
                .padding(.bottom, 8)
            }
        }
        .navigationTitle("More")
        .navigationBarTitleDisplayMode(.inline)
    }
}
