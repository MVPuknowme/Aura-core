import Foundation

final class AuraShieldNumberStore {
    static let suiteName = "group.net.skygrid.aurashield"
    static let numbersKey = "managedNumbers"

    static var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    static func saveNumbers(_ numbers: [String]) {
        let cleaned = numbers
            .map { $0.filter(\.isNumber) }
            .filter { !$0.isEmpty }
        sharedDefaults?.set(cleaned, forKey: numbersKey)
    }

    static func loadNumbers() -> [String] {
        sharedDefaults?.stringArray(forKey: numbersKey) ?? []
    }
}
