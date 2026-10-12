import XCTest
import XCUIAutomation

@objc(HBICQuranUITests)
final class HBICQuranUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "ca.hbic.calgary.app")
    func check(_ value: Bool, _ message: String) throws {
        if !value { throw NSError(domain: "QuranWorkspaceQA", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    }
    func control(_ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
    }
    func tap(_ label: String) throws {
        let element = control(label)
        try check(element.waitForExistence(timeout: 20), "Missing \(label): \(app.debugDescription)")
        for _ in 0..<8 {
            if element.isHittable { break }
            if element.frame.minY < 160 { app.swipeDown() } else { app.swipeUp() }
        }
        try check(element.isHittable, "Unreachable \(label)")
        element.tap()
    }
    func capture(_ name: String) throws {
        let folder = URL(fileURLWithPath: ProcessInfo.processInfo.environment["HBIC_QA_OUTPUT"] ?? NSTemporaryDirectory())
        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        // Vision app snapshots crop a scaled compositor layer on this SDK;
        // inspect the full display separately with simctl, not as store assets.
        let screenshot = app.screenshot()
        try screenshot.pngRepresentation.write(to: folder.appendingPathComponent("\(name).png"))
    }
    @objc func testReaderFocusAndContextualTools() throws {
        // A Simulator deep link can require confirmation before activation.
        // Handle only our own app's Open action, not permission prompts.
        #if os(visionOS)
        let systemBundles: [String] = []
        #else
        let systemBundles = ["com.apple.springboard"]
        #endif
        for bundle in systemBundles {
            let system = XCUIApplication(bundleIdentifier: bundle)
            let open = system.buttons["Open"]
            if open.waitForExistence(timeout: 1) { open.tap(); break }
        }
        app.launch()
        if control("Skip introduction").waitForExistence(timeout: 3) { try tap("Skip introduction") }
        if !control("Quran home").exists && !control("Back to More").exists {
            try tap("More")
            try tap(control("Quran").waitForExistence(timeout: 3) ? "Quran" : "Quran & Recite")
        }
        try tap("Read")
        try check(app.staticTexts["Al-Fatihah"].waitForExistence(timeout: 30), "Real Quran chapter did not load")
        try capture("reader")
        try tap("Focus reading")
        try check(control("Leave focus").waitForExistence(timeout: 5), "Focus cannot be exited")
        try check(!control("Quran preferences").exists, "Preferences obscure focused reading")
        try check(!control("Library").exists, "Primary tabs obscure focused reading")
        try capture("focus")
        try tap("Leave focus")
        try tap("Practise")
        try check(control("Recite").waitForExistence(timeout: 5), "Practice context missing")
        try check(control("Memorize").exists && control("Test yourself").exists, "Practice tools missing")
        try tap("Test yourself")
        try tap("Start self-test")
        try tap("Word hint")
        try tap("Reveal ayah")
        try capture("self-test")
        try tap("Library")
        try check(control("My Library").waitForExistence(timeout: 5), "Library context missing")
        try tap("Bookmarks")
        try check(app.staticTexts["Your bookmarks"].waitForExistence(timeout: 5), "Bookmarks unavailable")
        try tap("Search Quran")
        try check(app.textFields["Search Quran Arabic, English or ayah reference"].waitForExistence(timeout: 5), "Search missing")
        try tap("Quran preferences")
        try check(control("Efficient").waitForExistence(timeout: 10), "Preferences missing")
        try capture("preferences")
        // No recording, model downloads, cloud signup or payment writes.
    }
}
