import Foundation
import Combine

enum WatchBilalLanguage: String, CaseIterable, Identifiable {
    case english = "en", urdu = "ur", dari = "fa-AF", arabic = "ar"
    var id: String { rawValue }
    var label: String { switch self { case .english: return "English"; case .urdu: return "اردو"; case .dari: return "دری"; case .arabic: return "العربية" } }
    static var system: Self {
        let code = Locale.preferredLanguages.first ?? "en"
        return code.hasPrefix("ar") ? .arabic : code.hasPrefix("ur") ? .urdu : code.hasPrefix("fa") ? .dari : .english
    }
    func text(_ key: String) -> String { WatchBilalCopy.all[rawValue]?[key] ?? key }
}

private enum WatchBilalCopy {
    static let all: [String: [String: String]] = {
        let url = Bundle.main.url(forResource: "bilal-interface", withExtension: "json")
            ?? Bundle.main.url(forResource: "bilal-interface", withExtension: "json", subdirectory: "Resources")
        guard let url, let data = try? Data(contentsOf: url), let result = try? JSONDecoder().decode([String: [String: String]].self, from: data) else { return [:] }
        return result
    }()
}

struct WatchBilalReply: Decodable {
    struct Source: Decodable, Identifiable {
        let id: String
        let title: String
        let href: String
        var url: URL? { WatchBilalReply.safeURL(href) }
    }
    let ok: Bool
    let answer: String
    let sources: [Source]
    let asOf: String
    let mode: String

    static func safeURL(_ value: String) -> URL? {
        guard let url = URL(string: value, relativeTo: URL(string: "https://hbic.ca"))?.absoluteURL,
              url.scheme == "https", url.host == "hbic.ca", url.port == nil,
              url.user == nil, url.password == nil, url.query == nil,
              ["/", "/prayer-times", "/quran-academy", "/donate", "/contact", "/events", "/programs", "/quran", "/privacy", "/app", "/about", "/community", "/youth"].contains(url.path.isEmpty ? "/" : url.path)
        else { return nil }
        return url
    }
    var valid: Bool {
        let fractional = ISO8601DateFormatter(); fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return ok && mode == "published-info" && !answer.isEmpty && answer.count <= 12000 && sources.count <= 12
            && (fractional.date(from: asOf) ?? ISO8601DateFormatter().date(from: asOf)) != nil
    }
}

/** Foreground, explicit requests only. No history store, audio or refresh loop. */
@MainActor final class WatchBilalStore: ObservableObject {
    @Published private(set) var reply: WatchBilalReply?
    @Published private(set) var busy = false
    @Published private(set) var errorKey: String?
    @Published private(set) var available = false
    private var task: Task<Void, Never>?
    private var requestID = UUID()
    private var requestCount = 0
    private let session: URLSession
    init(session: URLSession? = nil) {
        if let session { self.session = session } else {
            let config = URLSessionConfiguration.ephemeral
            config.urlCache = nil; config.httpCookieStorage = nil; config.urlCredentialStorage = nil
            config.timeoutIntervalForRequest = 12; config.timeoutIntervalForResource = 15
            config.requestCachePolicy = .reloadIgnoringLocalCacheData
            config.waitsForConnectivity = false
            self.session = URLSession(configuration: config)
        }
    }
    func activate() {
        cancel(); let id = requestID; available = false; busy = true; errorKey = nil
        task = Task { [weak self] in
            guard let self else { return }
            defer { if requestID == id { busy = false } }
            do {
                let (data, response) = try await session.data(from: URL(string: "https://hbic.ca/api/assistant")!)
                guard !Task.isCancelled, requestID == id else { return }
                let value = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                available = (response as? HTTPURLResponse)?.statusCode == 200 && value?["enabled"] as? Bool == true && value?["ok"] as? Bool == true
                errorKey = available ? nil : "Bilal is currently switched off. Please contact the office."
            } catch { if !Task.isCancelled && requestID == id { errorKey = "Please try again shortly." } }
        }
    }
    func ask(_ question: String, language: WatchBilalLanguage) {
        let value = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard available, !busy, !value.isEmpty, value.utf16.count <= 800 else { return }
        guard requestCount < 20 else { errorKey = "Please clear this chat to start a new conversation."; return }
        cancel(); let id = requestID; busy = true; errorKey = nil; requestCount += 1
        task = Task { [weak self] in
            guard let self else { return }
            defer { if requestID == id { busy = false } }
            do {
                var request = URLRequest(url: URL(string: "https://hbic.ca/api/assistant")!)
                request.httpMethod = "POST"; request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try JSONSerialization.data(withJSONObject: ["question": value, "previousQuestions": [String](), "language": language.rawValue])
                let (data, response) = try await session.data(for: request)
                guard !Task.isCancelled, requestID == id else { return }
                guard (response as? HTTPURLResponse)?.statusCode == 200 else {
                    errorKey = (response as? HTTPURLResponse)?.statusCode == 429 ? "Please wait a moment before asking another question." : "I can’t verify the latest information right now. Please try again or contact the masjid."
                    return
                }
                let result = try JSONDecoder().decode(WatchBilalReply.self, from: data)
                guard result.valid else { throw URLError(.cannotParseResponse) }
                reply = result
            } catch { if !Task.isCancelled && requestID == id { errorKey = "Please try again shortly." } }
        }
    }
    func cancel() { requestID = UUID(); task?.cancel(); task = nil; busy = false }
    func clear() { cancel(); reply = nil; errorKey = nil; requestCount = 0 }
    func deactivate() { clear(); available = false }
}
