import Foundation

/// 弾道シミュレーション（Web 版 physics.js と同じモデル・係数）
public enum Flight {
    public static let yardsPerMeter = 1.09361

    public struct Result: Sendable { public let carry: Double; public let apex: Double; public let path: [Point] } // m

    public static func simulate(speed: Double, launchDeg: Double, spinRpm: Double) -> Result {
        let mass = 0.04593, r = 0.04267 / 2, area = Double.pi * r * r, rho = 1.204, g = 9.81
        let k = 0.5 * rho * area / mass
        let dt = 0.005
        let a = launchDeg * .pi / 180
        var x = 0.0, y = 0.0, vx = speed * cos(a), vy = speed * sin(a)
        var omega = spinRpm * 2 * .pi / 60
        var t = 0.0, apex = 0.0, step = 0
        var path = [Point(x: 0, y: 0)]
        while t < 15 {
            let v = hypot(vx, vy)
            let s = r * omega / max(v, 1)
            let cd = 0.22 + 0.2 * s
            let cl = min(0.25, 1.6 * s)
            let ax = -k * cd * v * vx - k * cl * v * vy
            let ay = -k * cd * v * vy + k * cl * v * vx - g
            vx += ax * dt; vy += ay * dt
            let nx = x + vx * dt, ny = y + vy * dt
            t += dt; step += 1
            omega *= 1 - 0.035 * dt
            if ny < 0 {
                let f = y / (y - ny)
                x += (nx - x) * f; y = 0
                path.append(Point(x: x, y: 0))
                break
            }
            x = nx; y = ny
            apex = max(apex, y)
            if step % 6 == 0 { path.append(Point(x: x, y: y)) }
        }
        return Result(carry: x, apex: apex, path: path)
    }

    /// クラブ ID ごとの標準スピン（Web 版 clubs.js と同じ）
    public static func typicalSpin(club: String) -> Double {
        ["dr": 2800, "fw": 3800, "ut": 4500, "i7": 6500, "pw": 8500][club] ?? 2800
    }
}
