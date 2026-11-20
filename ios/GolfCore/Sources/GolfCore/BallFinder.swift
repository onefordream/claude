import Foundation

/// 静止しているボールの検出結果
public struct BallFix: Equatable, Sendable {
    public var center: Point
    public var diameter: Double      // px
    public var threshold: Double     // ボールとみなす輝度
    public var background: Double    // 周囲の輝度
    public var peak: Double          // ボールの最大輝度
}

public enum BallFinder {
    /// p の周辺（半径 R）で白い円形の塊を探し、中心と直径を返す
    public static func refine<S: GraySource>(_ img: S, near p: Point, radius R: Double) -> BallFix? {
        let x0 = max(0, Int(p.x - R)), x1 = min(img.width, Int(p.x + R))
        let y0 = max(0, Int(p.y - R)), y1 = min(img.height, Int(p.y + R))
        let w = x1 - x0, h = y1 - y0
        guard w >= 6, h >= 6 else { return nil }

        // 枠の輝度の中央値 = 背景
        var border: [UInt8] = []
        border.reserveCapacity(2 * (w + h))
        for x in x0..<x1 { border.append(img.at(x, y0)); border.append(img.at(x, y1 - 1)) }
        for y in y0..<y1 { border.append(img.at(x0, y)); border.append(img.at(x1 - 1, y)) }
        border.sort()
        let bg = Double(border[border.count / 2])

        // 最も明るい点（同じ明るさなら p に近い方）
        var peak: UInt8 = 0, px = x0, py = y0, bestD = Double.greatestFiniteMagnitude
        for y in y0..<y1 {
            for x in x0..<x1 {
                let v = img.at(x, y)
                if v > peak || (v == peak && hypot(Double(x) - p.x, Double(y) - p.y) < bestD) {
                    peak = v; px = x; py = y
                    bestD = hypot(Double(x) - p.x, Double(y) - p.y)
                }
            }
        }
        let peakD = Double(peak)
        guard peakD - bg >= 40 else { return nil }
        let thr = bg + (peakD - bg) * 0.5

        // 塗りつぶし（4近傍）
        var seen = [Bool](repeating: false, count: w * h)
        var stack = [(px - x0, py - y0)]
        seen[(py - y0) * w + (px - x0)] = true
        var area = 0, sx = 0.0, sy = 0.0
        var minX = Int.max, maxX = Int.min, minY = Int.max, maxY = Int.min
        while let top = stack.popLast() {
            let (x, y) = top
            if x == 0 || y == 0 || x == w - 1 || y == h - 1 { return nil } // 枠に触れる = ボールより大きい
            area += 1; sx += Double(x); sy += Double(y)
            minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
            for (dx, dy) in [(1, 0), (-1, 0), (0, 1), (0, -1)] {
                let nx = x + dx, ny = y + dy
                let i = ny * w + nx
                if !seen[i] && Double(img.at(x0 + nx, y0 + ny)) >= thr {
                    seen[i] = true
                    stack.append((nx, ny))
                }
            }
        }
        let bw = Double(maxX - minX + 1), bh = Double(maxY - minY + 1)
        let d = 2 * sqrt(Double(area) / .pi)
        let circ = Double(area) / (.pi * bw * bh / 4)
        guard circ > 0.65, circ < 1.3, bw / bh > 0.7, bw / bh < 1.4, d > 4, d < 150 else { return nil }
        return BallFix(center: Point(x: Double(x0) + sx / Double(area), y: Double(y0) + sy / Double(area)),
                       diameter: d, threshold: thr, background: bg, peak: peakD)
    }

    /// 画面全体からボールらしいものを探す（タップされていないとき用）
    /// - Parameter region: 探す範囲（0〜1 の割合）。既定は画面の下側 2/3
    public static func autoSearch<S: GraySource>(_ img: S, region: (x0: Double, y0: Double, x1: Double, y1: Double) = (0.05, 0.3, 0.95, 0.95)) -> BallFix? {
        let W = Double(img.width), H = Double(img.height)
        let minD = W * 0.006, maxD = W * 0.04
        let step = max(8.0, maxD * 1.2)
        var best: BallFix?
        var bestScore = -Double.greatestFiniteMagnitude
        var y = H * region.y0
        while y < H * region.y1 {
            var x = W * region.x0
            while x < W * region.x1 {
                if let f = refine(img, near: Point(x: x, y: y), radius: step), f.diameter >= minD, f.diameter <= maxD {
                    // コントラストが高く、画面中央に近いほど良い
                    let score = (f.peak - f.background) - abs(f.center.x - W / 2) / W * 40
                    if score > bestScore { bestScore = score; best = f }
                }
                x += step
            }
            y += step
        }
        return best
    }

    /// ボール中心付近（半径 0.7r）で、まだボールの明るさが残っている割合
    public static func presence<S: GraySource>(_ img: S, ball: BallFix) -> Double {
        let r = ball.diameter / 2 * 0.7
        let x0 = max(0, Int(ball.center.x - r)), x1 = min(img.width - 1, Int(ball.center.x + r))
        let y0 = max(0, Int(ball.center.y - r)), y1 = min(img.height - 1, Int(ball.center.y + r))
        guard x1 >= x0, y1 >= y0 else { return 0 }
        var n = 0, hit = 0
        for y in y0...y1 {
            for x in x0...x1 {
                let dx = Double(x) - ball.center.x, dy = Double(y) - ball.center.y
                if dx * dx + dy * dy <= r * r {
                    n += 1
                    if Double(img.at(x, y)) >= ball.threshold { hit += 1 }
                }
            }
        }
        return n == 0 ? 0 : Double(hit) / Double(n)
    }
}
