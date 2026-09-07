import XCTest
@testable import AuraPresenceCore

final class AuraPresenceModelTests: XCTestCase {
    func testSessionStartsReadyWhenDigitalPresenceIsAvailable() {
        let session = AuraPresenceSession()

        XCTAssertEqual(session.state, .ready)
        XCTAssertTrue(session.isAvailable)
        XCTAssertTrue(session.response.isEmpty)
    }

    func testComeSeeMeOpensListeningState() {
        var session = AuraPresenceSession()

        session.beginCheckIn()

        XCTAssertEqual(session.state, .listening)
        XCTAssertNil(session.validationMessage)
    }

    func testNonemptyCheckInMovesToRespondingWithoutSendingAnything() {
        var session = AuraPresenceSession()
        session.beginCheckIn()
        session.checkIn = "  I could use a calm moment.  "

        let result = session.submitCheckIn()

        XCTAssertEqual(result, .accepted)
        XCTAssertEqual(session.state, .responding)
        XCTAssertEqual(session.checkIn, "I could use a calm moment.")
        XCTAssertEqual(
            session.response,
            "Aura is here as a digital support presence. Your check-in remains on this device."
        )
    }

    func testEmptyCheckInStaysListeningAndShowsValidation() {
        var session = AuraPresenceSession()
        session.beginCheckIn()
        session.checkIn = "   \n"

        let result = session.submitCheckIn()

        XCTAssertEqual(result, .empty)
        XCTAssertEqual(session.state, .listening)
        XCTAssertEqual(session.validationMessage, "Write a short check-in first.")
    }

    func testOfflineSessionFailsClosedAndPreservesDraft() {
        var session = AuraPresenceSession()
        session.beginCheckIn()
        session.checkIn = "Please keep this draft."
        session.setAvailable(false)

        let result = session.submitCheckIn()

        XCTAssertEqual(result, .unavailable)
        XCTAssertEqual(session.state, .offline)
        XCTAssertEqual(session.checkIn, "Please keep this draft.")
        XCTAssertEqual(
            session.response,
            "Aura is offline. Your check-in is still on this device and was not sent."
        )
    }

    func testCompletingResponseReturnsToReadyOnlyWhileAvailable() {
        var session = AuraPresenceSession()
        session.beginCheckIn()
        session.checkIn = "Checking in."
        XCTAssertEqual(session.submitCheckIn(), .accepted)

        session.completeResponse()
        XCTAssertEqual(session.state, .ready)

        session.setAvailable(false)
        session.completeResponse()
        XCTAssertEqual(session.state, .offline)
    }

    func testCompletedResponseClearsDraftAndAllowsAnotherCheckIn() {
        var session = AuraPresenceSession()
        session.beginCheckIn()
        session.checkIn = "First check-in."
        XCTAssertEqual(session.submitCheckIn(), .accepted)

        session.completeResponse()
        session.beginCheckIn()

        XCTAssertEqual(session.state, .listening)
        XCTAssertTrue(session.checkIn.isEmpty)
    }

    func testCheckInIsLimitedToTwoHundredEightyCharacters() {
        var session = AuraPresenceSession()

        session.checkIn = String(repeating: "a", count: 300)

        XCTAssertEqual(session.checkIn.count, 280)
    }
}
