import Foundation

/// 1球の計測結果
public struct ShotMeasurement: Equatable, Sendable {
    public var speed: Double          // ボール初速 m/s
    public var launch: Double         // 打ち出し角（度、上が正）
    public var directionSign: Int     // 画面上で +1 = 右へ, -1 = 左へ
    public var trackedFrames: Int     // 追跡できたコマ数
    public var pixelsPerMeter: Double
    public init(speed: Double, launch: Double, directionSign: Int, trackedFrames: Int, pixelsPerMeter: Double) {
        self.speed = speed; self.launch = launch; self.directionSign = directionSign
        self.trackedFrames = trackedFrames; self.pixelsPerMeter = pixelsPerMeter
    }
}

public enum TargetSide: Int, Sendable { case right = 1, left = -1 }

/// インパクト後のコマからボールの軌跡を見つけて、初速と打ち出し角を出す。
///
/// 手順
/// 1. 直前のコマ（ボールがまだ止まっている）との差分で、動いた塊を抽出
/// 2. ボールの大きさに近い塊のうち、ボール位置から目標方向・-8〜55°の扇形にあるものを候補にする
/// 3. 候補から「等速直線運動」する並びを最大3本取り出す（RANSAC）
///    ボール・クラブヘッド・体の一部などが別々の軌跡になる
/// 4. 十分なコマ数がある軌跡のうち、最も速いものをボールとする（ボールはヘッドより必ず速い）
public enum ShotTracker {
    public static let ballDiameterM = 0.04267

    struct Cand { let frame: Int; let t: Double; let x: Double; let y: Double; let id: Int }
    struct Track { let speedPx: Double; let vx: Double; let vy: Double; let count: Int; let ids: Set<Int>; let rms: Double }

    public static func analyze<R: GraySource, F: GraySource>(reference: R, frames: [F], ball: BallFix, side: TargetSide) -> ShotMeasurement? {
        let d = ball.diameter
        let pxPerM = d / ballDiameterM
        let ballArea = Double.pi * d * d / 4
        let diffThr = max(15.0, (ball.peak - ball.background) * 0.3)
        let ox = ball.center.x, oy = ball.center.y
        let step = 2 // 2px おきに見て計算量を 1/4 に

        var cands: [Cand] = []
        for (k, f) in frames.enumerated() {
            let mw = f.width / step, mh = f.height / step
            var mask = [Bool](repeating: false, count: mw * mh)
            for my in 0..<mh {
                let y = my * step
                for mx in 0..<mw {
                    let x = mx * step
                    if abs(Int(f.at(x, y)) - Int(reference.at(x, y))) >= Int(diffThr) { mask[my * mw + mx] = true }
                }
            }
            var label = [Bool](repeating: false, count: mw * mh)
            for start in 0..<(mw * mh) where mask[start] && !label[start] {
                label[start] = true
                var stack = [start]
                var n = 0, sx = 0.0, sy = 0.0
                while let i = stack.popLast() {
                    let cx = i % mw, cy = i / mw
                    n += 1; sx += Double(cx); sy += Double(cy)
                    for dy in -1...1 {
                        for dx in -1...1 {
                            let nx = cx + dx, ny = cy + dy
                            guard nx >= 0, ny >= 0, nx < mw, ny < mh else { continue }
                            let j = ny * mw + nx
                            if mask[j] && !label[j] { label[j] = true; stack.append(j) }
                        }
                    }
                }
                let area = Double(n * step * step)
                guard area >= 0.25 * ballArea, area <= 10 * ballArea else { continue }
                let px = sx / Double(n) * Double(step), py = sy / Double(n) * Double(step)
                let dx = px - ox, up = oy - py
                guard hypot(dx, up) >= d, dx * Double(side.rawValue) > 0 else { continue }
                let el = atan2(up, abs(dx)) * 180 / .pi
                guard el >= -8, el <= 55 else { continue }
                cands.append(Cand(frame: k, t: f.time, x: px, y: py, id: cands.count))
            }
        }

        var pool = cands
        var tracks: [Track] = []
        for _ in 0..<3 {
            guard let t = bestTrack(pool, ball: ball, pxPerM: pxPerM) else { break }
            tracks.append(t)
            pool.removeAll { t.ids.contains($0.id) }
        }
        guard let maxCount = tracks.map(\.count).max() else { return nil }
        let need = max(4, Int(ceil(0.4 * Double(maxCount))))
        guard let best = tracks.filter({ $0.count >= need }).max(by: { $0.speedPx < $1.speedPx }) else { return nil }

        let speed = best.speedPx / pxPerM
        let launch = atan2(-best.vy, abs(best.vx)) * 180 / .pi
        return ShotMeasurement(speed: speed, launch: launch, directionSign: best.vx >= 0 ? 1 : -1,
                               trackedFrames: best.count, pixelsPerMeter: pxPerM)
    }

