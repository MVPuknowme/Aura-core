import SpeakCore
import SwiftUI

struct SelfConnectionView: View {
    @StateObject private var store = SelfConnectionStore()

    private var sessionLabel: String {
        if store.state.sessionConfirmed { return "Session confirmed" }
        if store.state.physiologyAvailable || store.state.healthReferenceAvailable { return "Physiology available" }
        if store.state.sensorConnected { return "Sensor connected" }
        return "Disconnected"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("SELF CONNECTION").font(.title.bold())
                    Text(sessionLabel)
                        .font(.title2.weight(.semibold))
                        .accessibilityLabel("Self connection status: \(sessionLabel)")

                    Button("CONNECT TO ME") { store.connectToMe() }
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                        .accessibilityHint("Starts discovery for supported, allowlisted Bluetooth sensors")

                    BluetoothPanel(manager: store.ble, onSelect: store.selectSensor)
                    HealthPanel(health: store.health, request: store.requestHealthReferences)

                    GroupBox("Session attribution") {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("A confirmed session means you explicitly assert that the selected supported sensor is being used for this Speak session. It is not biometric identity proof.")
                            if store.state.sessionConfirmed {
                                Button("Revoke self session", role: .destructive) { store.revokeSelfSession() }
                            } else {
                                Button("Confirm this is my current sensor session") { store.confirmSelfSession() }
                                    .disabled(!store.state.sensorConnected)
                            }
                        }
                    }

                    GroupBox("Experimental input") {
                        VStack(alignment: .leading, spacing: 10) {
                            Toggle("Experimental Input", isOn: Binding(
                                get: { store.state.experimentalInputEnabled },
                                set: { store.setExperimentalInputEnabled($0) }
                            ))
                            .disabled(store.state.selectedProfile?.kind != .experimentalNeural || !store.state.sessionConfirmed)
                            Text("OFF by default. The built-in heart-rate profile is physiology/reference data only and cannot enable a neural inference path.")
                                .font(.footnote)
                            Text("Signal quality: \(store.state.signalQuality.rawValue)")
                            Text("Inference: no unconfirmed candidate is spoken or sent")
                            Text("Final communication: requires explicit user confirmation")
                        }
                    }

                    GroupBox("Measurement boundary") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(store.latestMeasuredSummary)
                            Text("Measured data, model inference, and user-confirmed communication remain separate.")
                                .font(.footnote)
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Speak")
        }
    }
}

private struct BluetoothPanel: View {
    @ObservedObject var manager: BLESensorManager
    let onSelect: (UUID) -> Void

    var body: some View {
        GroupBox("Bluetooth sensor") {
            VStack(alignment: .leading, spacing: 10) {
                Text("Bluetooth: \(manager.bluetoothState)")
                Text("Selected sensor: \(manager.selectedSensorName ?? "None")")
                if let error = manager.lastError { Text(error).foregroundStyle(.red) }
                ForEach(manager.candidates) { candidate in
                    Button { onSelect(candidate.id) } label: {
                        VStack(alignment: .leading) {
                            Text(candidate.name)
                            Text("Supported profile: \(candidate.profile.displayName)").font(.caption)
                        }
                    }
                    .accessibilityHint("Connects only after you choose this supported sensor")
                }
            }
        }
    }
}

private struct HealthPanel: View {
    @ObservedObject var health: HealthReferenceStore
    let request: () -> Void

    var body: some View {
        GroupBox("Health references") {
            VStack(alignment: .leading, spacing: 10) {
                Text("Health access: \(health.status)")
                Button("Request read-only Health access", action: request)
                if health.availableCategories.isEmpty {
                    Text("Available references: none observed")
                } else {
                    Text("Available references: \(health.availableCategories.map(\.rawValue).sorted().joined(separator: ", "))")
                }
                Text("Raw HealthKit values are not displayed here or uploaded by this feature.").font(.footnote)
                if let error = health.lastError { Text(error).foregroundStyle(.red) }
            }
        }
    }
}
