import Foundation

public enum DetectorEvent: Equatable, Sendable {
    case searching                 // ボールを探している
    case settling(BallFix)         // ボールを見つけた。止まるのを待っている
    case armed(BallFix)            // 準備OK。打ってよい
    case impact                    // 打った瞬間を検知
    case shot(ShotMeasurement)     // 計測できた
    case missed                    // 打ったが追跡できなかった
}

/// カメラの毎コマを受け取り、ボール検出 → 待機 → インパクト検知 → 解析 を行う状態機械。
/// スレッドセーフではない。カメラの映像キュー上でだけ呼ぶこと。
public final class ShotDetector {
    public enum State: Equatable { case searching, settling, armed, capturing, cooldown }

    public var side: TargetSide = .right
    public var onEvent: ((DetectorEvent) -> Void)?
    public private(set) var state: State = .searching
    public private(set) var lock: BallFix?

    /// インパクト後に集めるコマ数（240fps で約 0.07 秒）
    public var postFrames = 16
    /// 静止判定に使うコマ数（240fps で 0.2 秒）
    public var settleFrames = 48

    private var hint: Point?
    private var fixes: [BallFix] = []
    private var misses = 0
    private var frameIndex = 0
    private var lastPresence = 1.0
    private var prev: GrayImage?
    private var post: [GrayImage] = []
    private var postCount = 0
    private var reference: GrayImage?
    private var cooldownUntil = 0.0
    private var lastPos: Point?

    public init() {}

    /// 画面でボールをタップしたとき（ピクセル座標）
    public func setHint(_ p: Point?) {
        hint = p
        if state == .settling || state == .armed || state == .searching { toSearching() }
    }

    public func reset() { lock = nil; lastPos = nil; toSearching() }

    public func process(_ v: GrayView) {
        frameIndex += 1
        switch state {
        case .searching: search(v)
        case .settling: settle(v)
        case .armed: watch(v)
        case .capturing: capture(v)
        case .cooldown:
            if v.time >= cooldownUntil { toSearching() }
        }
    }

    // MARK: - 状態ごとの処理

    private func toSearching() {
        state = .searching; fixes.removeAll(); misses = 0
        onEvent?(.searching)
    }

    private func search(_ v: GrayView) {
        var fix: BallFix?
        if let p = hint ?? lastPos {
            if frameIndex % 4 == 0 { fix = BallFinder.refine(v, near: p, radius: max(40, Double(v.width) * 0.05)) }
        } else if frameIndex % 30 == 0 {
            fix = BallFinder.autoSearch(v)
        }
        guard let f = fix else { return }
        fixes = [f]; misses = 0; state = .settling
        onEvent?(.settling(f))
    }

    private func settle(_ v: GrayView) {
        guard let last = fixes.last else { toSearching(); return }
        guard let f = BallFinder.refine(v, near: last.center, radius: last.diameter * 1.5 + 6) else {
            misses += 1
            if misses > 12 { toSearching() }
            return
        }
        fixes.append(f)
        if fixes.count > settleFrames { fixes.removeFirst(fixes.count - settleFrames) }
        guard fixes.count >= settleFrames else { return }
        let n = Double(fixes.count)
        let mx = fixes.map(\.center.x).reduce(0, +) / n
        let my = fixes.map(\.center.y).reduce(0, +) / n
        let sx = sqrt(fixes.map { ($0.center.x - mx) * ($0.center.x - mx) }.reduce(0, +) / n)
        let sy = sqrt(fixes.map { ($0.center.y - my) * ($0.center.y - my) }.reduce(0, +) / n)
        guard max(sx, sy) < 0.6 else { return }

        let ball = BallFix(center: Point(x: mx, y: my),
                           diameter: fixes.map(\.diameter).reduce(0, +) / n,
                           threshold: fixes.map(\.threshold).reduce(0, +) / n,
                           background: fixes.map(\.background).reduce(0, +) / n,
                           peak: fixes.map(\.peak).reduce(0, +) / n)
        lock = ball
        lastPos = ball.center
        if prev?.width != v.width || prev?.height != v.height {
            prev = GrayImage(width: v.width, height: v.height)
            reference = GrayImage(width: v.width, height: v.height)
            post = (0..<postFrames).map { _ in GrayImage(width: v.width, height: v.height) }
        }
        prev?.copy(from: v)
        lastPresence = 1
        state = .armed
        onEvent?(.armed(ball))
    }

    private func watch(_ v: GrayView) {
        guard let ball = lock, let prev = prev else { toSearching(); return }
        let pr = BallFinder.presence(v, ball: ball)
        if pr < 0.3 && lastPresence > 0.6 {
            // インパクト：直前のコマを基準画像として保存
            reference?.data = prev.data
            reference?.time = prev.time
            post[0].copy(from: v)
            postCount = 1
            state = .capturing
            onEvent?(.impact)
            return
        }
        lastPresence = pr
        prev.copy(from: v)

        // ボールを置き直した・ずれた場合は再検出
        if frameIndex % 120 == 0, pr > 0.8,
           let f = BallFinder.refine(v, near: ball.center, radius: ball.diameter * 1.5 + 6),
           f.center.distance(to: ball.center) > ball.diameter * 0.5 {
            hint = nil; lastPos = f.center; toSearching()
        }
    }

    private func capture(_ v: GrayView) {
        guard postCount < post.count else { return }
        post[postCount].copy(from: v)
        postCount += 1
        guard postCount == post.count, let ball = lock, let ref = reference else { return }

        // 最後のコマにまだボールがある = クラブが一瞬かぶっただけ
        if BallFinder.presence(post[postCount - 1], ball: ball) > 0.6 {
            lastPresence = 1
            state = .armed
            onEvent?(.armed(ball))
            return
        }
        let frames = Array(post[0..<postCount])
        if let m = ShotTracker.analyze(reference: ref, frames: frames, ball: ball, side: side) {
            onEvent?(.shot(m))
        } else {
            onEvent?(.missed)
        }
        // 次のボールを同じ場所で待つ（フォロースルーが終わるまで 0.8 秒待機）
        hint = nil
        lastPos = ball.center
        cooldownUntil = v.time + 0.8
        state = .cooldown
    }
}
