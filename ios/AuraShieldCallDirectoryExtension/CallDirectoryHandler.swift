import Foundation
import CallKit

final class CallDirectoryHandler: CXCallDirectoryProvider {
    override func beginRequest(with context: CXCallDirectoryExtensionContext) {
        context.delegate = self

        // Review scaffold:
        // Wire this target to the shared App Group below, then convert saved strings
        // into CXCallDirectoryPhoneNumber values and feed them to the context in
        // strictly increasing numeric order.
        //
        // App Group: group.net.skygrid.aurashield
        // Store key: managedNumbers

        context.completeRequest()
    }
}

extension CallDirectoryHandler: CXCallDirectoryExtensionContextDelegate {
    func requestFailed(for extensionContext: CXCallDirectoryExtensionContext, withError error: Error) {
        print("Aura Shield Call Directory request failed: \(error.localizedDescription)")
    }
}
