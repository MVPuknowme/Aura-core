//
//  oauth_safari_setup.swift
//  Aura-Core / SKYGRID
//
//  Purpose:
//  Privacy-hardened OAuth/Safari authentication setup for iOS.
//
//  Operator intent:
//  Ensure Aura-Core / SKYGRID authentication flows do not monitor user devices,
//  do not collect unnecessary device identifiers, and do not retain Safari/browser
//  session data beyond what is required for explicit user authentication.
//
//  Important boundary:
//  No app code can guarantee that a device is never monitored by the operating system,
//  carrier, MDM profile, ISP, browser provider, installed extensions, or third-party services.
//  This file ensures this app-level OAuth flow does not add monitoring, fingerprinting,
//  silent telemetry, or persistent web tracking.
//

import Foundation

#if canImport(AuthenticationServices) && canImport(UIKit)
import AuthenticationServices
import UIKit

// MARK: - Privacy Policy For This Flow

/// Privacy rules enforced by this OAuth helper.
struct OAuthSafariPrivacyPolicy {
    /// Request an ephemeral browser session so Safari/browser cookies and website data
    /// are not shared with the user's normal browser session where the OS/browser supports it.
    static let preferEphemeralSession = true

    /// Do not request location for OAuth.
    static let collectLocation = false

    /// Do not collect device fingerprinting signals for OAuth.
    static let collectDeviceFingerprint = false

    /// Do not log full callback URLs because they can contain sensitive OAuth data.
    static let logCallbackURL = false

    /// Do not send analytics events from this OAuth helper.
    static let sendAnalytics = false

    /// Only allow HTTPS authorization endpoints.
    static let requireHTTPS = true
}

// MARK: - OAuth Error

enum OAuthSafariSetupError: LocalizedError {
    case invalidAuthorizationURL
    case nonHTTPSAuthorizationURL
    case missingPresentationAnchor
    case callbackMissing
    case callbackRejected

    var errorDescription: String? {
        switch self {
        case .invalidAuthorizationURL:
            return "Invalid OAuth authorization URL."
        case .nonHTTPSAuthorizationURL:
            return "OAuth authorization URL must use HTTPS."
        case .missingPresentationAnchor:
            return "Missing presentation anchor for OAuth session."
        case .callbackMissing:
            return "OAuth callback was missing."
        case .callbackRejected:
            return "OAuth callback was rejected."
        }
    }
}

// MARK: - Callback Validation

/// Keeps callback validation narrow and explicit.
/// Do not accept arbitrary callback schemes or hosts.
struct OAuthCallbackPolicy {
    let allowedScheme: String
    let allowedHost: String?

    func accepts(_ url: URL) -> Bool {
        guard url.scheme == allowedScheme else { return false }

        if let allowedHost {
            return url.host == allowedHost
        }

        return true
    }
}

// MARK: - OAuth Safari Helper

/// A minimal privacy-hardened wrapper around ASWebAuthenticationSession.
///
/// Security/privacy behavior:
/// - Uses ASWebAuthenticationSession instead of embedded WKWebView for OAuth.
/// - Requests an ephemeral web browser session.
/// - Requires HTTPS authorization URLs.
/// - Does not request location.
/// - Does not collect device IDs, advertising IDs, or fingerprinting signals.
/// - Does not log full callback URLs.
/// - Does not send analytics from the OAuth flow.
/// - Returns only the callback URL to the caller for normal OAuth token exchange.
final class OAuthSafariSetup: NSObject, ASWebAuthenticationPresentationContextProviding {
    private weak var presentationAnchor: ASPresentationAnchor?
    private var currentSession: ASWebAuthenticationSession?
    private let callbackPolicy: OAuthCallbackPolicy

    init(
        presentationAnchor: ASPresentationAnchor?,
        callbackPolicy: OAuthCallbackPolicy
    ) {
        self.presentationAnchor = presentationAnchor
        self.callbackPolicy = callbackPolicy
        super.init()
    }

