import XCTest
import XCUIAutomation

@objc(HBICQuranUITests)
final class HBICQuranUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "ca.hbic.calgary.app.watch")
    func check(_ value: Bool, _ message: String) throws {
        if !value { throw NSError(domain: "WatchQuranQA", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    }
    func tap(_ label: String) throws {
        let button = app.buttons[label]
        try check(button.waitForExistence(timeout: 20), "Missing \(label): \(app.debugDescription)")
        for _ in 0..<10 {
            if button.isHittable { break }
            if button.frame.minY < 60 { app.swipeDown() } else { app.swipeUp() }
        }
        try check(button.isHittable, "Unreachable \(label)")
        button.tap()
    }
    @objc func testOfflineReaderAndRealStreamingPlayback() throws {
        app.launchArguments = ["-MasjidPreviewScreen", "quran", "-MasjidUsePreviewData"]
        // The preview switch isolates prayer state only. Quran text remains
        // the licensed bundled source; the reciter catalog/audio are real.
        app.launch()
        try tap("Read Quran")
        try tap("Open surah 1 Al-Faatiha")
        try check(app.staticTexts["Ayah 1 of 7"].exists, "Wrong opening ayah")
        try tap("Next ayah")
        try check(app.staticTexts["Ayah 2 of 7"].exists, "Ayah navigation failed")
        app.navigationBars.buttons.firstMatch.tap()
        app.navigationBars.buttons.firstMatch.tap()
        try tap("Listen to Quran")
        try tap("Select reciter Abdullah Al-Johany")
        try tap("Play Al-Faatiha by Abdullah Al-Johany")
        try check(app.buttons["Pause Quran audio"].waitForExistence(timeout: 25), "Native Watch audio did not start")
        let progressing = NSPredicate { _, _ in
            self.app.staticTexts.allElementsBoundByIndex.contains {
                $0.label.range(of: "^[0-9]+:[0-9]{2} / [0-9]+:[0-9]{2}$", options: .regularExpression) != nil
                    && !$0.label.hasPrefix("0:00 / ") && !$0.label.hasSuffix(" / 0:00")
            }
        }
        try check(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: progressing, object: nil)], timeout: 25) == .completed,
                  "Watch stream did not load a duration and advance")
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Watch real Quran playback"
        screenshot.lifetime = .keepAlways
        add(screenshot)
        try tap("Pause Quran audio")
        try check(app.buttons["Resume Quran audio"].waitForExistence(timeout: 5), "Watch pause failed")
        try tap("Resume Quran audio")
        try check(app.buttons["Pause Quran audio"].waitForExistence(timeout: 5), "Watch resume failed")
        try tap("Stop Quran audio")
        try check(app.staticTexts["Playback stopped"].waitForExistence(timeout: 5), "Watch stop failed")
    }
}
