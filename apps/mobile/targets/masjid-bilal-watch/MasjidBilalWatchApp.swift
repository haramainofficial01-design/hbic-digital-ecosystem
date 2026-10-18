import SwiftUI

@main
struct MasjidBilalWatchApp: App {
    @StateObject private var store = WatchPrayerStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            WatchLaunchView()
                .environmentObject(store)
                .task { await store.refreshIfNeeded() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active { Task { await store.refreshIfNeeded() } }
                }
        }
    }
}

private struct WatchLaunchView: View {
    var body: some View {
        #if DEBUG
        switch previewRoute {
        case "today": NavigationStack { DailyPrayerView() }
        case "jumuah": NavigationStack { JumuahWatchView() }
        case "community": NavigationStack { CommunityWatchView() }
        case "hijri": NavigationStack { HijriWatchView() }
        case "settings": NavigationStack { WatchSettingsView() }
        case "quran": NavigationStack { WatchQuranHome() }
        case "bilal": NavigationStack { WatchBilalView() }
        default: WatchHomeView()
        }
        #else
        WatchHomeView()
        #endif
    }

    #if DEBUG
    private var previewRoute: String? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "-MasjidPreviewScreen"), arguments.indices.contains(index + 1) else { return nil }
        return arguments[index + 1]
    }
    #endif
}
