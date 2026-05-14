//
//  AuraAcronymHUD.swift
//  Aura-Core / SkyGrid iPad Utility
//
//  Transparent draggable pull-from-corner acronym HUD for coding agents,
//  operators, and iPad-based development dashboards.
//
//  Transparent text-first mode:
//  - no visible panel/card background by default
//  - only writing, icons, and tiny touch controls remain visible
//  - color themes change text/accent color, not the background
//  - drag by the handle when unlocked
//  - lock button prevents accidental movement
//  - tap the acronym text to flip between acronym and meaning
//  - bottom arrows move through the acronym deck
//
//  iPadOS note:
//  A normal app cannot draw above other apps system-wide. To keep this visible
//  across Aura-Core screens, mount it near the root Scene/WindowGroup level.
//
//  Usage:
//
//      .overlay {
//          AuraAcronymHUD()
//      }
//

import SwiftUI

public struct AuraAcronymHUD: View {
    @State private var isOpen = false
    @State private var selectedIndex = 0
    @State private var isFlipped = false
    @State private var dragStart = CGSize.zero

    @AppStorage("AuraAcronymHUD.offsetX") private var offsetX = 0.0
    @AppStorage("AuraAcronymHUD.offsetY") private var offsetY = 0.0
    @AppStorage("AuraAcronymHUD.isLocked") private var isLocked = false
    @AppStorage("AuraAcronymHUD.textThemeIndex") private var textThemeIndex = 0

    private let acronyms: [AcronymEntry] = AcronymEntry.defaultEntries
    private let themes: [AuraHUDTextTheme] = AuraHUDTextTheme.presets

    public init() {}

    private var currentEntry: AcronymEntry {
        acronyms[min(max(selectedIndex, 0), acronyms.count - 1)]
    }

    private var theme: AuraHUDTextTheme {
        themes[min(max(textThemeIndex, 0), themes.count - 1)]
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
                        .offset(currentOffset)
                        .transition(.scale(scale: 0.72, anchor: .bottomTrailing).combined(with: .opacity))
                        .padding(.trailing, 18)
                        .padding(.bottom, 82)
                }

