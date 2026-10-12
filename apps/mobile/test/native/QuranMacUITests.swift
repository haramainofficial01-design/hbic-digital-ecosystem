import XCTest
import XCUIAutomation

@objc(HBICQuranMacUITests)
final class HBICQuranMacUITests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "ca.hbic.calgary.app")

    func check(_ value: Bool, _ message: String = "Mac Quran check failed") throws {
        if !value { throw NSError(domain: "QuranMacQA", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
    }

    func control(_ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", label)).firstMatch
    }

    func tap(_ label: String) throws {
        let item = control(label)
        try check(item.waitForExistence(timeout: 20), "Missing \(label): \(app.debugDescription)")
        item.click()
    }

    func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    @objc func testMacReaderNavigationAndRealAudio() throws {
        // Interactive test: run only when foreground Mac automation is allowed.
        // Do not run this while the user has requested background-only work.
        app.launch()
        if control("Skip introduction").waitForExistence(timeout: 3) { try tap("Skip introduction") }
        if control("Open Quran & Recite").waitForExistence(timeout: 3) { try tap("Open Quran & Recite") }
        else {
            try tap("More")
            try tap(control("Quran").waitForExistence(timeout: 3) ? "Quran" : "Quran & Recite")
        }
        try check(control("Hide Quran sidebar").waitForExistence(timeout: 15), "Mac-specific workspace did not mount")
        try tap("Read")
        try check(app.staticTexts["Al-Fatihah"].waitForExistence(timeout: 30), app.debugDescription)
        capture("mac-reader")
        try tap("Focus reading")
        try check(control("Leave focus").waitForExistence(timeout: 5))
        try check(!control("Quran preferences").exists)
        try tap("Leave focus")
        try tap("Practise")
        try tap("Test yourself")
        try tap("Start self-test")
        try tap("Word hint")
        try tap("Reveal ayah")
        capture("mac-self-test")
        try tap("Library")
        try tap("Bookmarks")
        try check(app.staticTexts["Your bookmarks"].waitForExistence(timeout: 10))
        try tap("Search Quran")
        let search = app.textFields["Search Quran Arabic, English or ayah reference"]
        try check(search.waitForExistence(timeout: 10))
        search.click()
        search.typeText("2:255")
        try check(control("Surah and ayah 2:255").waitForExistence(timeout: 30), app.debugDescription)
        try tap("Quran preferences")
        try check(control("Efficient").waitForExistence(timeout: 10))
        capture("mac-preferences")
        try tap("Listen")
        if control("Choose another reciter").waitForExistence(timeout: 3) { try tap("Choose another reciter") }
        let reciterSearch = app.textFields["Find a reciter"]
        try check(reciterSearch.waitForExistence(timeout: 20), app.debugDescription)
        reciterSearch.click()
        reciterSearch.typeText("Mishary")
        let voice = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH[c] %@", "Select reciter Mishary")).firstMatch
        try check(voice.waitForExistence(timeout: 20), "Credited Mishary voice missing")
        voice.click()
        let surah = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Play Al-Fatihah by ")).firstMatch
        try check(surah.waitForExistence(timeout: 20), "Real surah recording unavailable")
        surah.click()
        try check(control("Pause audio").waitForExistence(timeout: 30), app.debugDescription)
        let progress = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "[0-9]+:[0-9]{2} / [0-9]+:[0-9]{2}")).firstMatch
        try check(progress.waitForExistence(timeout: 30), app.debugDescription)
        let advances = NSPredicate { _, _ in
            let parts = progress.label.components(separatedBy: " / ")
            return parts.count == 2 && parts[0] != "0:00" && parts[1] != "0:00"
        }
        try check(XCTWaiter.wait(for: [XCTNSPredicateExpectation(predicate: advances, object: nil)], timeout: 30) == .completed, "Actual audio did not advance")
        capture("mac-streaming-audio")
        try tap("Pause audio")
        try tap("Resume audio")
        try tap("Stop audio")
        try check(!control("Pause audio").exists)
    }
}
