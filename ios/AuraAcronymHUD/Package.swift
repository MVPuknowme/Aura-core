// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "AuraAcronymHUD",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "AuraAcronymHUD",
            targets: ["AuraAcronymHUD"]
        )
    ],
    targets: [
        .target(
            name: "AuraAcronymHUD",
            path: "Sources/AuraAcronymHUD"
        )
    ]
)
