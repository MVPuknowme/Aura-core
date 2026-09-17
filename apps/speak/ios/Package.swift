// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "SpeakNativeCore",
    platforms: [.iOS(.v17)],
    products: [.library(name: "SpeakCore", targets: ["SpeakCore"])],
    targets: [
        .target(name: "SpeakCore"),
        .testTarget(name: "SpeakCoreTests", dependencies: ["SpeakCore"])
    ]
)
