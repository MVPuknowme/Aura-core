//
//  AuraAcronymHUD.swift
//  Aura-Core / SkyGrid iPad Utility
//
//  A transparent pull-from-corner acronym reference marker for coding agents,
//  operators, and iPad-based development dashboards.
//
//  Compact mode goal:
//  - live in a small corner space, roughly 1/16 of the screen face
//  - show one acronym at a time
//  - tap the little window to flip between acronym and meaning
//  - use bottom arrows to move through the acronym deck
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
    @State private var selectedIndex = 0
    @State private var isFlipped = false

    private let acronyms: [AcronymEntry] = AcronymEntry.defaultEntries

    public init() {}

    private var currentEntry: AcronymEntry {
        acronyms[min(max(selectedIndex, 0), acronyms.count - 1)]
    }

    public var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .bottomTrailing) {
                if isOpen {
                    hudMiniPanel
                        .frame(
                            width: max(176, proxy.size.width / 4.15),
                            height: max(126, proxy.size.height / 4.25)
                        )
                        .transition(.scale(scale: 0.72, anchor: .bottomTrailing).combined(with: .opacity))
                        .padding(.trailing, 18)
                        .padding(.bottom, 82)
                }

                pullMarker
                    .padding(.trailing, 10)
                    .padding(.bottom, 18)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.86), value: isOpen)
        .animation(.spring(response: 0.28, dampingFraction: 0.82), value: selectedIndex)
        .animation(.easeInOut(duration: 0.22), value: isFlipped)
        .allowsHitTesting(true)
    }

    private var pullMarker: some View {
        Button {
            isOpen.toggle()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: isOpen ? "chevron.down" : "rectangle.on.rectangle.angled")
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

    private var hudMiniPanel: some View {
        VStack(spacing: 8) {
            miniHeader

            Button {
                isFlipped.toggle()
            } label: {
                ZStack {
                    AcronymFlipFace(entry: currentEntry, mode: .front)
                        .opacity(isFlipped ? 0 : 1)
                        .rotation3DEffect(
                            .degrees(isFlipped ? 180 : 0),
                            axis: (x: 0, y: 1, z: 0),
                            perspective: 0.65
                        )

                    AcronymFlipFace(entry: currentEntry, mode: .back)
                        .opacity(isFlipped ? 1 : 0)
                        .rotation3DEffect(
                            .degrees(isFlipped ? 0 : -180),
                            axis: (x: 0, y: 1, z: 0),
                            perspective: 0.65
                        )
                }
                .contentShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Flip acronym card")

            bottomArrows
        }
        .padding(10)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .stroke(.white.opacity(0.18), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.34), radius: 24, x: 0, y: 12)
    }

    private var miniHeader: some View {
        HStack(spacing: 8) {
            Image(systemName: "sparkles.rectangle.stack")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.white.opacity(0.9))

            Text("Acronym Lens")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(.white.opacity(0.92))
                .lineLimit(1)

            Spacer(minLength: 4)

            Text("\(selectedIndex + 1)/\(acronyms.count)")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(.white.opacity(0.55))
                .lineLimit(1)

            Button {
                isOpen = false
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(.white.opacity(0.75))
                    .padding(6)
                    .background(.white.opacity(0.08), in: Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
    }

    private var bottomArrows: some View {
        HStack(spacing: 10) {
            Button {
                moveCard(-1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .black))
                    .frame(width: 38, height: 28)
                    .background(.white.opacity(0.08), in: Capsule())
                    .overlay(Capsule().stroke(.white.opacity(0.10), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous acronym")

            Spacer(minLength: 6)

            Text(isFlipped ? "meaning" : "tap to flip")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(.white.opacity(0.52))
                .lineLimit(1)

            Spacer(minLength: 6)

            Button {
                moveCard(1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .black))
                    .frame(width: 38, height: 28)
                    .background(.white.opacity(0.08), in: Capsule())
                    .overlay(Capsule().stroke(.white.opacity(0.10), lineWidth: 1))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next acronym")
        }
        .foregroundStyle(.white.opacity(0.88))
    }

    private func moveCard(_ delta: Int) {
        guard !acronyms.isEmpty else { return }
        selectedIndex = (selectedIndex + delta + acronyms.count) % acronyms.count
        isFlipped = false
    }
}

private struct AcronymFlipFace: View {
    enum Mode {
        case front
        case back
    }

    let entry: AcronymEntry
    let mode: Mode

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            switch mode {
            case .front:
                Spacer(minLength: 0)

                Text(entry.short)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(.white)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)

                Text(entry.context)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(.white.opacity(0.58))
                    .lineLimit(2)

                Spacer(minLength: 0)

            case .back:
                Text(entry.long)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.96))
                    .lineLimit(3)
                    .minimumScaleFactor(0.74)

                Text(entry.context)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(.white.opacity(0.62))
                    .lineLimit(3)

                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(12)
        .background(.black.opacity(0.16), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(.white.opacity(0.10), lineWidth: 1)
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

#Preview("Aura Acronym HUD — Compact Flip Window") {
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
