import XCTest
@testable import SpeakCore

final class InferenceGateTests: XCTestCase {
    func testPhysiologyProfileCannotProduceExperimentalCandidate() {
        let context = InferenceGate.Context(sensorKind: .physiologyReference,
                                            sampleFresh: true,
                                            signalQuality: .good,
                                            sessionConfirmed: true,
                                            experimentalInputEnabled: true,
                                            confidence: 0.99)
        XCTAssertEqual(InferenceGate.evaluate(context), .blocked(.experimentalSensorRequired))
    }

    func testPassingCandidateStillRequiresUserConfirmation() {
        let context = InferenceGate.Context(sensorKind: .experimentalNeural,
                                            sampleFresh: true,
                                            signalQuality: .good,
                                            sessionConfirmed: true,
                                            experimentalInputEnabled: true,
                                            confidence: 0.90)
        XCTAssertEqual(InferenceGate.evaluate(context), .candidateRequiresUserConfirmation)
    }

    func testLowConfidenceStaysBlocked() {
        let context = InferenceGate.Context(sensorKind: .experimentalNeural,
                                            sampleFresh: true,
                                            signalQuality: .good,
                                            sessionConfirmed: true,
                                            experimentalInputEnabled: true,
                                            confidence: 0.40)
        XCTAssertEqual(InferenceGate.evaluate(context), .blocked(.confidenceInsufficient))
    }
}
