import Foundation
import XCTest
@testable import SpeakCore

final class SessionReceiptTests: XCTestCase {
    func testReceiptChainLinksDigestsWithoutRawPhysiology() {
        let t = Date(timeIntervalSince1970: 1_700_000_000)
        let first = SessionReceipt.make(previousDigest: nil, event: .init(type: .sensorConnected, timestamp: t, profileID: "ble-heart-rate"))
        let second = SessionReceipt.make(previousDigest: first.digest, event: .init(type: .sessionConfirmed, timestamp: t.addingTimeInterval(1), profileID: "ble-heart-rate"))
        XCTAssertEqual(first.digest.count, 64)
        XCTAssertEqual(second.previousDigest, first.digest)
        XCTAssertNotEqual(second.digest, first.digest)
        XCTAssertNil(second.event.rawMeasurement)
    }

    func testChangingEventChangesDigest() {
        let t = Date(timeIntervalSince1970: 1_700_000_000)
        let confirmed = SessionReceipt.make(previousDigest: nil, event: .init(type: .sessionConfirmed, timestamp: t, profileID: "profile"))
        let revoked = SessionReceipt.make(previousDigest: nil, event: .init(type: .sessionRevoked, timestamp: t, profileID: "profile"))
        XCTAssertNotEqual(confirmed.digest, revoked.digest)
    }
}
