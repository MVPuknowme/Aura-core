import Foundation
import XCTest
@testable import SpeakCore

final class SensorProfileTests: XCTestCase {
    func testHeartRateProfileUsesAllowlistedServiceAndCharacteristic() {
        XCTAssertEqual(SensorProfile.heartRate.serviceUUID, "180D")
        XCTAssertEqual(SensorProfile.heartRate.measurementCharacteristicUUID, "2A37")
        XCTAssertEqual(SensorProfile.heartRate.kind, .physiologyReference)
    }

    func testHeartRateParserDecodes8BitMeasurement() throws {
        let envelope = try HeartRateMeasurementParser.decode(Data([0x00, 72]))
        XCTAssertEqual(envelope.numericValue, 72)
        XCTAssertEqual(envelope.unit, "bpm")
        XCTAssertEqual(envelope.kind, .physiologyReference)
    }

    func testHeartRateParserDecodes16BitMeasurement() throws {
        let envelope = try HeartRateMeasurementParser.decode(Data([0x01, 0x2C, 0x01]))
        XCTAssertEqual(envelope.numericValue, 300)
    }

    func testHeartRateParserRejectsMalformedMeasurement() {
        XCTAssertThrowsError(try HeartRateMeasurementParser.decode(Data([0x01, 0x48])))
    }
}
