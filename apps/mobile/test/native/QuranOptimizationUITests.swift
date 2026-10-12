import XCTest
import XCUIAutomation

@objc(HBICQuranUITests)
final class HBICQuranUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "ca.hbic.calgary.app")
    func check(_ value: Bool, _ message: String = "UI check failed") throws {
        if !value { throw NSError(domain: "QuranQA", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    }
    func tap(_ label: String) throws {
        let buttons = app.buttons.matching(NSPredicate(format: "label == %@", label))
        let item = buttons.firstMatch.exists ? buttons.firstMatch : app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
        guard item.waitForExistence(timeout: 20) else { throw NSError(domain: "QuranQA", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing \(label): \(app.debugDescription)"]) }
        for _ in 0..<12 {
            if item.isHittable { break }
            // Hint/reveal changes ayah height. A control can be above OR below
            // the viewport on a returning visit; never keep scrolling past it.
            if item.frame.minY < app.frame.minY + app.frame.height * 0.27 { app.swipeDown() } else { app.swipeUp() }
        }
        try check(item.isHittable, "Off-screen control: \(label)"); item.tap()
    }
    func screenshot(_ name: String) throws {
        let output = URL(fileURLWithPath: ProcessInfo.processInfo.environment["HBIC_QA_OUTPUT"] ?? NSTemporaryDirectory())
        try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
        try app.screenshot().pngRepresentation.write(to: output.appendingPathComponent("\(name).png"))
    }
    func openQuran() throws {
        app.launch()
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Open"].waitForExistence(timeout: 2) { springboard.buttons["Open"].tap() }
        if app.buttons["Skip introduction"].waitForExistence(timeout: 5) { app.buttons["Skip introduction"].tap() }
        if app.buttons["Open Quran & Recite"].waitForExistence(timeout: 4) { try tap("Open Quran & Recite") }
        else if !app.buttons["Back to More"].exists && !app.buttons["Quran home"].exists {
            try tap("More")
            let currentLabel = app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", "Quran")).firstMatch
            try tap(currentLabel.waitForExistence(timeout: 3) ? "Quran" : "Quran & Recite")
        }
    }
    @objc func testReaderListeningPracticeAndPrivatePreferences() throws {
        try openQuran()
        try tap("Read")
        try check(app.staticTexts["Al-Fatihah"].waitForExistence(timeout: 25), app.debugDescription)
        try screenshot("iphone15-reader")
        try tap("Library")
        try check(app.staticTexts["My Library"].waitForExistence(timeout: 5))
        try tap("Word review (0)")
        try check(app.staticTexts["No possible-word flags to review."].waitForExistence(timeout: 5))
        try screenshot("iphone15-private-library")
        try tap("Practise")
        try tap("Hide")
        try tap("Word hint")
        try tap("Reveal")
        try screenshot("iphone15-practice")
        try tap("Quran preferences")
        try tap("Efficient")
        try screenshot("iphone15-preferences")
        try tap("Listen")
        if app.buttons["Choose another reciter"].waitForExistence(timeout: 3) { try tap("Choose another reciter") }
        let search = app.textFields["Find a reciter"]
        try check(search.waitForExistence(timeout: 20), app.debugDescription)
        search.tap(); search.typeText("Mishary")
        let voice = app.buttons.matching(NSPredicate(format: "label BEGINSWITH[c] %@", "Select reciter Mishary")).firstMatch
        try check(voice.waitForExistence(timeout: 20), "Credited Mishary voice missing"); try tap(voice.label)
        let surah = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Play Al-Fatihah by ")).firstMatch
        try check(surah.waitForExistence(timeout: 20), "Verified surah recording unavailable"); try tap(surah.label)
        try check(app.buttons["Pause audio"].waitForExistence(timeout: 20), app.debugDescription)
        let advancingAudio = NSPredicate { _, _ in
            self.app.staticTexts.allElementsBoundByIndex.contains {
                $0.label.range(of: "^[0-9]+:[0-9]{2} / [0-9]+:[0-9]{2}$", options: .regularExpression) != nil
                    && !$0.label.hasPrefix("0:00 / ") && !$0.label.hasSuffix(" / 0:00")
            }
        }
        try check(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: advancingAudio, object: nil)], timeout: 20) == .completed,
                  "Native stream did not load a duration and advance playback")
        try screenshot("iphone15-streaming-player")
        try tap("Pause audio")
        try tap("Resume audio")
        XCUIDevice.shared.press(.home)
        app.activate()
        try check(app.buttons["Resume audio"].waitForExistence(timeout: 10), "Background interruption did not pause playback")
        try tap("Resume audio")
        try tap("Stop audio")
        try check(!app.buttons["Pause audio"].exists)
        // No mic, cloud signup, donation or Academy actions in this runtime test.
    }
    @objc func testSessionRecordingCanBeKeptReplayedAndDeleted() throws {
        app.activate()
        try tap("Practise")
        try tap("Recording options")
        let retention = app.switches["Keep recordings after this session"]
        for _ in 0..<8 { if retention.isHittable { break }; app.swipeUp() }
        try check(retention.exists, "Missing recording privacy choice")
        if retention.value as? String == "1" { retention.tap() }
        try tap("Record my recitation")
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if springboard.buttons["Allow"].waitForExistence(timeout: 3) { springboard.buttons["Allow"].tap() }
        if app.alerts.buttons["Allow"].exists { app.alerts.buttons["Allow"].tap() }
        Thread.sleep(forTimeInterval: 3)
        try tap("Stop and review recording")
        try tap("Play temporary recording")
        try tap("Stop audio")
        try tap("Keep this recording")
        try tap("Library")
        try tap("Recordings (1)")
        try screenshot("iphone15-kept-recording")
        try tap("Play recording")
        try check(app.buttons["Pause audio"].waitForExistence(timeout: 10))
        try tap("Stop audio")
        try tap("Delete recording")
        try check(app.alerts.buttons["Delete"].waitForExistence(timeout: 3)); app.alerts.buttons["Delete"].tap()
        try tap("Recordings (0)")
        try check(app.staticTexts["No kept recordings yet. Choose whether to keep audio from the practice screen."].waitForExistence(timeout: 5))
        try tap("Practise")
        try tap("Record my recitation")
        Thread.sleep(forTimeInterval: 3)
        XCUIDevice.shared.press(.home)
        app.activate()
        try check(app.buttons["Record my recitation"].waitForExistence(timeout: 10), "Background capture was not stopped")
        try check(!app.buttons["Play temporary recording"].exists, "Session-only recording survived background exit")
    }
    @objc func testSelfTestHintsAndReveal() throws {
        try openQuran()
        try tap("Practise")
        try tap("Test yourself")
        try tap("Start self-test")
        try tap("Word hint")
        try tap("Reveal ayah")
        try tap("Hide ayah")
        try screenshot("iphone15-self-test")
        try tap("Reveal ayah")
        try tap("Recalled · next")
        try check(app.buttons["Reveal ayah"].waitForExistence(timeout: 10), "Self-test did not advance")
    }
    @objc func testDeclinedMicrophonePreservesReadingAndListening() throws {
        // Revoke only this QA app's simulator microphone permission before
        // running this test. Never approve the Mac's microphone permission.
        try openQuran()
        try tap("Practise")
        try tap("Record my recitation")
        let declined = NSPredicate { _, _ in
            self.app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "microphone")).allElementsBoundByIndex
                .contains { $0.exists && ($0.label.contains("Settings") || $0.label.contains("permission")) }
        }
        try check(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: declined, object: nil)], timeout: 10) == .completed,
                  "Denied microphone has no recoverable explanation")
        try check(!app.buttons["Stop and review recording"].exists, "Recording started without consent")
        try tap("Read")
        try check(app.staticTexts["Al-Fatihah"].waitForExistence(timeout: 10), "Denied microphone blocked reading")
        try screenshot("iphone15-microphone-declined-reader")
    }
}
