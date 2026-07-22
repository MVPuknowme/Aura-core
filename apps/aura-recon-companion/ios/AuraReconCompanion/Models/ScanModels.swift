import Foundation

enum ScanProfile: String, Codable, CaseIterable, Identifiable {
    case dnsPassive = "dns-passive"
    case webMetadata = "web-metadata"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dnsPassive: return "DNS passive"
        case .webMetadata: return "DNS + HTTPS metadata"
        }
    }
}

struct ScanRequest: Codable {
    let target: String
    let authorized: Bool
    let profile: ScanProfile
}

struct Finding: Codable, Identifiable {
    let category: String
    let source: String
    let value: JSONValue

    var id: String { "\(category)-\(source)-\(value.description)" }
}

struct ScanReport: Codable {
    let scanID: String
    let target: String
    let profile: ScanProfile
    let startedAt: Date
    let completedAt: Date
    let findings: [Finding]
    let evidenceSHA256: String
    let limitations: [String]

    enum CodingKeys: String, CodingKey {
        case scanID = "scan_id"
        case target
        case profile
        case startedAt = "started_at"
        case completedAt = "completed_at"
        case findings
        case evidenceSHA256 = "evidence_sha256"
        case limitations
    }
}

enum JSONValue: Codable, CustomStringConvertible {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() { self = .null }
        else if let value = try? container.decode(Bool.self) { self = .bool(value) }
        else if let value = try? container.decode(Double.self) { self = .number(value) }
        else if let value = try? container.decode(String.self) { self = .string(value) }
        else if let value = try? container.decode([String: JSONValue].self) { self = .object(value) }
        else { self = .array(try container.decode([JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }

    var description: String {
        switch self {
        case .string(let value): return value
        case .number(let value): return String(value)
        case .bool(let value): return String(value)
        case .object(let value): return value.map { "\($0): \($1.description)" }.sorted().joined(separator: "\n")
        case .array(let value): return value.map(\.description).joined(separator: "\n")
        case .null: return "null"
        }
    }
}
