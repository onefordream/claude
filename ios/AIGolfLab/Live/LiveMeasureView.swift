import GolfCore
import SwiftUI

/// ライブ計測画面（横向き）。カメラを向けて打つだけで、初速・打ち出し角・キャリーが出る。
struct LiveMeasureView: View {
    let request: LiveRequest
    let onFinish: ([LiveShot]) -> Void
    @StateObject private var model: LiveMeasureModel

    private static let clubNames = ["dr": "1W", "fw": "3W", "ut": "UT", "i7": "7I", "pw": "PW"]
    private struct ShotShape: Identifiable { let id: String; let label: String }
    private static let shapes = [ShotShape(id: "hook", label: "フック"), ShotShape(id: "draw", label: "ドロー"), ShotShape(id: "straight", label: "ストレート"),
                                 ShotShape(id: "fade", label: "フェード"), ShotShape(id: "slice", label: "スライス")]
    private let turf = Color(red: 0.055, green: 0.353, blue: 0.247)
    private let flag = Color(red: 0.95, green: 0.79, blue: 0.30)

    init(request: LiveRequest, onFinish: @escaping ([LiveShot]) -> Void) {
        self.request = request
        self.onFinish = onFinish
        _model = StateObject(wrappedValue: LiveMeasureModel(club: request.club, total: request.total))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            CameraPreview(model: model).ignoresSafeArea()

            if let r = model.ballRing {
                Circle()
                    .stroke(ringColor, style: StrokeStyle(lineWidth: 3, dash: model.phase == .ready ? [] : [6, 5]))
                    .frame(width: r.width, height: r.height)
                    .position(x: r.midX, y: r.midY)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
                // 飛ぶ方向のガイド
                Image(systemName: model.side == .right ? "arrow.right" : "arrow.left")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(ringColor)
                    .position(x: r.midX + (model.side == .right ? r.width : -r.width), y: r.midY - r.height * 0.35)
                    .ignoresSafeArea()
                    .allowsHitTesting(false)
            }

            VStack(spacing: 10) {
                topBar
                Spacer()
                HStack(alignment: .bottom) {
                    statusCard
                    Spacer()
                    if let last = model.results.last { resultCard(last) }
                }
            }
            .padding(12)
        }
        .statusBarHidden(true)
        .onAppear {
            OrientationLock.set(.landscapeRight)
            model.start()
        }
        .onDisappear {
            model.stop()
            OrientationLock.set(.portrait)
        }
    }

    private var ringColor: Color {
        switch model.phase {
        case .ready: return .green
        case .measuring: return .white
        default: return flag
        }
    }

    // MARK: - 上部

    private var topBar: some View {
        HStack(spacing: 8) {
            Button { finish(send: false) } label: {
                Label("閉じる", systemImage: "xmark").labelStyle(.iconOnly)
                    .frame(width: 40, height: 40)
            }
            .buttonStyle(Glass())

            pill("\(Self.clubNames[request.club] ?? "1W")")
            pill("\(min(model.results.count + (model.done ? 0 : 1), request.total)) / \(request.total)球")

            Spacer()
            levelIndicator
            Spacer()

            Button { model.side = model.side == .right ? .left : .right } label: {
                Label(model.side == .right ? "打球方向 →" : "← 打球方向", systemImage: "arrow.left.arrow.right").font(.footnote.bold())
                    .padding(.horizontal, 10).frame(height: 40)
            }
            .buttonStyle(Glass())

            Button { model.voiceOn.toggle() } label: {
                Image(systemName: model.voiceOn ? "speaker.wave.2.fill" : "speaker.slash.fill").frame(width: 40, height: 40)
            }
            .buttonStyle(Glass())
            .accessibilityLabel(model.voiceOn ? "読み上げをオフ" : "読み上げをオン")
        }
    }

    private var levelIndicator: some View {
        let ok = abs(model.tilt) < 1.0
        return HStack(spacing: 6) {
            Capsule().fill(ok ? Color.green : flag).frame(width: 46, height: 4)
                .rotationEffect(.degrees(-model.tilt))
            Text(ok ? "水平OK" : String(format: "傾き %.1f°", model.tilt))
                .font(.caption.monospacedDigit().bold())
                .foregroundColor(.white)
        }
        .padding(.horizontal, 10).frame(height: 32)
        .background(.black.opacity(0.45), in: Capsule())
    }

    private func pill(_ s: String) -> some View {
        Text(s).font(.subheadline.bold()).foregroundColor(.white)
            .padding(.horizontal, 12).frame(height: 32)
            .background(.black.opacity(0.45), in: Capsule())
    }

    // MARK: - 状態

    private var statusCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Circle().fill(ringColor).frame(width: 10, height: 10)
                Text(model.message).font(.headline).foregroundColor(.white)
            }
            if let w = model.warning {
                Text(w).font(.caption).foregroundColor(flag).fixedSize(horizontal: false, vertical: true)
            }
            if !model.cameraLabel.isEmpty {
                Text(model.cameraLabel).font(.caption2.monospacedDigit()).foregroundColor(.white.opacity(0.7))
            }
            if model.results.isEmpty && model.phase != .ready {
                Text("スマホを固定し、ボールの真横2〜3mから。打つ方向の画面に余白を広くとってください。")
                    .font(.caption).foregroundColor(.white.opacity(0.85)).frame(maxWidth: 300, alignment: .leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(12)
        .background(.black.opacity(0.5), in: RoundedRectangle(cornerRadius: 14))
    }

    // MARK: - 結果

    private func resultCard(_ r: LiveMeasureModel.Result) -> some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack(alignment: .firstTextBaseline, spacing: 16) {
                metric("ボール初速", String(format: "%.1f", r.speed), "m/s")
                metric("打ち出し角", String(format: "%.1f", r.launch), "°")
                metric("キャリー", "\(Int(r.carry.rounded()))", "yd", highlight: true)
            }
            Text(String(format: "推定HS %.1fm/s · 追跡 %dコマ", r.headSpeed, r.frames))
                .font(.caption2.monospacedDigit()).foregroundColor(.white.opacity(0.7))
            HStack(spacing: 6) {
                ForEach(Self.shapes) { s in
                    Button(s.label) { model.setShape(r.shape == s.id ? nil : s.id) }
                        .font(.caption.bold())
                        .padding(.horizontal, 9).frame(height: 30)
                        .foregroundColor(r.shape == s.id ? .black : .white)
                        .background(r.shape == s.id ? flag : Color.white.opacity(0.15), in: Capsule())
                }
            }
            HStack(spacing: 8) {
                Button("この球を取り消す") { model.discardLast() }
                    .font(.footnote.bold()).foregroundColor(.white.opacity(0.85))
                if model.done {
                    Button { finish(send: true) } label: {
                        Text("結果を見る").font(.headline).padding(.horizontal, 18).frame(height: 44)
                            .background(flag, in: RoundedRectangle(cornerRadius: 12)).foregroundColor(.black)
                    }
                }
            }
        }
        .padding(14)
        .background(turf.opacity(0.92), in: RoundedRectangle(cornerRadius: 16))
    }

    private func metric(_ label: String, _ value: String, _ unit: String, highlight: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(label).font(.caption2.bold()).foregroundColor(.white.opacity(0.75))
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value).font(.system(size: 40, weight: .bold, design: .rounded).monospacedDigit())
                    .foregroundColor(highlight ? flag : .white)
                Text(unit).font(.footnote.bold()).foregroundColor(.white.opacity(0.75))
            }
        }
    }

    /// 途中で閉じた場合も、測れた分は記録に渡す
    private func finish(send: Bool) {
        onFinish(model.liveShots())
    }
}

/// 映像の上に置くボタンの見た目
private struct Glass: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundColor(.white)
            .background(.black.opacity(configuration.isPressed ? 0.7 : 0.45), in: RoundedRectangle(cornerRadius: 12))
    }
}
