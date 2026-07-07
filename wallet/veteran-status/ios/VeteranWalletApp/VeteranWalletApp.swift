import SwiftUI

/// Optional app entry point for a standalone demo target.
/// If this file is copied into an existing app, keep only `VeteranWalletView` and remove this entry point.
struct VeteranWalletApp: App {
    var body: some Scene {
        WindowGroup {
            VeteranWalletView()
        }
    }
}
