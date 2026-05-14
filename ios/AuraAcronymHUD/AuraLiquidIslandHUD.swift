//
//  AuraLiquidIslandHUD.swift
//  Aura-Core / SkyGrid iPad Utility
//
//  Second island variant built from the existing Acronym HUD idea.
//
//  Behavior:
//  - compact liquid island when closed
//  - expands into a small floating acronym window
//  - supports six tablet-edge anchor points: left/top, left/middle, left/bottom,
//    right/top, right/middle, right/bottom
//  - drag when unlocked; release snaps to the nearest side anchor
//  - lock preserves the chosen anchor/position
//  - tap card area to flip acronym/meaning
//  - arrows cycle entries
//
//  Usage:
//      .overlay {
//          AuraLiquidIslandHUD()
//      }
//

import SwiftUI

public struct AuraLiquidIslandHUD: View {
    @Namespace private var islandNamespace

    @State private var isOpen = false
    @State private var isFlipped = false
    @State private var selectedIndex = 0
    @State private var dragStart = CGSize.zero
    @State private var liveDrag = CGSize.zero

    @AppStorage("AuraLiquidIslandHUD.anchorRaw") private var anchorRaw = LiquidIslandAnchor.rightMiddle.rawValue
    @AppStorage("AuraLiquidIslandHUD.offsetX") private var offsetX = 0.0
    @AppStorage("AuraLiquidIslandHUD.offsetY") private var offsetY = 0.0
    @AppStorage("AuraLiquidIslandHUD.isLocked") private var isLocked = false
    @AppStorage("AuraLiquidIslandHUD.themeIndex") private var themeIndex = 0

    private let entries = LiquidIslandAcronymEntry.defaultEntries
    private let themes = LiquidIslandTheme.presets

    public init() {}

    private var entry: LiquidIslandAcronymEntry {
        entries[min(max(selectedIndex, 0), entries.count - 1)]
    }

    private var theme: LiquidIslandTheme {
        themes[min(max(themeIndex, 0), themes.count - 1)]
    }

    private var anchor: LiquidIslandAnchor {
        LiquidIslandAnchor(rawValue: anchorRaw) ?? .rightMiddle
    }

    private var storedOffset: CGSize {
        CGSize(width: offsetX, height: offsetY)
    }

