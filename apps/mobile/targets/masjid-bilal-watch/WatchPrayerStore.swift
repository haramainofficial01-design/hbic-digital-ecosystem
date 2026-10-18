import Foundation
import WatchConnectivity
import WatchKit
import WidgetKit

@MainActor
final class WatchPrayerStore: ObservableObject {
    @Published private(set) var snapshot: MasjidPrayerSnapshot?
    @Published private(set) var isRefreshing = false
    @Published private(set) var refreshMessage: String?

    private let receiver: WatchSnapshotReceiver
    private let endpoint = URL(string: "https://hbic.ca/api/content/prayer-snapshot")!
    private var lastRefreshAttempt: Date?

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
            Task { @MainActor in self?.accept(data: data) }
        }
        receiver.activate()
    }

    var hasUsableData: Bool { snapshot?.hasUsableData == true }
    var isShowingCachedData: Bool { snapshot?.isStale() == true }

    func refreshIfNeeded() async {
        let now = Date()
        if let lastRefreshAttempt, now.timeIntervalSince(lastRefreshAttempt) < 60 { return }
        if let snapshot, !snapshot.isStale(at: now), snapshot.hasUsableData,
           let generatedAt = snapshot.generatedAtValue,
           now.timeIntervalSince(generatedAt) >= 0,
           now.timeIntervalSince(generatedAt) < 300 { return }
        await refresh(playFeedback: false)
    }

    func refresh(playFeedback: Bool = true) async {
        guard !isRefreshing else { return }
        lastRefreshAttempt = Date()
        isRefreshing = true
        refreshMessage = nil
        defer { isRefreshing = false }

        if let phoneData = await receiver.latestSnapshotFromPhone(), accept(data: phoneData), snapshot?.isStale() == false {
            if playFeedback { WKInterfaceDevice.current().play(.success) }
            return
        }

        do {
            var request = URLRequest(url: endpoint)
            request.timeoutInterval = 8
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                throw URLError(.badServerResponse)
            }
            let result = try JSONDecoder().decode(PrayerSnapshotResponse.self, from: data)
            guard result.ok else { throw URLError(.cannotParseResponse) }
            if accept(snapshot: result.snapshot) {
                if playFeedback { WKInterfaceDevice.current().play(.success) }
            }
        } catch {
            refreshMessage = snapshot == nil
                ? "Open Masjid Bilal on your iPhone to sync."
                : "iPhone unavailable. Using the most recent schedule."
        }
    }

    @discardableResult
    private func accept(data: Data) -> Bool {
        guard let incoming = MasjidPrayerSnapshot.decode(data) else { return false }
        return accept(snapshot: incoming)
    }

    @discardableResult
    private func accept(snapshot incoming: MasjidPrayerSnapshot) -> Bool {
        if let current = snapshot,
           let currentDate = current.generatedAtValue,
           let incomingDate = incoming.generatedAtValue,
           incomingDate < currentDate {
            return false
        }

        guard let encoded = try? JSONEncoder().encode(incoming) else { return false }
        let defaults = UserDefaults(suiteName: MasjidSharedData.appGroup)
        if defaults?.data(forKey: MasjidSharedData.snapshotKey) == encoded {
            snapshot = incoming
            refreshMessage = nil
            return true
        }
        defaults?.set(encoded, forKey: MasjidSharedData.snapshotKey)
        snapshot = incoming
        refreshMessage = nil
        WidgetCenter.shared.reloadTimelines(ofKind: "MasjidPrayerComplications")
        return true
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

    func latestSnapshotFromPhone() async -> Data? {
        guard WCSession.isSupported() else { return nil }
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable else { return nil }

        return await withCheckedContinuation { continuation in
            session.sendMessage(
                ["request": "prayerSnapshot"],
                replyHandler: { reply in
                    let json = reply["prayerSnapshot"] as? String
                    continuation.resume(returning: json?.data(using: .utf8))
                },
                errorHandler: { _ in continuation.resume(returning: nil) }
            )
        }
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        if let language = applicationContext["bilalLanguage"] as? String, ["en", "ur", "fa-AF", "ar"].contains(language) {
            UserDefaults.standard.set(language, forKey: "watch.bilal.language")
        }
        guard
            (applicationContext["schemaVersion"] as? Int).map(MasjidSharedData.supportedSchemaVersions.contains) == true,
            let json = applicationContext["prayerSnapshot"] as? String,
            let data = json.data(using: .utf8)
        else {
            return
        }
        onSnapshot?(data)
    }
}
