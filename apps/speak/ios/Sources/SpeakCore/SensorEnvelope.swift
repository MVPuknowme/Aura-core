import Foundation

public struct SensorEnvelope: Equatable, Codable, Sendable {
    public let profileID: String
    public let profileVersion: Int
    public let kind: SensorKind
    public let numericValue: Double
    public let unit: String
    public let timestamp: Date
    public let quality: SignalQuality

    public init(profileID: String, profileVersion: Int, kind: SensorKind,
                numericValue: Double, unit: String, timestamp: Date, quality: SignalQuality) {
        self.profileID = profileID
        self.profileVersion = profileVersion
        self.kind = kind
        self.numericValue = numericValue
        self.unit = unit
        self.timestamp = timestamp
        self.quality = quality
    }
}
