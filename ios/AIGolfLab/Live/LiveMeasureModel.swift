import AVFoundation
import CoreMotion
import GolfCore
import SwiftUI
import UIKit

/// ライブ計測画面の状態
final class LiveMeasureModel: ObservableObject {
    enum Phase: Equatable { case starting, searching, settling, ready, measuring }

    struct Result: Identifiable {
        let id = UUID()
        var speed: Double       // m/s
        var launch: Double      // 度（傾き補正後）
        var carry: Double       // yd
        var headSpeed: Double   // m/s
        var frames: Int
        var shape: String?
    }

    @Published var phase: Phase = .starting
    @Published var message = "カメラを準備しています"
    @Published var ballRing: CGRect?          // 画面上のボール位置（プレビューの座標）
    @Published var results: [Result] = []
    @Published var lastMissed = false
    @Published var cameraLabel = ""
    @Published var warning: String?
    @Published var tilt: Double = 0           // 端末の左右の傾き（度）
    @Published var side: TargetSide = .right { didSet { let s = side; camera.videoQueue.async { [camera] in camera.detector.side = s } } }
    @Published var voiceOn = true

    let club: String
    let total: Int
    let camera = HighSpeedCamera()
    weak var previewLayer: AVCaptureVideoPreviewLayer?

    private let motion = CMMotionManager()
    private let speech = AVSpeechSynthesizer()
    private var lastLock: BallFix?

    private static let smash: [String: Double] = ["dr": 1.45, "fw": 1.42, "ut": 1.38, "i7": 1.33, "pw": 1.24]

    init(club: String, total: Int) {
        self.club = club
        self.total = total
    }

    var done: Bool { results.count >= total }

    // MARK: - 開始・終了

    func start() {
        camera.onConfigured = { [weak self] info in
            guard let self else { return }
            if let e = info.error { self.warning = e }
            guard info.width > 0 else { return }
            var label = "\(Int(info.fps.rounded()))fps · \(info.width)×\(info.height)"
            if let s = info.shutter { label += " · 1/\(Int((1 / s).rounded()))s" }
            self.cameraLabel = label
        }
        camera.onFps = { [weak self] fps, drops in
            guard let self else { return }
            if fps < 200, self.warning == nil, self.camera.frameSize.width > 0 {
                self.warning = "フレームレートが落ちています（\(Int(fps))fps）。明るい場所で使うと安定します。"
            }
            _ = drops
        }
        camera.detector.onEvent = { [weak self] e in
            DispatchQueue.main.async { self?.handle(e) }
        }
        camera.detector.side = side
        camera.start()
        startMotion()
        UIApplication.shared.isIdleTimerDisabled = true
    }

    func stop() {
        camera.stop()
        motion.stopDeviceMotionUpdates()
        UIApplication.shared.isIdleTimerDisabled = false
    }

    private func startMotion() {
        guard motion.isDeviceMotionAvailable else { return }
        motion.deviceMotionUpdateInterval = 1.0 / 20
        motion.startDeviceMotionUpdates(to: .main) { [weak self] m, _ in
            guard let g = m?.gravity else { return }
            // 横向き（ホームボタン側が右）での画面座標に直した重力の向き
            // 画面右 = 端末の -y、画面上 = 端末の +x
            let gx = -g.y, gy = g.x
            self?.tilt = atan2(gx, -gy) * 180 / .pi
        }
    }

    // MARK: - 検出イベント

    private func handle(_ e: DetectorEvent) {
        switch e {
        case .searching:
            phase = .searching
            ballRing = nil
            message = results.isEmpty ? "画面のボールをタップしてください" : "次のボールを同じ場所に置いてください"
        case .settling(let b):
            phase = .settling
            message = "ボールを確認中…動かさないでください"
            updateRing(b)
        case .armed(let b):
            if phase != .ready {
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                camera.focus(atNormalized: normalized(b.center))
            }
            phase = .ready
            lastLock = b
            message = "準備OK。打ってください"
            updateRing(b)
        case .impact:
            phase = .measuring
            message = "計測中…"
        case .shot(let m):
            lastMissed = false
            add(m)
        case .missed:
            lastMissed = true
            UINotificationFeedbackGenerator().notificationOccurred(.warning)
            message = "うまく追えませんでした。もう一度打ってください"
        }
    }

    private func add(_ m: ShotMeasurement) {
        // 端末の傾きを補正（ボールが画面右へ飛ぶとき、右肩下がりに構えると角度が大きく出る）
        let launch = m.launch - tilt * Double(m.directionSign)
        let spin = Flight.typicalSpin(club: club)
        let carry = Flight.simulate(speed: m.speed, launchDeg: launch, spinRpm: spin).carry * Flight.yardsPerMeter
        let r = Result(speed: m.speed, launch: launch, carry: carry,
                       headSpeed: m.speed / (Self.smash[club] ?? 1.45), frames: m.trackedFrames, shape: nil)
        if !done { results.append(r) }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
        if voiceOn {
            let text = "初速\(String(format: "%.1f", r.speed))、打ち出し\(Int(r.launch.rounded()))度、キャリー\(Int(r.carry.rounded()))ヤード"
            let u = AVSpeechUtterance(string: text)
            u.voice = AVSpeechSynthesisVoice(language: "ja-JP")
            u.rate = 0.55
            speech.speak(u)
        }
        message = done ? "計測が終わりました" : "次のボールを同じ場所に置いてください"
    }

    func setShape(_ shape: String?) {
        guard !results.isEmpty else { return }
        results[results.count - 1].shape = shape
    }

    func discardLast() {
        guard !results.isEmpty else { return }
        results.removeLast()
    }

    // MARK: - 座標変換（映像のピクセル ↔ プレビュー）

    /// プレビュー上のタップ位置をボールの探索ヒントとして渡す
    func tap(at layerPoint: CGPoint) {
        guard let layer = previewLayer else { return }
        let n = layer.captureDevicePointConverted(fromLayerPoint: layerPoint)
        let size = camera.frameSize
        let p = Point(x: Double(n.x * size.width), y: Double(n.y * size.height))
        camera.videoQueue.async { [camera] in camera.detector.setHint(p) }
    }

    private func normalized(_ p: Point) -> CGPoint {
        let size = camera.frameSize
        return CGPoint(x: p.x / Double(size.width), y: p.y / Double(size.height))
    }

    private func updateRing(_ b: BallFix) {
        guard let layer = previewLayer else { return }
        let size = camera.frameSize
        let c = layer.layerPointConverted(fromCaptureDevicePoint: normalized(b.center))
        let edge = layer.layerPointConverted(fromCaptureDevicePoint: CGPoint(x: (b.center.x + b.diameter / 2) / Double(size.width),
                                                                               y: b.center.y / Double(size.height)))
        let r = max(14, hypot(edge.x - c.x, edge.y - c.y) * 2.2)
        ballRing = CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)
    }

    /// Web に返す形式
    func liveShots() -> [LiveShot] {
        results.map { LiveShot(speed: ($0.speed * 10).rounded() / 10, launch: ($0.launch * 10).rounded() / 10, shape: $0.shape, frames: $0.frames) }
    }
}