    public var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                islandBody(maxSize: proxy.size)
                    .frame(width: islandSize(for: proxy.size).width, height: islandSize(for: proxy.size).height)
                    .position(anchor.point(in: proxy.size, islandSize: islandSize(for: proxy.size)))
                    .offset(storedOffset + liveDrag)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .animation(.spring(response: 0.38, dampingFraction: 0.72), value: isOpen)
        .animation(.spring(response: 0.28, dampingFraction: 0.82), value: selectedIndex)
        .animation(.easeInOut(duration: 0.22), value: isFlipped)
        .animation(.spring(response: 0.34, dampingFraction: 0.78), value: anchorRaw)
    }

    private func islandSize(for size: CGSize) -> CGSize {
        if isOpen {
            return CGSize(width: max(204, size.width / 4.05), height: max(150, size.height / 4.55))
        }
        return CGSize(width: 112, height: 44)
    }

    @ViewBuilder
    private func islandBody(maxSize: CGSize) -> some View {
        if isOpen {
            openIsland(maxSize: maxSize)
                .transition(.scale(scale: 0.64).combined(with: .opacity))
        } else {
            closedIsland(maxSize: maxSize)
                .transition(.scale(scale: 0.72).combined(with: .opacity))
        }
    }

    private func closedIsland(maxSize: CGSize) -> some View {
        HStack(spacing: 8) {
            Image(systemName: isLocked ? "lock.fill" : "sparkle.magnifyingglass")
                .font(.system(size: 14, weight: .bold))

            Text("ABC")
                .font(.system(size: 13, weight: .black, design: .rounded))

            Image(systemName: anchor.isLeft ? "chevron.right" : "chevron.left")
                .font(.system(size: 10, weight: .black))
        }
        .foregroundStyle(theme.primary)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(liquidCapsuleMaterial)
        .matchedGeometryEffect(id: "liquid-island-shell", in: islandNamespace)
        .contentShape(Capsule())
        .shadow(color: theme.shadow.opacity(0.38), radius: 18, x: 0, y: 8)
        .gesture(dragGesture(in: maxSize, islandSize: islandSize(for: maxSize)))
        .onTapGesture {
            isOpen = true
        }
        .accessibilityLabel("Open liquid acronym island")
    }

    private func openIsland(maxSize: CGSize) -> some View {
        VStack(spacing: 9) {
            header(maxSize: maxSize)

            Button {
                isFlipped.toggle()
            } label: {
                ZStack {
                    liquidCardFront
                        .opacity(isFlipped ? 0 : 1)
                        .rotation3DEffect(.degrees(isFlipped ? 180 : 0), axis: (x: 0, y: 1, z: 0), perspective: 0.68)

                    liquidCardBack
                        .opacity(isFlipped ? 1 : 0)
                        .rotation3DEffect(.degrees(isFlipped ? 0 : -180), axis: (x: 0, y: 1, z: 0), perspective: 0.68)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .contentShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            }
            .buttonStyle(.plain)

            footer
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(liquidRoundedMaterial)
        .matchedGeometryEffect(id: "liquid-island-shell", in: islandNamespace)
        .overlay(
            RoundedRectangle(cornerRadius: 30, style: .continuous)
                .stroke(isLocked ? .yellow.opacity(0.42) : theme.primary.opacity(0.30), lineWidth: 1)
        )
        .contentShape(RoundedRectangle(cornerRadius: 30, style: .continuous))
        .shadow(color: theme.shadow.opacity(0.40), radius: 26, x: 0, y: 14)
    }

    private func header(maxSize: CGSize) -> some View {
        HStack(spacing: 8) {
            Image(systemName: isLocked ? "lock.fill" : "line.3.horizontal")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(isLocked ? .yellow : theme.primary)
                .frame(width: 20, height: 20)
                .contentShape(Rectangle())
                .gesture(dragGesture(in: maxSize, islandSize: islandSize(for: maxSize)))

            Text("Code-Core Island")
                .font(.system(size: 12, weight: .black, design: .rounded))
                .foregroundStyle(theme.primary)
                .lineLimit(1)
                .contentShape(Rectangle())
                .gesture(dragGesture(in: maxSize, islandSize: islandSize(for: maxSize)))

            Spacer(minLength: 4)

            Text(anchor.shortLabel)
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundStyle(theme.secondary.opacity(0.70))

            Button { cycleAnchor(-1) } label: {
                Image(systemName: "arrowtriangle.left.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.secondary.opacity(0.82))
                    .frame(width: 22, height: 22)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Previous island anchor")

            Button { cycleAnchor(1) } label: {
                Image(systemName: "arrowtriangle.right.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.secondary.opacity(0.82))
                    .frame(width: 22, height: 22)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Next island anchor")

            Button { cycleTheme() } label: {
                Image(systemName: "paintpalette.fill")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.primary)
                    .frame(width: 22, height: 22)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)

            Button { isLocked.toggle() } label: {
                Image(systemName: isLocked ? "lock.fill" : "lock.open")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(isLocked ? .yellow : theme.secondary)
                    .frame(width: 22, height: 22)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)

            Button { isOpen = false } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(theme.secondary.opacity(0.82))
                    .frame(width: 22, height: 22)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
        }
        .shadow(color: theme.shadow.opacity(0.65), radius: 2, x: 0, y: 1)
    }

    private var liquidCardFront: some View {
        VStack(alignment: .leading, spacing: 5) {
            Spacer(minLength: 0)

            Text(entry.short)
                .font(.system(size: 36, weight: .black, design: .rounded))
                .foregroundStyle(theme.primary)
                .minimumScaleFactor(0.45)
                .lineLimit(1)

            Text(entry.context)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(theme.secondary.opacity(0.78))
                .lineLimit(2)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
        .shadow(color: theme.shadow.opacity(0.78), radius: 3, x: 0, y: 1)
    }

    private var liquidCardBack: some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(entry.long)
                .font(.system(size: 15, weight: .black, design: .rounded))
                .foregroundStyle(theme.primary)
                .lineLimit(3)
                .minimumScaleFactor(0.70)

            Text(entry.context)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(theme.secondary.opacity(0.78))
                .lineLimit(3)

            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
        .padding(.horizontal, 4)
        .shadow(color: theme.shadow.opacity(0.78), radius: 3, x: 0, y: 1)
    }

    private var footer: some View {
        HStack(spacing: 10) {
            Button { move(-1) } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 15, weight: .black))
                    .frame(width: 42, height: 28)
                    .contentShape(Capsule())
            }
            .buttonStyle(.plain)

            Spacer(minLength: 4)

            Text(isLocked ? "locked" : (isFlipped ? "meaning" : "tap to flip"))
                .font(.system(size: 10, weight: .bold, design: .rounded))
                .foregroundStyle(isLocked ? .yellow.opacity(0.82) : theme.secondary.opacity(0.72))
                .lineLimit(1)

            Spacer(minLength: 4)

            Button { move(1) } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 15, weight: .black))
                    .frame(width: 42, height: 28)
                    .contentShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .foregroundStyle(theme.primary)
        .shadow(color: theme.shadow.opacity(0.65), radius: 2, x: 0, y: 1)
    }

    private var liquidCapsuleMaterial: some View {
        ZStack {
            Capsule().fill(.ultraThinMaterial)
            Capsule().fill(theme.primary.opacity(0.10))
        }
        .overlay(Capsule().stroke(theme.primary.opacity(0.26), lineWidth: 1))
    }

    private var liquidRoundedMaterial: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 30, style: .continuous).fill(.ultraThinMaterial)
            RoundedRectangle(cornerRadius: 30, style: .continuous).fill(theme.primary.opacity(0.08))
            RoundedRectangle(cornerRadius: 30, style: .continuous).fill(theme.secondary.opacity(0.04))
        }
    }

    private func dragGesture(in container: CGSize, islandSize: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 4)
            .onChanged { value in
                guard !isLocked else { return }
                if dragStart == .zero { dragStart = storedOffset }
                liveDrag = value.translation
            }
            .onEnded { value in
                guard !isLocked else { return }

                let currentAnchorPoint = anchor.point(in: container, islandSize: islandSize)
                let releasedPoint = CGPoint(
                    x: currentAnchorPoint.x + storedOffset.width + value.translation.width,
                    y: currentAnchorPoint.y + storedOffset.height + value.translation.height
                )
                let nearest = LiquidIslandAnchor.nearest(to: releasedPoint, in: container, islandSize: islandSize)
                anchorRaw = nearest.rawValue
                offsetX = 0
                offsetY = 0
                liveDrag = .zero
                dragStart = .zero
            }
    }

    private func move(_ delta: Int) {
        guard !entries.isEmpty else { return }
        selectedIndex = (selectedIndex + delta + entries.count) % entries.count
        isFlipped = false
    }

    private func cycleTheme() {
        guard !themes.isEmpty else { return }
        themeIndex = (themeIndex + 1) % themes.count
    }

    private func cycleAnchor(_ delta: Int) {
        let anchors = LiquidIslandAnchor.allCases
        guard let index = anchors.firstIndex(of: anchor) else { return }
        let nextIndex = (index + delta + anchors.count) % anchors.count
        anchorRaw = anchors[nextIndex].rawValue
        offsetX = 0
        offsetY = 0
        liveDrag = .zero
    }
}

