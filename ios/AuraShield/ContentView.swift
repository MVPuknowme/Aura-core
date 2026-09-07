import SwiftUI

struct ContentView: View {
    @State private var session: AuraPresenceSession
    @FocusState private var isCheckInFocused: Bool

    init(session: AuraPresenceSession = AuraPresenceSession()) {
        _session = State(initialValue: session)
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.043, green: 0.063, blue: 0.125),
                    Color(red: 0.102, green: 0.122, blue: 0.231),
                    Color(red: 0.165, green: 0.118, blue: 0.290),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 22) {
                    header
                    checkInCard
                    responseCard
                    safetyNote
                }
                .frame(maxWidth: 520)
                .padding(.horizontal, 20)
                .padding(.vertical, 28)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .preferredColorScheme(.dark)
        .task(id: session.state) {
            guard session.state == .responding else { return }

            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            session.completeResponse()
        }
        .onChange(of: session.state) { _, state in
            if state == .listening {
                isCheckInFocused = true
            }
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            Text("Aura")
                .font(.system(size: 42, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: 8) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)

                Text(session.state.rawValue)
                    .font(.subheadline.weight(.semibold))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(.white.opacity(0.10), in: Capsule())
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Aura status: \(session.state.rawValue)")

            Text("A quiet digital space to check in.")
                .font(.title3)
                .foregroundStyle(.white.opacity(0.82))
                .multilineTextAlignment(.center)
        }
    }

    @ViewBuilder
    private var checkInCard: some View {
        VStack(spacing: 14) {
            if session.state == .ready && session.checkIn.isEmpty {
                Button("Come see me") {
                    session.beginCheckIn()
                }
                .font(.headline)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 15)
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(
                    Color(red: 0.992, green: 0.286, blue: 0.604),
                    in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                )
                .accessibilityHint("Opens the local Aura check-in field")
            } else {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your check-in")
                        .font(.headline)

                    TextEditor(text: $session.checkIn)
                        .focused($isCheckInFocused)
                        .frame(minHeight: 110)
                        .padding(10)
                        .scrollContentBackground(.hidden)
                        .background(.black.opacity(0.18))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .disabled(session.state == .responding || session.state == .offline)
                        .accessibilityLabel("Check-in message")

                    HStack {
                        if let validationMessage = session.validationMessage {
                            Text(validationMessage)
                                .foregroundStyle(Color(red: 1.0, green: 0.72, blue: 0.78))
                                .accessibilityLabel("Check-in error: \(validationMessage)")
                        }

                        Spacer()

                        Text("\(session.checkIn.count)/\(AuraPresenceSession.maximumCheckInLength)")
                            .foregroundStyle(.white.opacity(0.58))
                    }
                    .font(.caption)
                }

                if session.state == .listening {
                    Button("Send check-in") {
                        _ = session.submitCheckIn()
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .buttonStyle(.plain)
                    .foregroundStyle(.white)
                    .background(Color.indigo, in: RoundedRectangle(cornerRadius: 16))
                    .accessibilityHint("Creates an on-device digital support response")
                } else if session.state == .responding {
                    ProgressView("Aura is responding…")
                        .tint(.white)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(18)
        .background(.white.opacity(0.10), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }

    private var responseCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Aura response")
                .font(.headline)

            Text(
                session.response.isEmpty
                    ? "Aura’s local response will appear here."
                    : session.response
            )
            .foregroundStyle(session.response.isEmpty ? .white.opacity(0.55) : .white)
            .frame(maxWidth: .infinity, minHeight: 72, alignment: .topLeading)
            .accessibilityLabel(
                session.response.isEmpty
                    ? "No Aura response yet"
                    : "Aura response: \(session.response)"
            )
        }
        .padding(18)
        .background(.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }

    private var safetyNote: some View {
        Text("Aura is a digital support presence. It cannot appear physically, contact emergency services, or send this check-in anywhere in v0.")
            .font(.footnote)
            .foregroundStyle(.white.opacity(0.62))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 8)
    }

    private var statusColor: Color {
        switch session.state {
        case .ready:
            return Color(red: 0.27, green: 0.88, blue: 0.58)
        case .listening:
            return Color(red: 0.996, green: 0.58, blue: 0.78)
        case .responding:
            return Color(red: 0.58, green: 0.62, blue: 1.0)
        case .offline:
            return Color(red: 0.68, green: 0.70, blue: 0.76)
        }
    }
}

#Preview("Ready") {
    ContentView()
}

#Preview("Offline") {
    ContentView(session: AuraPresenceSession(isAvailable: false))
}
