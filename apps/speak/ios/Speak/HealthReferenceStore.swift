import Foundation
import HealthKit

@MainActor
final class HealthReferenceStore: ObservableObject {
    enum Category: String, CaseIterable, Hashable {
        case heartRate = "Heart rate"
        case heartRateVariability = "Heart-rate variability"
        case height = "Height"
        case bodyMass = "Body mass"
        case bodyTemperature = "Body temperature"
    }

    @Published private(set) var status = "Not requested"
    @Published private(set) var availableCategories: Set<Category> = []
    @Published private(set) var lastError: String?

    private let store = HKHealthStore()

    func requestReadAuthorization() {
        guard HKHealthStore.isHealthDataAvailable() else {
            status = "Unavailable"
            lastError = "Health data unavailable"
            return
        }
        let readTypes = Set(typeMap().values)
        store.requestAuthorization(toShare: [], read: readTypes) { [weak self] success, error in
            Task { @MainActor in
                guard let self else { return }
                if let error {
                    self.status = "Denied or unavailable"
                    self.lastError = error.localizedDescription
                    return
                }
                self.status = success ? "Requested" : "Denied or unavailable"
                if success { self.refreshAvailability() }
            }
        }
    }

    private func typeMap() -> [Category: HKQuantityType] {
        var result: [Category: HKQuantityType] = [:]
        let mappings: [(Category, HKQuantityTypeIdentifier)] = [
            (.heartRate, .heartRate),
            (.heartRateVariability, .heartRateVariabilitySDNN),
            (.height, .height),
            (.bodyMass, .bodyMass),
            (.bodyTemperature, .bodyTemperature)
        ]
        for (category, identifier) in mappings {
            if let type = HKObjectType.quantityType(forIdentifier: identifier) { result[category] = type }
        }
        return result
    }

    private func refreshAvailability() {
        availableCategories.removeAll()
        for (category, type) in typeMap() {
            let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
            let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { [weak self] _, samples, _ in
                guard let self, samples?.isEmpty == false else { return }
                Task { @MainActor in self.availableCategories.insert(category) }
            }
            store.execute(query)
        }
    }
}
