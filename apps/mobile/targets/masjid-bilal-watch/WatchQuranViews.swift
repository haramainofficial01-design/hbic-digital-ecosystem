import SwiftUI

private let quranTeal = Color(red: 0.05, green: 0.66, blue: 0.70)
private let quranGold = Color(red: 0.92, green: 0.75, blue: 0.40)

struct WatchQuranHome: View {
    @StateObject private var store = WatchQuranStore()
    @StateObject private var audio = WatchQuranAudio()
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("watch.quran.chapter") private var lastChapter = 1
    @AppStorage("watch.quran.ayah") private var lastAyah = 1
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "book.closed.fill").font(.system(size: 30)).foregroundStyle(quranGold)
                Text("Quran & Recite").font(.title3.bold()).multilineTextAlignment(.center)
                Text("Read on your wrist. Listen to authentic recitations.")
                    .font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
                if let chapter = store.chapters.first(where: { $0.id == lastChapter }) {
                    NavigationLink { WatchMushafView(chapter: chapter, startingAyah: lastAyah) } label: {
                        VStack(spacing: 4) { Text("Continue reading").font(.caption2).foregroundStyle(quranGold)
                            Text(chapter.chapter.nameSimple).font(.headline)
                            Text("Ayah \(lastAyah)").font(.caption2).foregroundStyle(.secondary) }
                    }.buttonStyle(.bordered).accessibilityLabel("Continue Quran reading")
                }
                NavigationLink { WatchSurahList(store: store) } label: { Label("Read Quran", systemImage: "book") }
                    .buttonStyle(.bordered).accessibilityLabel("Read Quran")
                NavigationLink { WatchReciterList(store: store, audio: audio) } label: { Label("Listen", systemImage: "headphones") }
                    .buttonStyle(.bordered).accessibilityLabel("Listen to Quran")
                if !audio.title.isEmpty { NavigationLink { WatchQuranPlayer(audio: audio) } label: { Label("Now playing", systemImage: "waveform") }.buttonStyle(.bordered) }
                if let error = store.error { Text(error).font(.caption2).foregroundStyle(.secondary) }
                Text("Tanzil Project · Uthmani 1.1\nCC BY 3.0 · tanzil.net")
                    .font(.system(size: 10)).foregroundStyle(.secondary).multilineTextAlignment(.center)
            }.padding(.horizontal, 8).padding(.bottom, 12)
        }
        .navigationTitle("Quran")
        .tint(quranTeal)
        .task { await store.loadText() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { audio.pause(); audio.updateVisibility(false) } }
    }
}

private struct WatchSurahList: View {
    @ObservedObject var store: WatchQuranStore
    @State private var query = ""
    var body: some View {
        List {
            ForEach(store.chapters.filter { query.isEmpty || "\($0.id) \($0.chapter.nameSimple) \($0.chapter.nameArabic)".localizedCaseInsensitiveContains(query) }) { chapter in
                NavigationLink { WatchMushafView(chapter: chapter, startingAyah: 1) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(chapter.chapter.nameSimple).font(.headline)
                        Text("\(chapter.id) · \(chapter.verses.count) ayahs").font(.caption2).foregroundStyle(.secondary)
                    }
                }.accessibilityLabel("Open surah \(chapter.id) \(chapter.chapter.nameSimple)")
            }
        }.searchable(text: $query, prompt: "Find a surah").navigationTitle("Read Quran")
    }
}

private struct WatchMushafView: View {
    let chapter: WatchQuranChapter
    @State private var ayah: Int
    @State private var showJump = false
    @AppStorage("watch.quran.chapter") private var lastChapter = 1
    @AppStorage("watch.quran.ayah") private var lastAyah = 1
    @AppStorage("watch.quran.fontSize") private var fontSize = 26.0
    init(chapter: WatchQuranChapter, startingAyah: Int) {
        self.chapter = chapter
        _ayah = State(initialValue: min(chapter.verses.count, max(1, startingAyah)))
    }
    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Text(chapter.chapter.nameArabic).font(.custom("NotoNaskhArabic-Regular", size: 25))
                    .foregroundStyle(quranGold).multilineTextAlignment(.center)
                Text("Ayah \(ayah) of \(chapter.verses.count)").font(.caption2).foregroundStyle(.secondary)
                if ayah == 1, let opening = chapter.opening {
                    Text(opening).font(.custom("NotoNaskhArabic-Regular", size: 22)).multilineTextAlignment(.center)
                        .environment(\.layoutDirection, .rightToLeft).fixedSize(horizontal: false, vertical: true)
                }
                Text(chapter.verses[ayah - 1].textUthmani)
                    .font(.custom("NotoNaskhArabic-Regular", size: fontSize)).lineSpacing(10)
                    .multilineTextAlignment(.trailing).environment(\.layoutDirection, .rightToLeft)
                    .frame(maxWidth: .infinity, alignment: .trailing).fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("watch.quran.ayah")
                HStack(spacing: 10) {
                    Button { ayah -= 1 } label: { Image(systemName: "chevron.left") }
                        .disabled(ayah == 1).accessibilityLabel("Previous ayah")
                    Button { showJump = true } label: { Text("\(ayah)").monospacedDigit() }
                        .accessibilityLabel("Jump to ayah")
                    Button { ayah += 1 } label: { Image(systemName: "chevron.right") }
                        .disabled(ayah == chapter.verses.count).accessibilityLabel("Next ayah")
                }.buttonStyle(.bordered)
                HStack {
                    Button("A−") { fontSize = max(22, fontSize - 2) }.accessibilityLabel("Smaller Arabic")
                    Button("A+") { fontSize = min(38, fontSize + 2) }.accessibilityLabel("Larger Arabic")
                }.buttonStyle(.borderless).foregroundStyle(quranTeal)
                Text("Tanzil · tanzil.net").font(.system(size: 9)).foregroundStyle(.secondary)
            }.padding(.horizontal, 8).padding(.bottom, 12)
        }.navigationTitle(chapter.chapter.nameSimple)
        .onAppear { savePosition() }.onChange(of: ayah) { _, _ in savePosition() }
        .sheet(isPresented: $showJump) {
            VStack {
                Picker("Ayah", selection: $ayah) { ForEach(1...chapter.verses.count, id: \.self) { Text("Ayah \($0)").tag($0) } }
                Button("Go") { showJump = false }.buttonStyle(.borderedProminent)
            }.padding(.horizontal, 8)
        }
    }
    private func savePosition() { lastChapter = chapter.id; lastAyah = ayah }
}

