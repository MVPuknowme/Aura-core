//
//  AuraAcronymHUD.swift
//  Aura-Core / SkyGrid iPad Utility
//
//  A transparent pull-from-corner acronym reference marker for coding agents,
//  operators, and iPad-based development dashboards.
//
//  Drop this view on top of any SwiftUI screen with:
//
//      .overlay(alignment: .bottomTrailing) {
//          AuraAcronymHUD()
//      }
//

import SwiftUI

public struct AuraAcronymHUD: View {
    @State private var isOpen = false
    @State private var searchText = ""

    private let acronyms: [AcronymEntry] = AcronymEntry.defaultEntries

    public init() {}

    private var filteredEntries: [AcronymEntry] {
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !query.isEmpty else { return acronyms }

        return acronyms.filter { entry in
            entry.short.lowercased().contains(query) ||
            entry.long.lowercased().contains(query) ||
            entry.context.lowercased().contains(query)
        }
    }

    public var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if isOpen {
                hudPanel
                    .transition(.move(edge: .trailing).combined(with: .opacity))
                    .padding(.trailing, 18)
                    .padding(.bottom, 82)
            }

            pullMarker
                .padding(.trailing, 10)
                .padding(.bottom, 18)
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.86), value: isOpen)
    }

    private var pullMarker: some View {
        Button {
            isOpen.toggle()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: isOpen ? "chevron.down" : "text.magnifyingglass")
                    .font(.system(size: 15, weight: .semibold))

                Text("ABC")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
            }
            .foregroundStyle(.white.opacity(0.92))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(
                Capsule()
                    .stroke(.white.opacity(0.22), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.28), radius: 14, x: 0, y: 8)
            .accessibilityLabel(isOpen ? "Close acronym helper" : "Open acronym helper")
        }
        .buttonStyle(.plain)
    }

    private var hudPanel: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            searchField
            acronymList
        }
        .frame(width: 360, height: 430)
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
                .stroke(.white.opacity(0.18), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.34), radius: 30, x: 0, y: 16)
    }

    private var header: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .fill(.white.opacity(0.12))
                    .frame(width: 34, height: 34)

                Image(systemName: "sparkles.rectangle.stack")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.95))
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Aura Acronym Lens")
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)

                Text("Quick coding-agent reference")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.white.opacity(0.62))
            }

            Spacer()

            Button {
                isOpen = false
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(.white.opacity(0.8))
                    .padding(8)
                    .background(.white.opacity(0.08), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.white.opacity(0.55))

            TextField("Search NVM, RPC, YAML...", text: $searchText)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
                .foregroundStyle(.white)
        }
        .font(.system(size: 14, weight: .medium))
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(.black.opacity(0.18), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(.white.opacity(0.10), lineWidth: 1)
        )
    }

    private var acronymList: some View {
        ScrollView(showsIndicators: true) {
            LazyVStack(alignment: .leading, spacing: 9) {
                ForEach(filteredEntries) { entry in
                    AcronymRow(entry: entry)
                }
            }
            .padding(.vertical, 2)
        }
    }
}

private struct AcronymRow: View {
    let entry: AcronymEntry

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text(entry.short)
                .font(.system(size: 13, weight: .black, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 54, alignment: .leading)
                .padding(.top, 2)

            VStack(alignment: .leading, spacing: 3) {
                Text(entry.long)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.92))

                Text(entry.context)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(.white.opacity(0.58))
                    .lineLimit(2)
            }

            Spacer(minLength: 0)
        }
        .padding(10)
        .background(.white.opacity(0.065), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(.white.opacity(0.07), lineWidth: 1)
        )
    }
}

private struct AcronymEntry: Identifiable, Hashable {
    let id = UUID()
    let short: String
    let long: String
    let context: String

    static let defaultEntries: [AcronymEntry] = [
        .init(short: "NVM", long: "Node Version Manager", context: "Switches Node.js versions per project."),
        .init(short: "RC", long: "Run Commands / Runtime Config", context: "Configuration convention used by dotfiles like .nvmrc."),
        .init(short: "CI/CD", long: "Continuous Integration / Continuous Deployment", context: "Automated testing, building, and deployment pipeline."),
        .init(short: "YAML", long: "YAML Ain't Markup Language", context: "Readable config format used by GitHub Actions."),
        .init(short: "LTS", long: "Long Term Support", context: "Stable runtime release line for production systems."),
        .init(short: "EOL", long: "End Of Life", context: "Date when a runtime stops receiving normal support."),
        .init(short: "API", long: "Application Programming Interface", context: "Structured way for apps/services to talk to each other."),
        .init(short: "SDK", long: "Software Development Kit", context: "Code package for building against a platform."),
        .init(short: "CLI", long: "Command Line Interface", context: "Terminal-based tool or command app."),
        .init(short: "RPC", long: "Remote Procedure Call", context: "Network call used heavily in blockchain nodes."),
        .init(short: "ESM", long: "ECMAScript Modules", context: "Modern JavaScript module format using import/export."),
        .init(short: "AWS", long: "Amazon Web Services", context: "Cloud provider used for runners, storage, and compute."),
        .init(short: "IAM", long: "Identity and Access Management", context: "AWS permission and role control system."),
        .init(short: "SSM", long: "Systems Manager", context: "AWS tool for remote commands and managed operations."),
        .init(short: "VPC", long: "Virtual Private Cloud", context: "Private cloud network boundary in AWS."),
        .init(short: "MCP", long: "Model Context Protocol", context: "Connector protocol for tools and external context."),
        .init(short: "MQTT", long: "Message Queuing Telemetry Transport", context: "Lightweight IoT messaging protocol."),
        .init(short: "LoRa", long: "Long Range Radio", context: "Low-power radio networking for mesh/off-grid systems."),
        .init(short: "HUD", long: "Heads-Up Display", context: "Floating overlay for fast reference without leaving context."),
        .init(short: "UI", long: "User Interface", context: "The visible controls and surfaces people interact with."),
        .init(short: "UX", long: "User Experience", context: "How the product feels, flows, and supports the user."),
        .init(short: "JSON", long: "JavaScript Object Notation", context: "Structured data format used by APIs and configs."),
        .init(short: "JWT", long: "JSON Web Token", context: "Signed token often used for auth/session identity."),
        .init(short: "DNS", long: "Domain Name System", context: "Maps names like example.com to network addresses."),
        .init(short: "TLS", long: "Transport Layer Security", context: "Encryption layer behind HTTPS."),
        .init(short: "PR", long: "Pull Request", context: "GitHub change proposal for review and merge."),
        .init(short: "SHA", long: "Secure Hash Algorithm", context: "Commit/content identifier used by Git and security tools."),
        .init(short: "OTA", long: "Over The Air", context: "Remote update pattern for apps and devices."),
        .init(short: "PWA", long: "Progressive Web App", context: "Web app with app-like offline/install behavior."),
        .init(short: "RAG", long: "Retrieval-Augmented Generation", context: "AI pattern that answers using retrieved documents/context.")
    ]
}

#Preview("Aura Acronym HUD") {
    ZStack {
        LinearGradient(
            colors: [.black, .indigo.opacity(0.72), .purple.opacity(0.62)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()

        VStack(spacing: 12) {
            Text("Aura-Core Command")
                .font(.largeTitle.bold())
                .foregroundStyle(.white)
            Text("Dashboard surface preview")
                .foregroundStyle(.white.opacity(0.62))
        }
    }
    .overlay(alignment: .bottomTrailing) {
        AuraAcronymHUD()
    }
}