private enum LiquidIslandAnchor: String, CaseIterable {
    case leftTop
    case leftMiddle
    case leftBottom
    case rightTop
    case rightMiddle
    case rightBottom

    var isLeft: Bool {
        switch self {
        case .leftTop, .leftMiddle, .leftBottom: return true
        case .rightTop, .rightMiddle, .rightBottom: return false
        }
    }

    var shortLabel: String {
        switch self {
        case .leftTop: return "L1"
        case .leftMiddle: return "L2"
        case .leftBottom: return "L3"
        case .rightTop: return "R1"
        case .rightMiddle: return "R2"
        case .rightBottom: return "R3"
        }
    }

    func point(in size: CGSize, islandSize: CGSize) -> CGPoint {
        let margin: CGFloat = 18
        let x = isLeft ? margin + islandSize.width / 2 : size.width - margin - islandSize.width / 2
        let y: CGFloat
        switch self {
        case .leftTop, .rightTop:
            y = margin + islandSize.height / 2 + 42
        case .leftMiddle, .rightMiddle:
            y = size.height / 2
        case .leftBottom, .rightBottom:
            y = size.height - margin - islandSize.height / 2 - 42
        }
        return CGPoint(x: x, y: y)
    }

    static func nearest(to point: CGPoint, in size: CGSize, islandSize: CGSize) -> LiquidIslandAnchor {
        allCases.min { lhs, rhs in
            lhs.point(in: size, islandSize: islandSize).distanceSquared(to: point) < rhs.point(in: size, islandSize: islandSize).distanceSquared(to: point)
        } ?? .rightMiddle
    }
}