                pullMarker
                    .offset(isOpen ? .zero : currentOffset)
                    .padding(.trailing, 10)
                    .padding(.bottom, 18)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
        }
        .animation(.spring(response: 0.32, dampingFraction: 0.86), value: isOpen)
        .animation(.spring(response: 0.28, dampingFraction: 0.82), value: selectedIndex)
        .animation(.easeInOut(duration: 0.22), value: isFlipped)
        .accessibilityElement(children: .contain)
    }

    private var currentOffset: CGSize {
        CGSize(width: offsetX, height: offsetY)
    }

    private var dragHandleGesture: some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { value in
                guard !isLocked else { return }

                if dragStart == .zero {
                    dragStart = currentOffset
                }

                offsetX = dragStart.width + value.translation.width
                offsetY = dragStart.height + value.translation.height
            }
            .onEnded { _ in
                dragStart = .zero
            }
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
            .foregroundStyle(theme.primary.opacity(0.96))
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.clear, in: Capsule())
            .contentShape(Capsule())
            .shadow(color: theme.shadow.opacity(0.70), radius: 3, x: 0, y: 1)
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
                    AcronymFlipFace(entry: currentEntry, mode: .front, theme: theme)
                        .opacity(isFlipped ? 0 : 1)
                        .rotation3DEffect(
                            .degrees(isFlipped ? 180 : 0),
                            axis: (x: 0, y: 1, z: 0),
                            perspective: 0.65
                        )

                    AcronymFlipFace(entry: currentEntry, mode: .back, theme: theme)
                        .opacity(isFlipped ? 1 : 0)
                        .rotation3DEffect(
                            .degrees(isFlipped ? 0 : -180),
                            axis: (x: 0, y: 1, z: 0),
                            perspective: 0.65
                        )
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Flip acronym card")

            bottomArrows
        }
        .padding(10)
        .background(Color.clear)
        .contentShape(Rectangle())
    }

    private var miniHeader: some View {
        HStack(spacing: 8) {
            Image(systemName: isLocked ? "lock.fill" : "arrow.up.left.and.arrow.down.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(isLocked ? .yellow.opacity(0.95) : theme.secondary.opacity(0.92))
                .frame(width: 18, height: 18)
                .contentShape(Rectangle())
                .gesture(dragHandleGesture)
                .accessibilityLabel(isLocked ? "HUD locked" : "HUD drag handle")

            Text("Acronym Lens")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(theme.primary.opacity(0.94))
                .lineLimit(1)
                .contentShape(Rectangle())
                .gesture(dragHandleGesture)

            Spacer(minLength: 4)

            Text("\(selectedIndex + 1)/\(acronyms.count)")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(theme.secondary.opacity(0.60))
                .lineLimit(1)

            Button {
                cycleTheme()
            } label: {
                Image(systemName: "paintpalette.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.primary.opacity(0.95))
                    .padding(6)
                    .background(Color.clear, in: Circle())
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Change text color scheme")

            Button {
                isLocked.toggle()
            } label: {
                Image(systemName: isLocked ? "lock.fill" : "lock.open")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(isLocked ? .yellow.opacity(0.95) : theme.secondary.opacity(0.82))
                    .padding(6)
                    .background(Color.clear, in: Circle())
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel(isLocked ? "Unlock HUD position" : "Lock HUD position")

            Button {
                isOpen = false
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.secondary.opacity(0.78))
                    .padding(6)
                    .background(Color.clear, in: Circle())
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Close")
        }
        .shadow(color: theme.shadow.opacity(0.70), radius: 2, x: 0, y: 1)
    }

    private var bottomArrows: some View {
        HStack(spacing: 10) {
            Button {
                moveCard(-1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .black))
                    .frame(width: 38, height: 28)
                    .background(Color.clear, in: Capsule())
                    .contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous acronym")

            Spacer(minLength: 6)

            Text(statusText)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .foregroundStyle(statusColor)
                .lineLimit(1)

            Spacer(minLength: 6)

            Button {
                moveCard(1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .black))
                    .frame(width: 38, height: 28)
                    .background(Color.clear, in: Capsule())
                    .contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next acronym")
        }
        .foregroundStyle(theme.primary.opacity(0.90))
        .shadow(color: theme.shadow.opacity(0.70), radius: 2, x: 0, y: 1)
    }

    private var statusText: String {
        if isLocked { return "locked" }
        if isFlipped { return "meaning" }
        return theme.name
    }

    private var statusColor: Color {
        isLocked ? .yellow.opacity(0.78) : theme.secondary.opacity(0.72)
    }

    private func moveCard(_ delta: Int) {
        guard !acronyms.isEmpty else { return }
        selectedIndex = (selectedIndex + delta + acronyms.count) % acronyms.count
        isFlipped = false
    }

    private func cycleTheme() {
        guard !themes.isEmpty else { return }
        textThemeIndex = (textThemeIndex + 1) % themes.count
    }
}

private struct AcronymFlipFace: View {
    enum Mode {
        case front
        case back
    }

    let entry: AcronymEntry
    let mode: Mode
    let theme: AuraHUDTextTheme

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            switch mode {
            case .front:
                Spacer(minLength: 0)

                Text(entry.short)
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(theme.primary)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)

                Text(entry.context)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(theme.secondary.opacity(0.78))
                    .lineLimit(2)

                Spacer(minLength: 0)

            case .back:
                Text(entry.long)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.primary.opacity(0.96))
                    .lineLimit(3)
                    .minimumScaleFactor(0.74)

                Text(entry.context)
                    .font(.system(size: 11, weight: .regular))
                    .foregroundStyle(theme.secondary.opacity(0.78))
                    .lineLimit(3)

                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.clear)
        .shadow(color: theme.shadow.opacity(0.85), radius: 3, x: 0, y: 1)
    }
}

private struct AuraHUDTextTheme: Hashable {
    let name: String
    let primary: Color
    let secondary: Color
    let shadow: Color

    static let presets: [AuraHUDTextTheme] = [
        .init(name: "violet", primary: .purple, secondary: .cyan, shadow: .black),
        .init(name: "cyan", primary: .cyan, secondary: .white, shadow: .black),
        .init(name: "amber", primary: .orange, secondary: .yellow, shadow: .black),
        .init(name: "white", primary: .white, secondary: .gray, shadow: .black),
        .init(name: "green", primary: .green, secondary: .mint, shadow: .black),
        .init(name: "pink", primary: .pink, secondary: .purple, shadow: .black)
    ]
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

#Preview("Aura Acronym HUD — Transparent Text Only") {
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
    .overlay {
        AuraAcronymHUD()
    }
}
