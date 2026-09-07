// swift-tools-version: 5.10

import PackageDescription

let package = Package(
    name: "AuraPresenceCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "AuraPresenceCore", targets: ["AuraPresenceCore"]),
    ],
    targets: [
        .target(
            name: "AuraPresenceCore",
            path: ".",
            sources: ["AuraPresenceModel.swift"]
        ),
        .testTarget(
            name: "AuraPresenceCoreTests",
            dependencies: ["AuraPresenceCore"],
            path: "Tests"
        ),
    ]
)
