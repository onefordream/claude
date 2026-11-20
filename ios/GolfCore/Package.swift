// swift-tools-version:5.9
import PackageDescription

// 計測アルゴリズム（Apple のフレームワークに依存しない純粋な Swift）。
// Mac で `swift test` を実行すると単体テストが走る。
let package = Package(
    name: "GolfCore",
    platforms: [.iOS(.v16), .macOS(.v13)],
    products: [.library(name: "GolfCore", targets: ["GolfCore"])],
    targets: [
        .target(name: "GolfCore"),
        .testTarget(name: "GolfCoreTests", dependencies: ["GolfCore"]),
    ]
)