    static func bestTrack(_ cands: [Cand], ball: BallFix, pxPerM: Double) -> Track? {
        let d = ball.diameter, ox = ball.center.x, oy = ball.center.y
        let tol = max(0.75 * d, 4)
        var best: Track?
        for i in 0..<cands.count {
            for j in (i + 1)..<max(i + 1, cands.count) {
                var a = cands[i], b = cands[j]
                if a.frame == b.frame { continue }
                if a.frame > b.frame { swap(&a, &b) }
                let dt = b.t - a.t
                guard dt > 0 else { continue }
                let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt
                let sp = hypot(vx, vy)
                let spM = sp / pxPerM
                guard spM >= 12, spM <= 95 else { continue }
                let el = atan2(-vy, abs(vx)) * 180 / .pi
                guard el >= -8, el <= 55 else { continue }
                // ボールの元の位置を通る直線か
                let ux = vx / sp, uy = vy / sp
                guard abs((ox - a.x) * uy - (oy - a.y) * ux) <= 1.5 * d else { continue }
                // ボール位置から遠ざかる向きか
                guard (a.x - ox) * vx + (a.y - oy) * vy >= 0 else { continue }

                // コマごとに予測位置に最も近い候補を採用
                var perFrame: [Int: (err: Double, c: Cand)] = [:]
                for c in cands {
                    let px = a.x + vx * (c.t - a.t), py = a.y + vy * (c.t - a.t)
                    let e = hypot(c.x - px, c.y - py)
                    if e <= tol, e < (perFrame[c.frame]?.err ?? .greatestFiniteMagnitude) { perFrame[c.frame] = (e, c) }
                }
                guard perFrame.count >= 4 else { continue }
                let pts = perFrame.values.map { $0.c }
                let fx = linearFit(pts.map(\.t), pts.map(\.x))
                let fy = linearFit(pts.map(\.t), pts.map(\.y))
                var sq = 0.0
                for p in pts {
                    let ex = fx.a * p.t + fx.b - p.x, ey = fy.a * p.t + fy.b - p.y
                    sq += ex * ex + ey * ey
                }
                let rms = sqrt(sq / Double(pts.count))
                guard rms <= 0.35 * d else { continue }
                let track = Track(speedPx: hypot(fx.a, fy.a), vx: fx.a, vy: fy.a, count: pts.count, ids: Set(pts.map(\.id)), rms: rms)
                if let cur = best {
                    if track.count > cur.count || (track.count == cur.count && track.rms < cur.rms) { best = track }
                } else {
                    best = track
                }
            }
        }
        return best
    }

    /// 最小二乗法 y = a*x + b
    static func linearFit(_ xs: [Double], _ ys: [Double]) -> (a: Double, b: Double) {
        let n = Double(xs.count)
        let mx = xs.reduce(0, +) / n, my = ys.reduce(0, +) / n
        var sxx = 0.0, sxy = 0.0
        for (x, y) in zip(xs, ys) { sxx += (x - mx) * (x - mx); sxy += (x - mx) * (y - my) }
        let a = sxx == 0 ? 0 : sxy / sxx
        return (a, my - a * mx)
    }
}
