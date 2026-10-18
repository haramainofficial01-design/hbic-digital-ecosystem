import Foundation

// Explicit opt-in: the real Watch model talks only to HBIC's public endpoint.
// Run on a Mac with WatchBilalModel.swift. This is not Watch hardware/UI proof.
@main struct WatchBilalLiveCheck {
    @MainActor static func main() async throws {
        guard ProcessInfo.processInfo.environment["HBIC_LIVE_PUBLIC_BILAL_TEST"] == "1" else {
            print("Skipped: set HBIC_LIVE_PUBLIC_BILAL_TEST=1 for an authorized public endpoint check.")
            return
        }
        func require(_ value: Bool, _ message: String) { precondition(value, message) }
        func finish(_ store: WatchBilalStore) async {
            for _ in 0..<80 {
                if !store.busy { return }
                try? await Task.sleep(nanoseconds: 250_000_000)
            }
            store.deactivate()
            preconditionFailure("Public endpoint did not settle within 20 seconds")
        }
        let store = WatchBilalStore()
        store.activate(); await finish(store)
        require(store.available, "Live remote activation failed")
        for language in WatchBilalLanguage.allCases {
            store.clear(); store.ask("Contact the masjid", language: language); await finish(store)
            require(store.reply?.valid == true && store.errorKey == nil, "Live public answer did not validate")
            require(store.reply?.sources.contains(where: { $0.url?.path == "/contact" }) == true, "Canonical contact source missing")
            require(store.reply?.answer.contains("587-917-0333") == true, "Published office contact missing")
            print("Live public Watch model: \(language.rawValue) validated, canonical source present.")
        }
        store.deactivate()
        require(!store.available && !store.busy && store.reply == nil, "Session did not clear")
        print("Passed: live Swift model/API integration, 4 languages, session clearing. No user data or audio used; not a physical Watch battery/UI test.")
    }
}
