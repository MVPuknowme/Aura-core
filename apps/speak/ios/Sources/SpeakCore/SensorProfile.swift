import Foundation

public enum SensorKind: String, Codable, Sendable {
    case physiologyReference
    case experimentalNeural
}

public enum SignalQuality: String, Codable, Sendable {
    case unknown
    case insufficient
    case good
}

public struct SensorProfile: Equatable, Codable, Sendable {
    public let id: String
    public let version: Int
    public let displayName: String
    public let kind: SensorKind
    public let serviceUUID: String
    public let measurementCharacteristicUUID: String
    public let unit: String

    public init(id: String, version: Int = 1, displayName: String, kind: SensorKind,
                serviceUUID: String, measurementCharacteristicUUID: String, unit: String) {
        self.id = id
        self.version = version
        self.displayName = displayName
        self.kind = kind
        self.serviceUUID = serviceUUID.uppercased()
        self.measurementCharacteristicUUID = measurementCharacteristicUUID.uppercased()
        self.unit = unit
    }

    public static let heartRate = SensorProfile(
        id: "ble-heart-rate",
        displayName: "BLE Heart Rate",
        kind: .physiologyReference,
        serviceUUID: "180D",
        measurementCharacteristicUUID: "2A37",
        unit: "bpm"
    )
}

public enum SensorDecodeError: Error, Equatable {
    case malformedMeasurement
    case unsupportedProfile
}

public enum HeartRateMeasurementParser {
    public static func decode(_ data: Data, timestamp: Date = Date()) throws -> SensorEnvelope {
        guard data.count >= 2 else { throw SensorDecodeError.malformedMeasurement }
        let flags = data[data.startIndex]
        let isUInt16 = (flags & 0x01) != 0
        let bpm: Double
        if isUInt16 {
            guard data.count >= 3 else { throw SensorDecodeError.malformedMeasurement }
            let low = UInt16(data[data.startIndex + 1])
            let high = UInt16(data[data.startIndex + 2]) << 8
            bpm = Double(low | high)
        } else {
            bpm = Double(data[data.startIndex + 1])
        }
        return SensorEnvelope(
            profileID: SensorProfile.heartRate.id,
            profileVersion: SensorProfile.heartRate.version,
            kind: .physiologyReference,
            numericValue: bpm,
            unit: "bpm",
            timestamp: timestamp,
            quality: .good
        )
    }
}