private struct WatchReciterList: View {
    @ObservedObject var store: WatchQuranStore
    @ObservedObject var audio: WatchQuranAudio
    @State private var query = ""
    var body: some View {
        List {
            if store.loading { ProgressView("Loading reciters") }
            if let error = store.error { Text(error).font(.caption2); Button("Try again") { Task { await store.loadReciters() } } }
            ForEach(["Masjid al-Haram", "Masjid an-Nabawi", "Well-known reciters", "More reciters"], id: \.self) { group in
                let voices = store.reciters.filter { store.group(for: $0.id) == group && (query.isEmpty || $0.name.localizedCaseInsensitiveContains(query)) }
                if !voices.isEmpty { Section(group) {
                    ForEach(voices) { voice in
                        NavigationLink { WatchRecordingList(voice: voice, chapters: store.chapters, audio: audio) } label: {
                            VStack(alignment: .leading, spacing: 4) { Text(voice.name).font(.headline)
                                Text("\(voice.hafs?.chapters.count ?? 0) surahs").font(.caption2).foregroundStyle(.secondary) }
                        }.accessibilityLabel("Select reciter \(voice.name)")
                    }
                } }
            }
            Text("MP3Quran.net · streamed Hafs recordings. Some collections are partial.").font(.system(size: 10)).foregroundStyle(.secondary)
        }.searchable(text: $query, prompt: "Find a reciter").navigationTitle("Reciters")
        .task { await store.loadReciters() }
    }
}

private struct WatchRecordingList: View {
    let voice: WatchListeningReciter
    let chapters: [WatchQuranChapter]
    @ObservedObject var audio: WatchQuranAudio
    @AppStorage("watch.quran.reciter") private var savedReciter = 123
    var body: some View {
        List {
            Text(voice.name).font(.headline)
            ForEach(chapters.filter { voice.hafs?.chapters.contains($0.id) == true }) { chapter in
                NavigationLink {
                    WatchQuranPlayer(audio: audio).task { savedReciter = voice.id; audio.play(voice, chapter: chapter) }
                } label: { Label(chapter.chapter.nameSimple, systemImage: "play.circle") }
                .accessibilityLabel("Play \(chapter.chapter.nameSimple) by \(voice.name)")
            }
        }.navigationTitle("Choose surah")
    }
}

private struct WatchQuranPlayer: View {
    @ObservedObject var audio: WatchQuranAudio
    @Environment(\.scenePhase) private var scenePhase
    private func clock(_ value: Double) -> String { let n = max(0, Int(value)); return String(format: "%d:%02d", n / 60, n % 60) }
    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Image(systemName: "waveform").font(.system(size: 28)).foregroundStyle(quranGold)
                Text(audio.title.isEmpty ? "Playback stopped" : audio.title).font(.title3.bold()).multilineTextAlignment(.center)
                Text(audio.reciter).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center)
                ProgressView(value: audio.duration > 0 ? min(1, audio.elapsed / audio.duration) : 0).tint(quranTeal)
                Text("\(clock(audio.elapsed)) / \(clock(audio.duration))").font(.caption2.monospacedDigit()).foregroundStyle(.secondary)
                HStack(spacing: 8) {
                    Button { audio.seek(-15) } label: { Image(systemName: "gobackward.15") }.accessibilityLabel("Back 15 seconds")
                    Button { audio.toggle() } label: { Image(systemName: audio.playing ? "pause.fill" : "play.fill") }
                        .accessibilityLabel(audio.playing ? "Pause Quran audio" : "Resume Quran audio")
                    Button { audio.seek(15) } label: { Image(systemName: "goforward.15") }.accessibilityLabel("Forward 15 seconds")
                }.buttonStyle(.bordered)
                Button("Stop") { audio.stop() }.buttonStyle(.bordered).accessibilityLabel("Stop Quran audio")
                if let error = audio.error { Text(error).font(.caption2).foregroundStyle(.secondary).multilineTextAlignment(.center) }
                Text("Audio: MP3Quran.net").font(.system(size: 9)).foregroundStyle(.secondary)
            }.padding(.horizontal, 8).padding(.bottom, 12)
        }.navigationTitle("Listening")
        .onAppear { audio.updateVisibility(true) }
        .onDisappear { audio.updateVisibility(false) }
        .onChange(of: scenePhase) { _, phase in audio.updateVisibility(phase == .active) }
    }
}
