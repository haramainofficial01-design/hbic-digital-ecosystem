import Foundation
import Combine
import CoreText
import AVFoundation

struct WatchQuranVerse: Decodable, Identifiable {
    let verseNumber: Int
    let textUthmani: String
    var id: Int { verseNumber }
}
struct WatchQuranChapter: Decodable, Identifiable {
    struct Details: Decodable {
        let id: Int
        let nameSimple: String
        let nameArabic: String
        let versesCount: Int
    }
    let chapter: Details
    let opening: String?
    let verses: [WatchQuranVerse]
    var id: Int { chapter.id }
}
private struct WatchQuranDataset: Decodable {
    let source: String
    let license: String
    let chapters: [WatchQuranChapter]
}
private struct WatchReciterCuration: Decodable {
    let makkah: [Int]
    let madinah: [Int]
    let popular: [Int]
}
struct WatchListeningReciter: Decodable, Identifiable {
    struct Edition: Decodable, Identifiable {
        let id: Int
        let name: String
        let server: String
        let rewaya_id: Int
        let surah_list: String
        var chapters: [Int] { surah_list.split(separator: ",").compactMap { Int($0) } }
    }
    let id: Int
    let name: String
    let moshaf: [Edition]
    var hafs: Edition? {
        moshaf.filter { $0.rewaya_id == 1 && Self.validServer($0.server)
            && !$0.chapters.isEmpty && $0.chapters.allSatisfy { (1...114).contains($0) }
            && Set($0.chapters).count == $0.chapters.count }
            .max { $0.chapters.count < $1.chapters.count }
    }
    static func validServer(_ value: String) -> Bool {
        guard let url = URL(string: value), let host = url.host else { return false }
        return url.scheme == "https" && (host == "mp3quran.net" || host.hasSuffix(".mp3quran.net"))
            && url.user == nil && url.password == nil && url.query == nil && url.fragment == nil
            && value.hasSuffix("/") // Foundation URL.path drops a trailing slash.
    }
    func audioURL(chapter: Int) -> URL? {
        guard let edition = hafs, edition.chapters.contains(chapter) else { return nil }
        return URL(string: edition.server + String(format: "%03d.mp3", chapter))
    }
}

@MainActor final class WatchQuranStore: ObservableObject {
    @Published private(set) var chapters: [WatchQuranChapter] = []
    @Published private(set) var reciters: [WatchListeningReciter] = []
    @Published private(set) var loading = false
    @Published private(set) var error: String?
    private var lastCatalog: Date?
    private var curation: WatchReciterCuration?

    nonisolated static func resource(_ name: String, extension ext: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: ext)
            ?? Bundle.main.url(forResource: name, withExtension: ext, subdirectory: "Resources")
    }
    func loadText() async {
        guard chapters.isEmpty else { return }
        do {
            let result = try await Task.detached(priority: .userInitiated) {
                guard let url = Self.resource("tanzil-uthmani", extension: "json") else { throw URLError(.fileDoesNotExist) }
                let result = try JSONDecoder().decode(WatchQuranDataset.self, from: Data(contentsOf: url))
                guard result.source == "Tanzil Project", result.license.contains("CHANGING IT IS NOT ALLOWED"),
                      result.chapters.count == 114,
                      result.chapters.reduce(0, { $0 + $1.verses.count }) == 6236,
                      result.chapters.enumerated().allSatisfy({ i, c in c.id == i + 1
                          && c.verses.count == c.chapter.versesCount
                          && c.verses.enumerated().allSatisfy { j, v in v.verseNumber == j + 1 && !v.textUthmani.isEmpty } })
                else { throw URLError(.cannotParseResponse) }
                return result
            }.value
            chapters = result.chapters
            if let font = Self.resource("NotoNaskhArabic", extension: "ttf") {
                CTFontManagerRegisterFontsForURL(font as CFURL, .process, nil)
            }
            if let url = Self.resource("reciter-curation", extension: "json") {
                curation = try JSONDecoder().decode(WatchReciterCuration.self, from: Data(contentsOf: url))
            }
        } catch { self.error = "Quran text could not load. Please reopen Quran & Recite." }
    }
    func group(for id: Int) -> String {
        if curation?.makkah.contains(id) == true { return "Masjid al-Haram" }
        if curation?.madinah.contains(id) == true { return "Masjid an-Nabawi" }
        if curation?.popular.contains(id) == true { return "Well-known reciters" }
        return "More reciters"
    }
    func loadReciters() async {
        guard !loading else { return }
        if let lastCatalog, Date().timeIntervalSince(lastCatalog) < 3600, !reciters.isEmpty { return }
        loading = true; error = nil
        defer { loading = false }
        do {
            struct Catalog: Decodable { let reciters: [WatchListeningReciter] }
            var request = URLRequest(url: URL(string: "https://www.mp3quran.net/api/v3/reciters?language=eng")!)
            request.timeoutInterval = 20
            let (data, response) = try await URLSession.shared.data(for: request)
            guard (response as? HTTPURLResponse)?.statusCode == 200, data.count < 2_000_000 else { throw URLError(.badServerResponse) }
            let list = try JSONDecoder().decode(Catalog.self, from: data).reciters.filter { $0.id > 0 && !$0.name.isEmpty && $0.hafs != nil }
            guard !list.isEmpty, list.count <= 2000, Set(list.map(\.id)).count == list.count else { throw URLError(.cannotParseResponse) }
            let order = ["Masjid al-Haram", "Masjid an-Nabawi", "Well-known reciters", "More reciters"]
            reciters = list.sorted {
                let a = order.firstIndex(of: group(for: $0.id)) ?? 3
                let b = order.firstIndex(of: group(for: $1.id)) ?? 3
                return a == b ? $0.name < $1.name : a < b
            }
            lastCatalog = Date()
        } catch {
            #if DEBUG
            print("HBIC Watch reciter catalog failed: \(error)")
            #endif
            self.error = "Recitations need an internet connection. Tap Try again."
        }
    }
}

