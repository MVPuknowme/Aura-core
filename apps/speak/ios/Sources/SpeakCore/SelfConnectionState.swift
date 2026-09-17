public struct SelfConnectionState: Equatable, Sendable {
    public var selectedProfile: SensorProfile?
    public var sensorConnected: Bool
    public var physiologyAvailable: Bool
    public var healthReferenceAvailable: Bool
    public var sessionConfirmed: Bool
    public var experimentalInputEnabled: Bool
    public var signalQuality: SignalQuality
    public var pendingCandidate: String?

    public static let initial = SelfConnectionState(
        selectedProfile: nil,
        sensorConnected: false,
        physiologyAvailable: false,
        healthReferenceAvailable: false,
        sessionConfirmed: false,
        experimentalInputEnabled: false,
        signalQuality: .unknown,
        pendingCandidate: nil
    )
}

public enum ConnectionEvent: Sendable {
    case sensorConnected(SensorProfile)
    case sensorDisconnected
    case physiologyAvailable(Bool)
    case healthReferenceAvailable(Bool)
    case signalQuality(SignalQuality)
    case confirmSelfSession
    case revokeSelfSession
    case setExperimentalInput(Bool)
    case setPendingCandidate(String?)
}

public enum SelfConnectionReducer {
    public static func reduce(state: SelfConnectionState, event: ConnectionEvent) -> SelfConnectionState {
        var next = state
        switch event {
        case .sensorConnected(let profile):
            next.selectedProfile = profile
            next.sensorConnected = true
            next.physiologyAvailable = profile.kind == .physiologyReference
            next.sessionConfirmed = false
            next.experimentalInputEnabled = false
            next.pendingCandidate = nil
        case .sensorDisconnected:
            next.selectedProfile = nil
            next.sensorConnected = false
            next.physiologyAvailable = false
            next.sessionConfirmed = false
            next.experimentalInputEnabled = false
            next.signalQuality = .unknown
            next.pendingCandidate = nil
        case .physiologyAvailable(let available):
            next.physiologyAvailable = available
        case .healthReferenceAvailable(let available):
            next.healthReferenceAvailable = available
        case .signalQuality(let quality):
            next.signalQuality = quality
            if quality != .good { next.pendingCandidate = nil }
        case .confirmSelfSession:
            next.sessionConfirmed = next.sensorConnected
        case .revokeSelfSession:
            next.sessionConfirmed = false
            next.experimentalInputEnabled = false
            next.pendingCandidate = nil
        case .setExperimentalInput(let enabled):
            next.experimentalInputEnabled = enabled
                && next.sensorConnected
                && next.sessionConfirmed
                && next.selectedProfile?.kind == .experimentalNeural
            if !next.experimentalInputEnabled { next.pendingCandidate = nil }
        case .setPendingCandidate(let candidate):
            next.pendingCandidate = candidate
        }
        return next
    }
}
