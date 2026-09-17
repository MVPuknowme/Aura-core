public enum InferenceBlockReason: Equatable, Sendable {
    case experimentalInputDisabled
    case experimentalSensorRequired
    case sampleStale
    case signalInsufficient
    case sessionUnconfirmed
    case confidenceInsufficient
}

public enum InferenceGateDecision: Equatable, Sendable {
    case blocked(InferenceBlockReason)
    case candidateRequiresUserConfirmation
}

public enum InferenceGate {
    public struct Context: Equatable, Sendable {
        public let sensorKind: SensorKind
        public let sampleFresh: Bool
        public let signalQuality: SignalQuality
        public let sessionConfirmed: Bool
        public let experimentalInputEnabled: Bool
        public let confidence: Double

        public init(sensorKind: SensorKind, sampleFresh: Bool, signalQuality: SignalQuality,
                    sessionConfirmed: Bool, experimentalInputEnabled: Bool, confidence: Double) {
            self.sensorKind = sensorKind
            self.sampleFresh = sampleFresh
            self.signalQuality = signalQuality
            self.sessionConfirmed = sessionConfirmed
            self.experimentalInputEnabled = experimentalInputEnabled
            self.confidence = confidence
        }
    }

    public static let minimumConfidence = 0.80

    public static func evaluate(_ context: Context) -> InferenceGateDecision {
        guard context.experimentalInputEnabled else { return .blocked(.experimentalInputDisabled) }
        guard context.sensorKind == .experimentalNeural else { return .blocked(.experimentalSensorRequired) }
        guard context.sampleFresh else { return .blocked(.sampleStale) }
        guard context.signalQuality == .good else { return .blocked(.signalInsufficient) }
        guard context.sessionConfirmed else { return .blocked(.sessionUnconfirmed) }
        guard context.confidence >= minimumConfidence else { return .blocked(.confidenceInsufficient) }
        return .candidateRequiresUserConfirmation
    }
}
