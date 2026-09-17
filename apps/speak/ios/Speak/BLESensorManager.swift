import CoreBluetooth
import Foundation
import SpeakCore

struct BLECandidate: Identifiable, Equatable {
    let id: UUID
    let name: String
    let rssi: Int
    let profile: SensorProfile
}

@MainActor
final class BLESensorManager: NSObject, ObservableObject {
    @Published private(set) var bluetoothState = "Not started"
    @Published private(set) var candidates: [BLECandidate] = []
    @Published private(set) var selectedSensorName: String?
    @Published private(set) var lastError: String?

    var onEnvelope: ((SensorEnvelope) -> Void)?
    var onConnected: ((SensorProfile) -> Void)?
    var onDisconnected: (() -> Void)?

    private let profiles: [SensorProfile]
    private var central: CBCentralManager?
    private var pendingUserScan = false
    private var peripherals: [UUID: CBPeripheral] = [:]
    private var candidateProfiles: [UUID: SensorProfile] = [:]
    private var selectedProfile: SensorProfile?

    init(profiles: [SensorProfile] = [.heartRate]) {
        self.profiles = profiles
        super.init()
    }

    func startUserInitiatedScan() {
        guard !profiles.isEmpty else {
            lastError = "No supported sensor profile configured"
            return
        }
        pendingUserScan = true
        candidates.removeAll()
        lastError = nil
        if central == nil {
            central = CBCentralManager(delegate: self, queue: nil)
        } else if central?.state == .poweredOn {
            beginAllowlistedScan()
        }
    }

    func stopScan() {
        pendingUserScan = false
        central?.stopScan()
    }

    func selectSensor(id: UUID) {
        guard let peripheral = peripherals[id], let profile = candidateProfiles[id] else { return }
        stopScan()
        selectedProfile = profile
        selectedSensorName = peripheral.name ?? "Supported sensor"
        peripheral.delegate = self
        central?.connect(peripheral)
    }

    private func beginAllowlistedScan() {
        guard pendingUserScan, let central, central.state == .poweredOn else { return }
        let services = profiles.map { CBUUID(string: $0.serviceUUID) }
        bluetoothState = "Scanning supported sensors"
        central.scanForPeripherals(withServices: services, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
    }

    private func profile(for advertisementData: [String: Any]) -> SensorProfile? {
        let advertised = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID]) ?? []
        if let match = profiles.first(where: { advertised.contains(CBUUID(string: $0.serviceUUID)) }) {
            return match
        }
        return profiles.count == 1 ? profiles[0] : nil
    }
}

extension BLESensorManager: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            bluetoothState = "Available"
            beginAllowlistedScan()
        case .unauthorized:
            bluetoothState = "Denied"
            lastError = "Bluetooth access denied"
            pendingUserScan = false
            onDisconnected?()
        case .poweredOff:
            bluetoothState = "Off"
            pendingUserScan = false
            onDisconnected?()
        default:
            bluetoothState = "Unavailable"
            if central.state == .unsupported { lastError = "Bluetooth unavailable" }
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral,
                        advertisementData: [String : Any], rssi RSSI: NSNumber) {
        guard pendingUserScan, let profile = profile(for: advertisementData) else { return }
        peripherals[peripheral.identifier] = peripheral
        candidateProfiles[peripheral.identifier] = profile
        let candidate = BLECandidate(id: peripheral.identifier,
                                     name: peripheral.name ?? "Supported sensor",
                                     rssi: RSSI.intValue,
                                     profile: profile)
        if let index = candidates.firstIndex(where: { $0.id == candidate.id }) {
            candidates[index] = candidate
        } else {
            candidates.append(candidate)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        guard let profile = selectedProfile else {
            central.cancelPeripheralConnection(peripheral)
            return
        }
        peripheral.discoverServices([CBUUID(string: profile.serviceUUID)])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        lastError = error?.localizedDescription ?? "Connection failed"
        selectedProfile = nil
        selectedSensorName = nil
        onDisconnected?()
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral,
                        error: Error?) {
        selectedProfile = nil
        selectedSensorName = nil
        if let error { lastError = error.localizedDescription }
        onDisconnected?()
    }
}

extension BLESensorManager: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil, let profile = selectedProfile,
              let service = peripheral.services?.first(where: { $0.uuid == CBUUID(string: profile.serviceUUID) }) else {
            lastError = "Unsupported service"
            central?.cancelPeripheralConnection(peripheral)
            return
        }
        peripheral.discoverCharacteristics([CBUUID(string: profile.measurementCharacteristicUUID)], for: service)
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard error == nil, let profile = selectedProfile,
              let characteristic = service.characteristics?.first(where: { $0.uuid == CBUUID(string: profile.measurementCharacteristicUUID) }) else {
            lastError = "Unsupported characteristic"
            central?.cancelPeripheralConnection(peripheral)
            return
        }
        peripheral.setNotifyValue(true, for: characteristic)
        onConnected?(profile)
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        guard error == nil, let data = characteristic.value, let profile = selectedProfile else {
            lastError = error?.localizedDescription ?? "Sample unavailable"
            onDisconnected?()
            return
        }
        do {
            if profile == .heartRate {
                onEnvelope?(try HeartRateMeasurementParser.decode(data))
            } else {
                throw SensorDecodeError.unsupportedProfile
            }
        } catch {
            lastError = "Sample malformed or unsupported"
            onDisconnected?()
        }
    }
}
