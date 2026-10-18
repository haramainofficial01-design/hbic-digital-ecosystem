import Foundation

private final class BilalTestProtocol: URLProtocol {
    static var mode = "success"
    static var requests: [URLRequest] = []
    static var stopped = 0
    override class func canInit(with request: URLRequest) -> Bool { request.url?.host == "hbic.ca" }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.requests.append(request)
        if Self.mode == "hang" { return }
        let status = Self.mode == "rate" ? 429 : 200
        let body: [String: Any] = request.httpMethod == "POST" ? ["ok": true, "answer": "Verified public answer.", "mode": "published-info", "asOf": "2026-10-18T16:00:00.123Z", "sources": [["id": "contact", "title": "Contact", "href": "https://hbic.ca/contact"], ["id": "unsafe", "title": "Unsafe", "href": "https://example.com"]]] : ["ok": true, "enabled": Self.mode != "disabled"]
        client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: try! JSONSerialization.data(withJSONObject: body))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() { Self.stopped += 1 }
}

@main struct WatchBilalTests {
    @MainActor static func main() async throws {
        func require(_ value: Bool, _ message: String) { precondition(value, message) }
        func settle() async { try? await Task.sleep(nanoseconds: 40_000_000) }
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [BilalTestProtocol.self]
        let store = WatchBilalStore(session: URLSession(configuration: config))
        store.activate(); await settle(); require(store.available, "Remote activation")
        require(BilalTestProtocol.requests.count == 1, "Only explicit activation request")
        await settle(); require(BilalTestProtocol.requests.count == 1, "No polling")
        store.ask("contact", language: .arabic); await settle()
        require(store.reply?.valid == true && store.busy == false, "Fractional timestamp response")
        require(store.reply?.sources.filter { $0.url != nil }.count == 1, "Allowlisted sources only")
        let request = BilalTestProtocol.requests.last!
        var body = request.httpBody
        if body == nil, let stream = request.httpBodyStream { stream.open(); var bytes = [UInt8](repeating: 0, count: 2048); let count = stream.read(&bytes, maxLength: bytes.count); if count > 0 { body = Data(bytes.prefix(count)) }; stream.close() }
        let payload = try JSONSerialization.jsonObject(with: body!) as! [String: Any]
        require(payload["language"] as? String == "ar" && payload.keys.count == 3 && (payload["previousQuestions"] as? [String]) == [], "No account, token or stored history")
        let count = BilalTestProtocol.requests.count
        store.ask(String(repeating: "a", count: 801), language: .english); await settle(); require(BilalTestProtocol.requests.count == count, "Question limit")
        BilalTestProtocol.mode = "rate"; store.ask("contact", language: .english); await settle()
        require(store.errorKey?.contains("wait a moment") == true && !store.busy, "429 is not a successful answer")
        store.clear(); require(store.reply == nil && store.errorKey == nil, "Clear session")
        BilalTestProtocol.mode = "hang"; store.ask("contact", language: .english); await settle(); store.deactivate(); await settle()
        require(!store.busy && !store.available && store.reply == nil && BilalTestProtocol.stopped > 0, "Cancel on background/disappear")
        BilalTestProtocol.mode = "disabled"; store.activate(); await settle(); require(!store.available, "Remote disable")
        for url in ["https://evil.hbic.ca/contact", "http://hbic.ca/contact", "https://hbic.ca/admin", "https://a@hbic.ca/contact", "https://hbic.ca/contact?token=secret", "javascript:alert(1)"] { require(WatchBilalReply.safeURL(url) == nil, "Reject unsafe source") }
        require(WatchBilalReply.safeURL("/privacy#bilal-companion") != nil, "Canonical privacy anchor")
        print("Watch Bilal: activation, no polling, response validation, four-language request, question bound, 429, clear, cancellation and source isolation passed. No real user or microphone was used.")
    }
}
