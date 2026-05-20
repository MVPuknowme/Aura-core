import SwiftUI

struct AuraCoreTrainingConsoleView: View {
    @State private var selectedLane: TrainingLane = .preflight
    @State private var inputText: String = ""
    @State private var messages: [TrainingMessage] = TrainingMessage.seed
    @State private var memoryPins: [MemoryPin] = MemoryPin.seed
    @State private var approvalRequired: Bool = true

    var body: some View {
        NavigationStack {
            ZStack {
                Color.auraLightGrey.ignoresSafeArea()

                HStack(spacing: 0) {
                    sideControls
                        .frame(width: 320)

                    Divider()
                        .background(Color.auraDarkBlue.opacity(0.18))

                    messageBoard
                }
            }
            .navigationTitle("Aura-Core Training")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var sideControls: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Text("SKYGRID")
                    .font(.caption)
                    .fontWeight(.black)
                    .foregroundStyle(Color.auraOrange)
                    .tracking(2)

                Text("Training Console")
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)

                Text("Preflight, memory, and approval control for the emergency-readiness lane.")
                    .font(.subheadline)
                    .foregroundStyle(Color.white.opacity(0.72))
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Lane")
                    .font(.headline)
                    .foregroundStyle(.white)

                ForEach(TrainingLane.allCases) { lane in
                    Button {
                        selectedLane = lane
                        messages.append(.system("Lane changed to \(lane.title)."))
                    } label: {
                        HStack {
                            Image(systemName: lane.icon)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(lane.title)
                                    .fontWeight(.bold)
                                Text(lane.subtitle)
                                    .font(.caption)
                                    .opacity(0.72)
                            }
                            Spacer()
                        }
                        .padding(12)
                        .foregroundStyle(selectedLane == lane ? Color.auraDarkBlue : .white)
                        .background(selectedLane == lane ? Color.auraOrange : Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }

            VStack(alignment: .leading, spacing: 12) {
                Toggle(isOn: $approvalRequired) {
                    Text("Human approval required")
                        .font(.headline)
                        .foregroundStyle(.white)
                }
                .toggleStyle(SwitchToggleStyle(tint: .auraOrange))

                Button {
                    let intent = selectedLane.intentSummary(approvalRequired: approvalRequired)
                    messages.append(.operatorNote("Generated signed intent preview."))
                    messages.append(.system(intent))
                } label: {
                    Label("Generate Intent", systemImage: "signature")
                        .fontWeight(.bold)
                        .frame(maxWidth: .infinity)
                        .padding(14)
                        .background(Color.auraOrange)
                        .foregroundStyle(Color.auraDarkBlue)
                        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 10) {
                Text("Memory Pins")
                    .font(.headline)
                    .foregroundStyle(.white)

                ForEach(memoryPins) { pin in
                    HStack(alignment: .top, spacing: 10) {
                        Circle()
                            .fill(Color.auraOrange)
                            .frame(width: 10, height: 10)
                            .padding(.top, 5)

                        VStack(alignment: .leading, spacing: 3) {
                            Text(pin.title)
                                .font(.subheadline.bold())
                                .foregroundStyle(.white)
                            Text(pin.detail)
                                .font(.caption)
                                .foregroundStyle(Color.white.opacity(0.68))
                        }
                    }
                    .padding(10)
                    .background(Color.white.opacity(0.06))
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }

            Spacer()
        }
        .padding(22)
        .background(
            LinearGradient(
                colors: [Color.auraDarkBlue, Color.auraDarkBlue.opacity(0.92), Color.auraControlBlue],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private var messageBoard: some View {
        VStack(spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Messaging Board")
                        .font(.title.bold())
                        .foregroundStyle(Color.auraDarkBlue)
                    Text("Bright white board for training notes, preflight decisions, and signed-intent previews.")
                        .font(.subheadline)
                        .foregroundStyle(Color.auraSlate)
                }
                Spacer()

                statusPill
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)

            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 14) {
                        ForEach(messages) { message in
                            MessageBubble(message: message)
                                .id(message.id)
                        }
                    }
                    .padding(24)
                }
                .onChange(of: messages.count) { _, _ in
                    if let last = messages.last {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.85)) {
                            proxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }

            HStack(spacing: 12) {
                TextField("Train SkyGrid with a preflight note...", text: $inputText, axis: .vertical)
                    .lineLimit(1...4)
                    .padding(14)
                    .background(Color.auraLightGrey.opacity(0.88))
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                Button {
                    let trimmed = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !trimmed.isEmpty else { return }
                    messages.append(.operatorNote(trimmed))
                    messages.append(.system("Training note captured for \(selectedLane.title). No infrastructure, wallet, financial, or emergency action executed."))
                    inputText = ""
                } label: {
                    Image(systemName: "paperplane.fill")
                        .font(.title3.bold())
                        .padding(15)
                        .background(Color.auraOrange)
                        .foregroundStyle(Color.auraDarkBlue)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
            .padding(18)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: Color.black.opacity(0.08), radius: 18, x: 0, y: 8)
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .background(
            RoundedRectangle(cornerRadius: 34, style: .continuous)
                .fill(.white)
                .shadow(color: Color.auraDarkBlue.opacity(0.08), radius: 28, x: 0, y: 12)
                .padding(18)
        )
    }

    private var statusPill: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(Color.auraOrange)
                .frame(width: 10, height: 10)
            Text(approvalRequired ? "Approval Gate On" : "Dry Run Only")
                .font(.caption.bold())
        }
        .foregroundStyle(Color.auraDarkBlue)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.auraOrange.opacity(0.18))
        .clipShape(Capsule())
    }
}

