import Foundation
import WatchConnectivity
import WidgetKit

@MainActor
final class WatchPrayerStore: ObservableObject {
    @Published private(set) var snapshot: MasjidPrayerSnapshot?
    @Published private(set) var isRefreshing = false
    @Published private(set) var refreshMessage: String?

    private let receiver: WatchSnapshotReceiver
    private let endpoint = URL(string: "https://hbic-calgary.vercel.app/api/content/prayer-snapshot")!

    init() {
        #if DEBUG
        snapshot = ProcessInfo.processInfo.arguments.contains("-MasjidUsePreviewData")
            ? .preview
            : MasjidPrayerSnapshot.loadFromAppGroup()
        #else
        snapshot = MasjidPrayerSnapshot.loadFromAppGroup()
        #endif
        receiver = WatchSnapshotReceiver()
        receiver.onSnapshot = { [weak self] data in
            Task { @MainActor in self?.accept(data: data, state: "fresh") }
        }
        receiver.activate()
    }

    var hasUsableData: Bool { snapshot?.hasUsableData == true }
    var isShowingCachedData: Bool { snapshot?.isStale() == true }

    func refreshIfNeeded() async {
        if snapshot == nil || snapshot?.isStale() == true {
            await refresh()
        }
    }

    func refresh() async {
        guard !isRefreshing else { return }
        isRefreshing = true
        refreshMessage = nil
        defer { isRefreshing = false }

        do {
            let (data, response) = try await URLSession.shared.data(from: endpoint)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            let result = try JSONDecoder().decode(PrayerSnapshotResponse.self, from: data)
            guard result.ok else { throw URLError(.cannotParseResponse) }
            accept(snapshot: result.snapshot)
        } catch {
            refreshMessage = snapshot == nil ? "Prayer times are temporarily unavailable." : "Showing last updated times."
        }
    }

    private func accept(data: Data, state: String) {
        guard let incoming = MasjidPrayerSnapshot.decode(data) else { return }
        accept(snapshot: incoming)
    }

    private func accept(snapshot incoming: MasjidPrayerSnapshot) {
        if let current = snapshot,
           let currentDate = current.generatedAtValue,
           let incomingDate = incoming.generatedAtValue,
           incomingDate < currentDate {
            return
        }

        guard let encoded = try? JSONEncoder().encode(incoming) else { return }
        UserDefaults(suiteName: MasjidSharedData.appGroup)?.set(encoded, forKey: MasjidSharedData.snapshotKey)
        snapshot = incoming
        refreshMessage = nil
        WidgetCenter.shared.reloadTimelines(ofKind: "MasjidPrayerComplications")
    }
}

private struct PrayerSnapshotResponse: Decodable {
    let ok: Bool
    let snapshot: MasjidPrayerSnapshot
}

private final class WatchSnapshotReceiver: NSObject, WCSessionDelegate {
    var onSnapshot: ((Data) -> Void)?

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        guard
            applicationContext["schemaVersion"] as? Int == MasjidSharedData.schemaVersion,
            let json = applicationContext["prayerSnapshot"] as? String,
            let data = json.data(using: .utf8)
        else {
            return
        }
        onSnapshot?(data)
    }
}
