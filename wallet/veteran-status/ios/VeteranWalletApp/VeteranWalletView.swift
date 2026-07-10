import PassKit
import SwiftUI

struct VeteranWalletView: View {
    @Environment(\.scenePhase) private var scenePhase

    @StateObject private var biometricGate = BiometricPrivacyGate()
    @State private var pass: PKPass?
    @State private var isPreparingPass = false
    @State private var errorMessage: String?
    @State private var showingAddPass = false

    private let service = WalletPassService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 22) {
                    passPreview
                    biometricPrivacyPanel
                    addToWalletButton
                    safetyPanel

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }
                .padding()
            }
            .navigationTitle("Veteran Wallet")
            .sheet(isPresented: $showingAddPass) {
                if let pass {
                    AddPassSheet(pass: pass)
                }
            }
            .onChange(of: scenePhase) { newPhase in
                if newPhase != .active {
                    biometricGate.lock()
                    pass = nil
                    showingAddPass = false
                }
            }
        }
    }

    private var passPreview: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Veteran Status Card")
                    .font(.title2.bold())
                Spacer()
                Image(systemName: biometricGate.isUnlocked ? "checkmark.seal.fill" : "lock.fill")
                    .font(.title2)
                    .accessibilityLabel(biometricGate.isUnlocked ? "Verified status visible" : "Details locked")
            }

            Divider()
                .overlay(.white.opacity(0.45))

            ZStack {
                protectedPassFields
                    .blur(radius: biometricGate.isUnlocked ? 0 : 12)
                    .redacted(reason: biometricGate.isUnlocked ? [] : .placeholder)
                    .accessibilityHidden(!biometricGate.isUnlocked)
                    .allowsHitTesting(biometricGate.isUnlocked)
                    .animation(.easeInOut(duration: 0.22), value: biometricGate.isUnlocked)

                if !biometricGate.isUnlocked {
                    lockedDetailsOverlay
                }
            }

            Text(biometricGate.isUnlocked ? "Sensitive details are visible until the app leaves the foreground." : "Details stay blurred until Face ID or Touch ID succeeds.")
                .font(.caption)
                .opacity(0.82)
        }
        .foregroundStyle(.white)
        .padding(24)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.11, green: 0.22, blue: 0.43),
                    Color(red: 0.06, green: 0.10, blue: 0.22)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(radius: 12, y: 8)
        .accessibilityElement(children: .contain)
    }

    private var protectedPassFields: some View {
        VStack(alignment: .leading, spacing: 10) {
            labeledValue(label: "Status", value: "Verified Veteran")
            labeledValue(label: "Issuer", value: "Veteran Status Wallet Pilot")
            labeledValue(label: "Wallet payload", value: "Opaque verification token only")
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var lockedDetailsOverlay: some View {
        VStack(spacing: 10) {
            Image(systemName: "faceid")
                .font(.largeTitle)
            Text("Biometric unlock required")
                .font(.headline)
            Text("Face ID or Touch ID is required before card details are shown or the pass is prepared.")
                .font(.caption)
                .multilineTextAlignment(.center)
                .opacity(0.86)
            Button {
                Task { await unlockDetails() }
            } label: {
                Label("Unlock Details", systemImage: "lock.open")
            }
            .buttonStyle(.borderedProminent)
            .tint(.white.opacity(0.24))
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(.black.opacity(0.34))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Veteran Status details are hidden. Biometric unlock is required.")
    }

    private var biometricPrivacyPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(biometricGate.isUnlocked ? "Details unlocked" : "Details protected", systemImage: biometricGate.isUnlocked ? "faceid" : "lock.rectangle")
                .font(.headline)
            Text("The app uses iOS LocalAuthentication so Face ID or Touch ID must succeed before any Veteran Status details are unblurred or before the Wallet pass is fetched.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("The biometric check is local to the device; the app never receives or stores raw biometric data.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var addToWalletButton: some View {
        Button {
            Task { await unlockThenPreparePass() }
        } label: {
            HStack(spacing: 10) {
                if isPreparingPass {
                    ProgressView()
                } else {
                    Image(systemName: biometricGate.isUnlocked ? "wallet.pass" : "faceid")
                }
                Text(addButtonTitle)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
        .buttonStyle(.borderedProminent)
        .disabled(isPreparingPass || !PKPassLibrary.isPassLibraryAvailable())
        .accessibilityHint("Requires Face ID or Touch ID before downloading the signed Wallet pass and opening Apple's add-pass sheet.")
    }

    private var addButtonTitle: String {
        if isPreparingPass { return "Preparing Pass…" }
        return biometricGate.isUnlocked ? "Add Veteran Status to Apple Wallet" : "Unlock Before Adding to Wallet"
    }

    private var safetyPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Developer-presentation boundary", systemImage: "lock.shield")
                .font(.headline)
            Text("This is a PassKit status-pass flow for review and pilot discussion. It is not an official government identity credential unless issued through an authorized government program.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("Production enrollment must use consent, authorization, eligibility verification, revocation/update support, server-side token validation, and biometric-gated local display.")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func labeledValue(label: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label.uppercased())
                .font(.caption.bold())
                .opacity(0.78)
            Text(value)
                .font(.headline)
        }
    }

    @MainActor
    private func unlockDetails() async {
        errorMessage = nil
        let unlocked = await biometricGate.unlock()
        if !unlocked {
            errorMessage = biometricGate.lastErrorMessage
        }
    }

    @MainActor
    private func unlockThenPreparePass() async {
        errorMessage = nil

        if !biometricGate.isUnlocked {
            let unlocked = await biometricGate.unlock()
            guard unlocked else {
                errorMessage = biometricGate.lastErrorMessage
                return
            }
        }

        await preparePass()
    }

    @MainActor
    private func preparePass() async {
        isPreparingPass = true
        errorMessage = nil
        defer { isPreparingPass = false }

        do {
            let loadedPass = try await service.fetchVeteranStatusPass()
            pass = loadedPass
            showingAddPass = true
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    VeteranWalletView()
}