private struct MessageBubble: View {
    let message: TrainingMessage

    var body: some View {
        HStack(alignment: .top) {
            if message.role == .operatorNote { Spacer(minLength: 64) }

            VStack(alignment: .leading, spacing: 6) {
                Text(message.role.label)
                    .font(.caption.bold())
                    .foregroundStyle(message.role == .system ? Color.auraOrange : Color.white.opacity(0.8))

                Text(message.text)
                    .font(.body)
                    .foregroundStyle(message.role == .operatorNote ? .white : Color.auraDarkBlue)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(14)
            .background(message.role == .operatorNote ? Color.auraDarkBlue : Color.auraLightGrey.opacity(0.82))
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(message.role == .system ? Color.auraOrange.opacity(0.22) : Color.clear, lineWidth: 1)
            )

            if message.role == .system { Spacer(minLength: 64) }
        }
    }
}

enum TrainingLane: String, CaseIterable, Identifiable {
    case preflight
    case emergencyReadiness
    case memory
    case clientProof

    var id: String { rawValue }

    var title: String {
        switch self {
        case .preflight: return "Preflight"
        case .emergencyReadiness: return "Emergency Lane"
        case .memory: return "Memory"
        case .clientProof: return "Client Proof"
        }
    }

    var subtitle: String {
        switch self {
        case .preflight: return "Runtime and deploy checks"
        case .emergencyReadiness: return "Advisory readiness only"
        case .memory: return "Training context pins"
        case .clientProof: return "Evidence and approval trail"
        }
    }

    var icon: String {
        switch self {
        case .preflight: return "checkmark.shield.fill"
        case .emergencyReadiness: return "cross.case.fill"
        case .memory: return "brain.head.profile"
        case .clientProof: return "doc.text.magnifyingglass"
        }
    }

    func intentSummary(approvalRequired: Bool) -> String {
        """
        Signed Intent Preview
        Lane: \(title)
        Mode: dry_run / advisory
        Human Approval Required: \(approvalRequired ? "true" : "false")
        Wallet Approval Required: false
        Infrastructure Change: false
        Financial Action: false
        Execution: blocked until explicit approval gate is attached.
        """
    }
}

struct TrainingMessage: Identifiable {
    enum Role {
        case system
        case operatorNote

        var label: String {
            switch self {
            case .system: return "Aura-Core AI"
            case .operatorNote: return "Operator"
            }
        }
    }

    let id = UUID()
    let role: Role
    let text: String

    static func system(_ text: String) -> TrainingMessage {
        TrainingMessage(role: .system, text: text)
    }

    static func operatorNote(_ text: String) -> TrainingMessage {
        TrainingMessage(role: .operatorNote, text: text)
    }

    static let seed: [TrainingMessage] = [
        .system("Aura-Core Training Console online. This interface captures training notes and signed-intent previews without executing infrastructure, wallet, financial, or emergency actions."),
        .operatorNote("Begin with SkyGrid preflight readiness."),
        .system("Preflight lane selected. Use the side controls to pin memory, generate intent previews, and keep approval gates visible.")
    ]
}

struct MemoryPin: Identifiable {
    let id = UUID()
    let title: String
    let detail: String

    static let seed: [MemoryPin] = [
        MemoryPin(title: "Node 24", detail: "Protected runtime lane"),
        MemoryPin(title: "pnpm 11.1.3", detail: "Deterministic package manager"),
        MemoryPin(title: "Human Gate", detail: "Approval before execution")
    ]
}

extension Color {
    static let auraLightGrey = Color(red: 0.925, green: 0.935, blue: 0.95)
    static let auraDarkBlue = Color(red: 0.035, green: 0.085, blue: 0.18)
    static let auraControlBlue = Color(red: 0.055, green: 0.13, blue: 0.27)
    static let auraOrange = Color(red: 1.0, green: 0.54, blue: 0.12)
    static let auraSlate = Color(red: 0.30, green: 0.36, blue: 0.45)
}

#Preview {
    AuraCoreTrainingConsoleView()
}