    /// Starts OAuth without adding device monitoring or tracking behavior.
    ///
    /// - Parameters:
    ///   - authorizationURL: HTTPS OAuth authorization URL.
    ///   - callbackScheme: App callback scheme, for example `auracore`.
    ///   - completion: Returns the accepted callback URL or an error.
    func start(
        authorizationURL: URL,
        callbackScheme: String,
        completion: @escaping (Result<URL, Error>) -> Void
    ) {
        guard OAuthSafariPrivacyPolicy.requireHTTPS == false || authorizationURL.scheme == "https" else {
            completion(.failure(OAuthSafariSetupError.nonHTTPSAuthorizationURL))
            return
        }

        guard presentationAnchor != nil else {
            completion(.failure(OAuthSafariSetupError.missingPresentationAnchor))
            return
        }

        let session = ASWebAuthenticationSession(
            url: authorizationURL,
            callbackURLScheme: callbackScheme
        ) { [weak self] callbackURL, error in
            defer { self?.currentSession = nil }

            if let error {
                // Do not attach callback URL or sensitive auth values to logs.
                completion(.failure(error))
                return
            }

            guard let callbackURL else {
                completion(.failure(OAuthSafariSetupError.callbackMissing))
                return
            }

            guard self?.callbackPolicy.accepts(callbackURL) == true else {
                completion(.failure(OAuthSafariSetupError.callbackRejected))
                return
            }

            // Important: caller should exchange the authorization code server-side
            // or through a standard PKCE flow. Do not log or persist the raw callback.
            completion(.success(callbackURL))
        }

        session.presentationContextProvider = self

        // Privacy hardening: request no shared cookies/session data.
        // This must be set before `start()`.
        session.prefersEphemeralWebBrowserSession = OAuthSafariPrivacyPolicy.preferEphemeralSession

        currentSession = session
        _ = session.start()
    }

    func cancel() {
        currentSession?.cancel()
        currentSession = nil
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let presentationAnchor else {
            return ASPresentationAnchor()
        }
        return presentationAnchor
    }
}
#else
// This source file is intentionally safe to parse on non-Apple CI runners.
// The OAuth implementation requires iOS/macOS AuthenticationServices + UIKit.
#endif

// MARK: - Example Usage

/*
let authURL = URL(string: "https://example.com/oauth/authorize?...PKCE_PARAMS...")!
let callbackPolicy = OAuthCallbackPolicy(
    allowedScheme: "auracore",
    allowedHost: "oauth-callback"
)

let oauth = OAuthSafariSetup(
    presentationAnchor: UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first { $0.isKeyWindow },
    callbackPolicy: callbackPolicy
)

oauth.start(
    authorizationURL: authURL,
    callbackScheme: "auracore"
) { result in
    switch result {
    case .success(let callbackURL):
        // Parse OAuth authorization code.
        // Use PKCE.
        // Do not log callbackURL.
        // Do not persist raw callbackURL.
        print("OAuth callback received and accepted.")
    case .failure(let error):
        print("OAuth failed: \(error.localizedDescription)")
    }
}
*/

// MARK: - App-Level Monitoring Prevention Checklist

/*
Required for Aura-Core / SKYGRID OAuth flows:

[ ] Use ASWebAuthenticationSession for OAuth.
[ ] Set prefersEphemeralWebBrowserSession = true before start().
[ ] Require HTTPS authorization URLs.
[ ] Use PKCE for OAuth authorization-code flows.
[ ] Validate callback scheme and host.
[ ] Do not log callback URLs, authorization codes, access tokens, or refresh tokens.
[ ] Do not request location permission for OAuth.
[ ] Do not collect IDFA, IDFV, MAC address, device serial, Wi-Fi/Bluetooth identifiers, or fingerprinting signals.
[ ] Do not send OAuth events to analytics unless separately disclosed and approved.
[ ] Store tokens only in Keychain if the app truly needs persistent login.
[ ] Provide a logout/revoke path that clears local credentials.
[ ] Keep PrivacyInfo.xcprivacy accurate if the app uses required-reason APIs.
[ ] Review third-party SDKs for telemetry or tracking behavior.

Public claim allowed:
"This OAuth flow is privacy-hardened and avoids app-level tracking or device monitoring."

Public claim not allowed:
"This guarantees no one can monitor your device."
*/
