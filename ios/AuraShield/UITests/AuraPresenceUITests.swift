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

        let restoreControl = app.buttons["Restore Aura availability"]
        XCTAssertTrue(restoreControl.waitForExistence(timeout: 2))
        restoreControl.tap()

        let listeningExpectation = XCTNSPredicateExpectation(
            predicate: NSPredicate(format: "label == %@", "Aura status: Listening"),
            object: status
        )
        XCTAssertEqual(XCTWaiter.wait(for: [listeningExpectation], timeout: 2), .completed)
        XCTAssertEqual(editor.value as? String, "Keep this draft.")

        let sendControl = app.buttons["Send check-in"]
        XCTAssertTrue(sendControl.waitForExistence(timeout: 2))
        sendControl.tap()

        let responseExpectation = XCTNSPredicateExpectation(
            predicate: NSPredicate(
                format: "label == %@",
                "Aura response: Aura is here as a digital support presence. Your check-in was not sent."
            ),
            object: response
        )
        XCTAssertEqual(XCTWaiter.wait(for: [responseExpectation], timeout: 2), .completed)
    }
}
