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

        let status = app.descendants(matching: .any)["aura-status"]
        XCTAssertTrue(status.waitForExistence(timeout: 2))
        XCTAssertEqual(status.label, "Aura status: Offline")
        XCTAssertEqual(editor.value as? String, "Keep this draft.")
        XCTAssertFalse(app.buttons["Send check-in"].exists)

        let response = app.descendants(matching: .any)["aura-response"]
        XCTAssertTrue(response.waitForExistence(timeout: 2))
        XCTAssertEqual(
            response.label,
            "Aura response: Aura is offline. Your check-in is still on this device and was not sent."
        )

        app.buttons["Return to ready"].tap()

        XCTAssertTrue(app.buttons["Send check-in"].waitForExistence(timeout: 2))
        XCTAssertEqual(editor.value as? String, "Keep this draft.")
    }
}
