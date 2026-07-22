import Foundation

actor APIClient {
    static let shared = APIClient()

    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init() {
        encoder = JSONEncoder()
        decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
    }

    func runScan(
        target: String,
        authorized: Bool,
        profile: ScanProfile,
        baseURL: URL
    ) async throws -> ScanReport {
        let endpoint = baseURL.appending(path: "api/v1/scans")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 20
        request.httpBody = try encoder.encode(
            ScanRequest(target: target, authorized: authorized, profile: profile)
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        guard (200..<300).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Request failed"
            throw APIError.server(status: http.statusCode, message: message)
        }
        return try decoder.decode(ScanReport.self, from: data)
    }
}

enum APIError: LocalizedError {
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .server(let status, let message):
            return "Server returned \(status): \(message)"
        }
    }
}
