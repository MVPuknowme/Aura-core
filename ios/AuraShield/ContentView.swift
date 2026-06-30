import SwiftUI

struct ContentView: View {
    @State private var number = ""
    @State private var managedNumbers: [String] = []
    @State private var statusMessage = "Add a number, then enable the iOS extension in Settings."

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Text("Aura Shield")
                    .font(.largeTitle.bold())

                Text("Local call and message protection manager for known unwanted contact sources.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                TextField("Phone number", text: $number)
                    .textFieldStyle(.roundedBorder)
                    .keyboardType(.phonePad)

                Button("Add Number") {
                    addNumber()
                }
                .buttonStyle(.borderedProminent)

                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)

                List(managedNumbers, id: \.self) { item in
                    Text(item)
                }
            }
            .padding()
            .navigationTitle("Aura Shield")
            .onAppear {
                managedNumbers = AuraShieldNumberStore.loadNumbers()
            }
        }
    }

    private func addNumber() {
        let cleaned = number.filter(\.isNumber)
        guard !cleaned.isEmpty else {
            statusMessage = "Enter a valid phone number first."
            return
        }

        if !managedNumbers.contains(cleaned) {
            managedNumbers.append(cleaned)
            managedNumbers.sort()
            AuraShieldNumberStore.saveNumbers(managedNumbers)
        }

        number = ""
        statusMessage = "Saved locally. Reload the Call Directory extension after wiring the target."
    }
}

#Preview {
    ContentView()
}
