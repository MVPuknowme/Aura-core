import XCTest
@testable import SpeakCore

final class SelfConnectionStateTests: XCTestCase {
    func testConnectedPhysiologyDoesNotConfirmIdentity() {
        var state = SelfConnectionState.initial
        state = SelfConnectionReducer.reduce(state: state, event: .sensorConnected(.heartRate))
        XCTAssertTrue(state.sensorConnected)
        XCTAssertFalse(state.sessionConfirmed)
        XCTAssertFalse(state.experimentalInputEnabled)
    }

    func testExperimentalInputCannotEnableForPhysiologyOnlyProfile() {
        var state = SelfConnectionState.initial
        state = SelfConnectionReducer.reduce(state: state, event: .sensorConnected(.heartRate))
        state = SelfConnectionReducer.reduce(state: state, event: .confirmSelfSession)
        state = SelfConnectionReducer.reduce(state: state, event: .setExperimentalInput(true))
        XCTAssertFalse(state.experimentalInputEnabled)
    }

    func testDisconnectRevokesPendingCandidate() {
        var state = SelfConnectionState.initial
        state.pendingCandidate = "candidate"
        state.sessionConfirmed = true
        state.experimentalInputEnabled = true
        state = SelfConnectionReducer.reduce(state: state, event: .sensorDisconnected)
        XCTAssertNil(state.pendingCandidate)
        XCTAssertFalse(state.sessionConfirmed)
        XCTAssertFalse(state.experimentalInputEnabled)
    }
}
