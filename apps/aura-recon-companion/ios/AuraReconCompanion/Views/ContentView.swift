import SwiftUI

struct ContentView: View {
    @State private var target = "example.com"
    @State private var endpoint = "http://127.0.0.1:8000/"
    @State private var profile: ScanProfile = .dnsPassive
    @State private var authorized = false
    @State private var report: ScanReport?
    @State private var errorMessage: String?
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Authorized target") {
                    TextField("example.com", text: $target)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Picker("Profile", selection: $profile) {
                        ForEach(ScanProfile.allCases) { item in
                            Text(item.title).tag(item)
                        }
                    }
                    Toggle(
                        "I own this target or have explicit permission to assess it.",
                        isOn: $authorized
                    )
                }

                Section("Development API") {
                    TextField("https://your-api.example/", text: $endpoint)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }

                Section {
                    Button {
                        Task { await runScan() }
                    } label: {
                        HStack {
                            if isLoading { ProgressView() }
                            Text(isLoading ? "Running…" : "Run bounded scan")
                        }
                    }
                    .disabled(isLoading || !authorized || target.trimmingCharacters(in: .whitespaces).isEmpty)
                }

                if let errorMessage {
                    Section("Error") {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }

                if let report {
                    Section("Evidence") {
                        LabeledContent("Target", value: report.target)
                        LabeledContent("Profile", value: report.profile.title)
                        Text(report.evidenceSHA256)
                            .font(.caption.monospaced())
                            .textSelection(.enabled)
                    }

                    Section("Findings") {
                        ForEach(report.findings) { finding in
                            VStack(alignment: .leading, spacing: 4) {
                                Text("\(finding.category) · \(finding.source)")
                                    .font(.headline)
                                Text(finding.value.description)
                                    .font(.caption.monospaced())
                                    .textSelection(.enabled)
                            }
                        }
                    }

                    Section("Limitations") {
                        ForEach(report.limitations, id: \.self) { limitation in
                            Text(limitation)
                        }
                    }
                }
            }
            .navigationTitle("Aura Recon")
        }
    }

    @MainActor
    private func runScan() async {
        isLoading = true
        errorMessage = nil
        report = nil
        defer { isLoading = false }

        guard let baseURL = URL(string: endpoint) else {
            errorMessage = "Enter a valid API URL."
            return
        }

        do {
            report = try await APIClient.shared.runScan(
                target: target,
                authorized: authorized,
                profile: profile,
                baseURL: baseURL
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ContentView()
}
