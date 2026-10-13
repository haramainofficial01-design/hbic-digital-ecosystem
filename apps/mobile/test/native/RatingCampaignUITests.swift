import XCTest
import XCUIAutomation

@objc(HBICRatingUITests)
final class HBICRatingUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "ca.hbic.calgary.app")
    let campaignID = "qa-rating-" + UUID().uuidString.lowercased()

    func check(_ condition: Bool, _ message: String = "Rating UI check failed") throws {
        if !condition { throw NSError(domain: "RatingQA", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    }

    func request(_ path: String, body: [String: Any]? = nil) throws -> [String: Any] {
        var request = URLRequest(url: URL(string: "http://127.0.0.1:9221\(path)")!)
        if let body {
            request.httpMethod = "POST"
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let done = DispatchSemaphore(value: 0)
        var result: [String: Any] = [:]
        var failure: Error?
        URLSession.shared.dataTask(with: request) { data, _, error in
            failure = error
            if let data { result = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:] }
            done.signal()
        }.resume()
        guard done.wait(timeout: .now() + 10) == .success else { throw NSError(domain: "RatingQA", code: 1) }
        if let failure { throw failure }
        return result
    }
    func tap(_ label: String) throws {
        dismissSimulatorDebugBanner()
        if label == "Home" || label == "More" { app.swipeDown(); dismissSimulatorDebugBanner() }
        let button = app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch
        let item = button.exists ? button : app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
        try check(item.waitForExistence(timeout: 20), "Missing \(label): \(app.debugDescription)")
        for _ in 0..<15 {
            if item.isHittable { break }
            app.swipeUp()
        }
        try check(item.isHittable, "Off-screen \(label): \(app.debugDescription)")
        item.tap()
    }
    func dismissSimulatorDebugBanner() {
        // The ad-hoc simulator artifact lacks a distribution keychain identity.
        // Dismiss only its known Expo debug banner, never a real user alert.
        let banner = app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Error reading persisted")).firstMatch
        if banner.exists {
            app.coordinate(withNormalizedOffset: CGVector(dx: 0.92, dy: 0.93)).tap()
        }
    }
    func waitForAttempt() throws {
        let deadline = Date().addingTimeInterval(35)
        while Date() < deadline {
            if (try request("/qa/ledger"))["attempted"] as? [String] == [campaignID] { return }
            let attempted = (try request("/qa/ledger"))["attempted"] as? [String] ?? []
            if attempted.contains(campaignID) { return }
            Thread.sleep(forTimeInterval: 1)
        }
        try check(false, "Native iOS campaign was not requested from a loaded idle home")
    }
    func dismissAppleReviewIfShown() {
        for label in ["Not Now", "Not now", "Cancel"] {
            if app.alerts.buttons[label].exists { app.alerts.buttons[label].tap(); return }
        }
    }
    @objc func testNativeCampaignAndPermanentActions() throws {
        _ = try request("/qa/campaign", body: ["id": campaignID, "enabled": false])
        app.launch()
        if app.buttons["Skip introduction"].waitForExistence(timeout: 5) { app.buttons["Skip introduction"].tap() }
        try check(app.staticTexts["Masjid Bilal"].firstMatch.waitForExistence(timeout: 30), app.debugDescription)
        dismissSimulatorDebugBanner()
        Thread.sleep(forTimeInterval: 18)
        try check(!((try request("/qa/ledger"))["attempted"] as? [String] ?? []).contains(campaignID))
        try tap("More")
        try tap("Settings")
        try check(app.buttons["Rate Our App"].waitForExistence(timeout: 10))
        _ = try request("/qa/campaign", body: ["id": campaignID, "enabled": true])
        // Relaunch fetches fresh remote content; a visible Settings screen must not prompt.
        app.terminate(); app.launch()
        Thread.sleep(forTimeInterval: 18)
        if !app.staticTexts["Masjid Bilal"].firstMatch.exists {
            try check(!((try request("/qa/ledger"))["attempted"] as? [String] ?? []).contains(campaignID))
            if app.buttons["Back"].exists { app.buttons["Back"].tap() }
            try tap("Home")
        }
        try waitForAttempt()
        try check(!app.staticTexts["Enjoying the Masjid Bilal App? ⭐"].exists, "iOS must not display a custom review prompt")
        dismissAppleReviewIfShown()
        let first = (try request("/qa/ledger"))["attempted"] as? [String] ?? []
        app.terminate(); app.launch(); Thread.sleep(forTimeInterval: 18)
        let second = (try request("/qa/ledger"))["attempted"] as? [String] ?? []
        try check(second.filter { $0 == campaignID }.count == 1)
        try check(first == second)
        dismissAppleReviewIfShown()
        try tap("More")
        let rate = app.buttons["Rate Our App"]
        try check(rate.waitForExistence(timeout: 10))
        // No real review is posted; Apple controls actual prompt display/quotas.
    }
}
