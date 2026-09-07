import Foundation

enum AuraPresenceState: String, CaseIterable, Equatable, Sendable {
    case ready = "Ready"
    case listening = "Listening"
    case responding = "Responding"
    case offline = "Offline"
}

enum CheckInSubmission: Equatable, Sendable {
    case accepted
    case empty
    case unavailable
}

struct AuraPresenceSession: Equatable, Sendable {
    static let maximumCheckInLength = 280

    static let digitalResponse =
        "Aura is here as a digital support presence. Your check-in remains on this device."

    static let offlineResponse =
        "Aura is offline. Your check-in is still on this device and was not sent."

    private(set) var state: AuraPresenceState
    private(set) var isAvailable: Bool
    private(set) var response: String
    private(set) var validationMessage: String?

    var checkIn = "" {
        didSet {
            if checkIn.count > Self.maximumCheckInLength {
                checkIn = String(checkIn.prefix(Self.maximumCheckInLength))
            }
        }
    }

    init(isAvailable: Bool = true) {
        self.isAvailable = isAvailable
        state = isAvailable ? .ready : .offline
        response = isAvailable ? "" : Self.offlineResponse
        validationMessage = nil
    }

    mutating func beginCheckIn() {
        guard isAvailable else {
            failClosed()
            return
        }

        state = .listening
        response = ""
        validationMessage = nil
    }

    @discardableResult
    mutating func submitCheckIn() -> CheckInSubmission {
        guard isAvailable else {
            failClosed()
            return .unavailable
        }

        let trimmedCheckIn = checkIn.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedCheckIn.isEmpty else {
            state = .listening
            validationMessage = "Write a short check-in first."
            return .empty
        }

        checkIn = trimmedCheckIn
        state = .responding
        response = Self.digitalResponse
        validationMessage = nil
        return .accepted
    }

    mutating func completeResponse() {
        state = isAvailable ? .ready : .offline
    }

    mutating func setAvailable(_ available: Bool) {
        isAvailable = available

        if available {
            state = .ready
            response = ""
            validationMessage = nil
        } else {
            failClosed()
        }
    }

    private mutating func failClosed() {
        state = .offline
        response = Self.offlineResponse
        validationMessage = nil
    }
}
