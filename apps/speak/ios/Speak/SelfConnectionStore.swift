import Foundation
import SpeakCore

@MainActor
final class SelfConnectionStore: ObservableObject {
    @Published private(set) var state = SelfConnectionState.initial
    @Published private(set) var latestMeasuredSummary = "No sample"
    @Published private(set) var lastError: String?

    let ble: BLESensorManager
    let health: HealthReferenceStore

    init(ble: BLESensorManager = BLESensorManager(), health: HealthReferenceStore = HealthReferenceStore()) {
        self.ble = ble
        self.health = health
        bind()
    }

    func connectToMe() {
        lastError = nil
        ble.startUserInitiatedScan()
    }

    func selectSensor(id: UUID) {
        ble.selectSensor(id: id)
    }

    func requestHealthReferences() {
        health.requestReadAuthorization()
    }

    func confirmSelfSession() {
        apply(.confirmSelfSession)
    }

    func revokeSelfSession() {
        apply(.revokeSelfSession)
    }

    func setExperimentalInputEnabled(_ enabled: Bool) {
        apply(.setExperimentalInput(enabled))
    }

    private func bind() {
        ble.onConnected = { [weak self] profile in self?.apply(.sensorConnected(profile)) }
        ble.onDisconnected = { [weak self] in self?.apply(.sensorDisconnected) }
        ble.onEnvelope = { [weak self] envelope in
            guard let self else { return }
            latestMeasuredSummary = "Measured: \(Int(envelope.numericValue)) \(envelope.unit)"
            apply(.signalQuality(envelope.quality))
            apply(.physiologyAvailable(envelope.kind == .physiologyReference))
        }
    }

    private func apply(_ event: ConnectionEvent) {
        state = SelfConnectionReducer.reduce(state: state, event: event)
    }
}
