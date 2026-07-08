import Foundation
import LocalAuthentication

@MainActor
final class BiometricPrivacyGate: ObservableObject {
    @Published private(set) var isUnlocked = false
    @Published private(set) var lastErrorMessage: String?

    private let policy: LAPolicy = .deviceOwnerAuthenticationWithBiometrics
    private let reason = "Unlock Veteran Status Wallet pass details before viewing or adding this pass."

    func lock() {
        isUnlocked = false
        lastErrorMessage = nil
    }

    func unlock() async -> Bool {
        lastErrorMessage = nil

        let context = LAContext()
        context.localizedCancelTitle = "Keep Hidden"

        var evaluationError: NSError?
        guard context.canEvaluatePolicy(policy, error: &evaluationError) else {
            lastErrorMessage = "Face ID or Touch ID is required before Veteran Status details can be shown."
            return false
        }

        do {
            let success = try await context.evaluatePolicy(policy, localizedReason: reason)
            isUnlocked = success
            return success
        } catch {
            isUnlocked = false
            lastErrorMessage = error.localizedDescription
            return false
        }
    }
}
