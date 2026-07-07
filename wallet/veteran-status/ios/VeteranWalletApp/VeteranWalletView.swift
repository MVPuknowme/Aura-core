import PassKit
import SwiftUI

struct VeteranWalletView: View {
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
        }
    }

    private var passPreview: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .firstTextBaseline) {
                Text("Veteran Status Card")
                    .font(.title2.bold())
                Spacer()
                Image(systemName: "checkmark.seal.fill")
                    .font(.title2)
                    .accessibilityLabel("Verified status")
            }

            Divider()
                .overlay(.white.opacity(0.45))

            VStack(alignment: .leading, spacing: 10) {
                labeledValue(label: "Status", value: "Verified Veteran")
                labeledValue(label: "Issuer", value: "SKYGRID / Aura pilot")
                labeledValue(label: "Wallet payload", value: "Opaque verification token only")
            }

            Text("No sensitive veteran identifiers or benefit details belong in this Wallet pass.")
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
        .accessibilityElement(children: .combine)
    }

    private var addToWalletButton: some View {
        Button {
            Task { await preparePass() }
        } label: {
            HStack(spacing: 10) {
                if isPreparingPass {
                    ProgressView()
                } else {
                    Image(systemName: "wallet.pass")
                }
                Text(isPreparingPass ? "Preparing Pass…" : "Add Veteran Status to Apple Wallet")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
        .buttonStyle(.borderedProminent)
        .disabled(isPreparingPass || !PKPassLibrary.isPassLibraryAvailable())
        .accessibilityHint("Downloads a signed Wallet pass from the authorized pass server and opens Apple's add-pass sheet.")
    }

    private var safetyPanel: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Developer-presentation boundary", systemImage: "lock.shield")
                .font(.headline)
            Text("This is a PassKit status-pass flow for review and pilot discussion. It is not an official government identity credential unless issued through an authorized government program.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            Text("Production enrollment must use consent, authorization, eligibility verification, revocation/update support, and server-side token validation.")
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