private struct LiquidIslandTheme: Hashable {
    let primary: Color
    let secondary: Color
    let shadow: Color

    static let presets: [LiquidIslandTheme] = [
        .init(primary: .cyan, secondary: .white, shadow: .black),
        .init(primary: .purple, secondary: .cyan, shadow: .black),
        .init(primary: .orange, secondary: .yellow, shadow: .black),
        .init(primary: .green, secondary: .mint, shadow: .black),
        .init(primary: .pink, secondary: .white, shadow: .black),
        .init(primary: .white, secondary: .gray, shadow: .black)
    ]
}

private struct LiquidIslandAcronymEntry: Identifiable, Hashable {
    let id = UUID()
    let short: String
    let long: String
    let context: String

    static let defaultEntries: [LiquidIslandAcronymEntry] = [
        .init(short: "NVM", long: "Node Version Manager", context: "Switches Node.js versions per project."),
        .init(short: "RC", long: "Run Commands / Runtime Config", context: "Configuration convention used by dotfiles like .nvmrc."),
        .init(short: "CI/CD", long: "Continuous Integration / Continuous Deployment", context: "Automated build/test/deploy pipeline."),
        .init(short: "YAML", long: "YAML Ain't Markup Language", context: "Readable config format used by GitHub Actions."),
        .init(short: "LTS", long: "Long Term Support", context: "Stable runtime release line for production."),
        .init(short: "EOL", long: "End Of Life", context: "Date when a runtime stops receiving support."),
        .init(short: "API", long: "Application Programming Interface", context: "Structured way services talk to each other."),
        .init(short: "SDK", long: "Software Development Kit", context: "Code package for building on a platform."),
        .init(short: "CLI", long: "Command Line Interface", context: "Terminal-based tool or command app."),
        .init(short: "RPC", long: "Remote Procedure Call", context: "Network call used heavily in blockchain nodes."),
        .init(short: "ESM", long: "ECMAScript Modules", context: "Modern JavaScript import/export module format."),
        .init(short: "AWS", long: "Amazon Web Services", context: "Cloud provider for compute, storage, runners."),
        .init(short: "IAM", long: "Identity and Access Management", context: "AWS permission and role control system."),
        .init(short: "SSM", long: "Systems Manager", context: "AWS remote operations and command tool."),
        .init(short: "VPC", long: "Virtual Private Cloud", context: "Private cloud network boundary in AWS."),
        .init(short: "MCP", long: "Model Context Protocol", context: "Connector protocol for tools and external context."),
        .init(short: "MQTT", long: "Message Queuing Telemetry Transport", context: "Lightweight IoT messaging protocol."),
        .init(short: "LoRa", long: "Long Range Radio", context: "Low-power radio networking for mesh/off-grid systems."),
        .init(short: "HUD", long: "Heads-Up Display", context: "Floating overlay for fast context without leaving flow."),
        .init(short: "RAG", long: "Retrieval-Augmented Generation", context: "AI answers using retrieved documents/context.")
    ]
}

private extension CGSize {
    static func + (lhs: CGSize, rhs: CGSize) -> CGSize {
        CGSize(width: lhs.width + rhs.width, height: lhs.height + rhs.height)
    }
}

private extension CGPoint {
    func distanceSquared(to other: CGPoint) -> CGFloat {
        let dx = x - other.x
        let dy = y - other.y
        return dx * dx + dy * dy
    }
}

#Preview("Aura Liquid Island HUD — Six Edge Anchors") {
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
            Text("Liquid side island preview")
                .foregroundStyle(.white.opacity(0.62))
        }
    }
    .overlay {
        AuraLiquidIslandHUD()
    }
}
