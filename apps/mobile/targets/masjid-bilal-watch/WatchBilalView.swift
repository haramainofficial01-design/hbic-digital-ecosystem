import SwiftUI

struct WatchBilalView: View {
    @StateObject private var store = WatchBilalStore()
    @State private var question = ""
    @AppStorage("watch.bilal.language") private var selectedLanguage = WatchBilalLanguage.system.rawValue
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.accessibilityReduceTransparency) private var reduceTransparency
    @Environment(\.isLuminanceReduced) private var dimmed
    private let teal = Color(red: 0.09, green: 0.73, blue: 0.76)
    private let gold = Color(red: 0.94, green: 0.80, blue: 0.48)
    private var language: WatchBilalLanguage { WatchBilalLanguage(rawValue: selectedLanguage) ?? .english }
    private func t(_ key: String) -> String { language.text(key) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 9) {
                    Image("BilalMark").resizable().scaledToFit().frame(width: 42, height: 42).accessibilityHidden(true)
                    Text(t("Your Masjid Bilal companion")).font(.caption2).foregroundStyle(.secondary)
                }
                Text(t("Published information")).font(.caption2).foregroundStyle(.secondary)
                if let reply = store.reply {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(reply.answer).font(.caption).fixedSize(horizontal: false, vertical: true)
                        ForEach(reply.sources.filter { $0.url != nil }) { source in
                            if let url = source.url { Link(destination: url) { Label(t(source.title), systemImage: "arrow.up.right") }.font(.caption2) }
                        }
                        Text(t("Published information")).font(.system(size: 9)).foregroundStyle(.secondary)
                    }
                    .padding(11).background(teal.opacity(0.11), in: RoundedRectangle(cornerRadius: 17))
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
                if store.busy { Text(t("Checking published information…")).font(.caption2).foregroundStyle(teal).accessibilityAddTraits(.updatesFrequently) }
                if let error = store.errorKey { Text(t(error)).font(.caption2).foregroundStyle(gold) }
                if store.available {
                    ForEach(["Today’s prayer times", "Quran Academy", "Donation options", "Contact the masjid"], id: \.self) { value in
                        Button { store.ask(value, language: language) } label: {
                            HStack { Text(t(value)).font(.caption2.weight(.semibold)); Spacer(minLength: 3); Image(systemName: "arrow.up.right").font(.caption2) }
                                .frame(maxWidth: .infinity, minHeight: 32)
                        }.bilalWatchButton().disabled(store.busy)
                    }
                    TextField(t("Your question"), text: $question).submitLabel(.send)
                        .onChange(of: question) { _, value in if value.count > 800 { question = String(value.prefix(800)) } }
                        .onSubmit { send() }.disabled(store.busy)
                    Button(action: send) { Label(t("Send question"), systemImage: "arrow.up") }
                        .bilalWatchButton().disabled(store.busy || question.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                } else if !store.busy {
                    Button(t("Try again")) { store.activate() }.bilalWatchButton()
                }
                Button(t("Clear chat")) { question = ""; store.clear() }.font(.caption2)
                Picker(t("Language"), selection: $selectedLanguage) {
                    ForEach(WatchBilalLanguage.allCases) { item in Text(item.label).tag(item.rawValue) }
                }.font(.caption2)
                Link(t("Privacy"), destination: URL(string: "https://hbic.ca/privacy#bilal-companion")!).font(.caption2)
                Text(t("Never share personal, student or payment details. Bilal can’t access private accounts or give religious rulings."))
                    .font(.caption2).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
                Text(t("This session only")).font(.system(size: 9)).foregroundStyle(.secondary)
            }.padding(.horizontal, 7).padding(.bottom, 12)
        }
        .navigationTitle(t("Bilal"))
        .tint(teal)
        .background {
            if dimmed || reduceTransparency { Color.black.ignoresSafeArea() }
            else { LinearGradient(colors: [Color(red: 0.025, green: 0.10, blue: 0.15), Color(red: 0.03, green: 0.19, blue: 0.22)], startPoint: .topLeading, endPoint: .bottomTrailing).ignoresSafeArea() }
        }
        .environment(\.layoutDirection, language == .english ? .leftToRight : .rightToLeft)
        .animation(reduceMotion || dimmed || ProcessInfo.processInfo.isLowPowerModeEnabled ? nil : .easeOut(duration: 0.24), value: store.reply?.answer)
        .onAppear { if scenePhase == .active && !dimmed { store.activate() } }
        .onDisappear { question = ""; store.deactivate() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { question = ""; store.deactivate() } else if !dimmed { store.activate() } }
        .onChange(of: dimmed) { _, value in if value { store.cancel() } else if scenePhase == .active { store.activate() } }
        .onChange(of: selectedLanguage) { _, _ in question = ""; store.clear() }
    }
    private func send() { store.ask(question, language: language); question = "" }
}

private extension View {
    @ViewBuilder func bilalWatchButton() -> some View {
        if #available(watchOS 26.0, *) { self.buttonStyle(.glass) } else { self.buttonStyle(.bordered) }
    }
}