@MainActor final class WatchQuranAudio: ObservableObject {
    @Published private(set) var title = ""
    @Published private(set) var reciter = ""
    @Published private(set) var playing = false
    @Published private(set) var elapsed: Double = 0
    @Published private(set) var duration: Double = 0
    @Published private(set) var error: String?
    private let player = AVPlayer()
    private var observer: Any?
    private var statusObserver: NSKeyValueObservation?
    private var itemObserver: NSKeyValueObservation?
    private var generation = 0
    private var loadTimeout: Task<Void, Never>?
    func updateVisibility(_ active: Bool) {
        if let observer { player.removeTimeObserver(observer); self.observer = nil }
        guard active else { return }
        // Native playback continues without a one-second app/watch refresh loop.
        observer = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 5, preferredTimescale: 1), queue: .main) { [weak self] time in
            Task { @MainActor in
                guard let self else { return }
                self.elapsed = time.seconds.isFinite ? time.seconds : 0
                let value = self.player.currentItem?.duration.seconds ?? 0
                self.duration = value.isFinite ? value : 0
            }
        }
    }
    func play(_ voice: WatchListeningReciter, chapter: WatchQuranChapter) {
        guard let url = voice.audioURL(chapter: chapter.id) else { error = "This recording is unavailable."; return }
        stop(); generation += 1; let token = generation
        title = chapter.chapter.nameSimple; reciter = voice.name; error = nil
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, policy: .longFormAudio)
            AVAudioSession.sharedInstance().activate(options: []) { [weak self] success, _ in
                Task { @MainActor in
                    guard let self, token == self.generation else { return }
                    guard success else { self.error = "Connect an audio device, then retry."; return }
                    let item = AVPlayerItem(url: url)
                    self.itemObserver = item.observe(\.status, options: [.new]) { [weak self] item, _ in
                        Task { @MainActor in
                            guard let self, token == self.generation else { return }
                            if item.status == .failed { self.error = "Recording could not play. Please retry."; self.playing = false }
                            if item.status == .readyToPlay { self.loadTimeout?.cancel(); self.loadTimeout = nil }
                        }
                    }
                    self.statusObserver = self.player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
                        Task { @MainActor in guard let self else { return }; self.playing = self.player.timeControlStatus == .playing }
                    }
                    self.player.replaceCurrentItem(with: item); self.player.play()
                    self.loadTimeout = Task { [weak self] in
                        try? await Task.sleep(for: .seconds(20))
                        guard !Task.isCancelled, let self, token == self.generation, item.status != .readyToPlay else { return }
                        self.player.pause(); self.error = "Audio could not load. Check your connection and retry."
                    }
                }
            }
        } catch { self.error = "Audio is unavailable. Please retry." }
    }
    func toggle() { if player.timeControlStatus == .playing { player.pause() } else { player.play() } }
    func pause() { player.pause(); playing = false }
    func seek(_ offset: Double) {
        let end = player.currentItem?.duration.seconds ?? 0
        guard end.isFinite, end > 0 else { return }
        player.seek(to: CMTime(seconds: min(end, max(0, player.currentTime().seconds + offset)), preferredTimescale: 600))
    }
    func stop() {
        generation += 1; loadTimeout?.cancel(); loadTimeout = nil
        player.pause(); player.replaceCurrentItem(with: nil)
        statusObserver = nil; itemObserver = nil
        playing = false; elapsed = 0; duration = 0; title = ""; reciter = ""; error = nil
    }
}
