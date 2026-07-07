import Foundation
import PassKit

struct VeteranWalletConfiguration {
    /// Replace with the HTTPS host that signs and returns `.pkpass` files.
    /// For a local iPhone test, use a trusted tunnel URL instead of localhost.
    var passBaseURL: URL = URL(string: "https://aura-sky.skygrid-protocol.net")!
    var demoUserToken: String = "replace-with-authenticated-session-token"
}

enum WalletPassServiceError: LocalizedError {
    case walletUnavailable
    case addPassesUnavailable
    case invalidEndpoint
    case requestFailed(Int)
    case invalidPassData

    var errorDescription: String? {
        switch self {
        case .walletUnavailable:
            return "Apple Wallet is not available on this device."
        case .addPassesUnavailable:
            return "This device cannot add Wallet passes right now."
        case .invalidEndpoint:
            return "The Wallet pass endpoint is invalid."
        case .requestFailed(let statusCode):
            return "The pass server returned HTTP \(statusCode)."
        case .invalidPassData:
            return "The server response was not a valid signed Apple Wallet pass."
        }
    }
}

struct WalletPassService {
    let configuration: VeteranWalletConfiguration

    init(configuration: VeteranWalletConfiguration = VeteranWalletConfiguration()) {
        self.configuration = configuration
    }

    func fetchVeteranStatusPass() async throws -> PKPass {
        guard PKPassLibrary.isPassLibraryAvailable() else {
            throw WalletPassServiceError.walletUnavailable
        }

        guard PKAddPassesViewController.canAddPasses() else {
            throw WalletPassServiceError.addPassesUnavailable
        }

        let endpoint = configuration.passBaseURL.appendingPathComponent("api/wallet/veteran-pass")
        var components = URLComponents(url: endpoint, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "format", value: "pkpass")]
        guard let url = components?.url else {
            throw WalletPassServiceError.invalidEndpoint
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/vnd.apple.pkpass", forHTTPHeaderField: "Accept")
        request.setValue("Bearer \(configuration.demoUserToken)", forHTTPHeaderField: "Authorization")
        request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw WalletPassServiceError.invalidPassData
        }

        guard httpResponse.statusCode == 200 else {
            throw WalletPassServiceError.requestFailed(httpResponse.statusCode)
        }

        do {
            return try PKPass(data: data)
        } catch {
            throw WalletPassServiceError.invalidPassData
        }
    }
}
