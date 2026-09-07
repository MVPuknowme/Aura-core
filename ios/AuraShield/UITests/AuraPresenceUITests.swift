import XCTest

final class AuraPresenceUITests: XCTestCase {
    func testOfflineControlPreservesDraftAndPreventsSubmission() {
        let app = XCUIApplication()
        app.launch()

        app.buttons["Come see me"].tap()

        let editor = app.textViews["Check-in message"]
        XCTAssertTrue(editor.waitForExistence(timeout: 2))
        editor.tap()
        editor.typeText("Keep this draft.")

        let offlineControl = app.buttons["Preview offline state"]
        XCTAssertTrue(offlineControl.waitForExistence(timeout: 2))
        offlineControl.tap()

        XCTAssertTrue(app.staticTexts["Offline"].waitForExistence(timeout: 2))
        XCTAssertEqual(editor.value as? String, "Keep this draft.")
        XCTAssertFalse(app.buttons["Send check-in"].exists)
        XCTAssertTrue(
            app.staticTexts[
                "Aura is offline. Your check-in is still on this device and was not sent."
            ].exists
        )
    }
}
