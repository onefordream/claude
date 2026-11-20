import XCTest
@testable import GolfCore

/// 合成映像（240fps）で、検出 → インパクト検知 → 初速・打ち出し角の計算を確かめる。
/// 映像には、ボールの上で揺れる白い服（体）と、ボールより遅く低く進むクラブヘッドを入れてある。
final class ShotDetectorTests: XCTestCase {
    struct Scene {
        let W = 1280, H = 720
        let fps = 240.0
        let ballD = 16.0
        var pxPerM: Double { ballD / ShotTracker.ballDiameterM }
        var origin: Point
        let speed: Double, launch: Double, dir: Double
        let impactT: Double
        var rng = SystemRandomNumberGeneratorStub(seed: 7)

        mutating func frame(_ t: Double) -> [UInt8] {
            var img = [UInt8](repeating: 0, count: W * H)
            for y in 0..<H {
                let base: Int = y < 200 ? 120 : (y >= 580 ? 60 : 90)
                for x in 0..<W { img[y * W + x] = UInt8(clamping: base + rng.noise(4)) }
            }
            // 体
            let bx = Int(origin.x - 20 + 60 * sin(t * 6))
            fill(&img, x0: bx - 60, x1: bx + 60, y0: 150, y1: 420, v: 215)
            // クラブヘッド（ボール初速 / 1.35 の速さ）
            let hx = origin.x + (t - impactT) * (speed / 1.35) * pxPerM * dir
            fill(&img, x0: Int(hx - 14), x1: Int(hx + 14), y0: Int(origin.y + 4 - 9), y1: Int(origin.y + 4 + 9), v: 150)
            // ボール（露光 1/2000 秒のブレ）
            let a = launch * .pi / 180
            for s in 0..<6 {
                let tt = t + Double(s) / 5 / 2000
                var p = origin
                if tt >= impactT {
                    let r = speed * pxPerM * (tt - impactT)
                    p = Point(x: origin.x + dir * r * cos(a), y: origin.y - r * sin(a))
                }
                let rr = ballD / 2
                let ys = max(0, Int(p.y - rr)), ye = min(H - 1, Int(p.y + rr) + 1)
                let xs = max(0, Int(p.x - rr)), xe = min(W - 1, Int(p.x + rr) + 1)
                guard ys <= ye, xs <= xe else { continue }
                for y in ys...ye {
                    for x in xs...xe {
                        let dx = Double(x) - p.x, dy = Double(y) - p.y
                        if dx * dx + dy * dy <= rr * rr {
                            let v = Double(img[y * W + x])
                            img[y * W + x] = UInt8(clamping: Int(v + (245 - v) / 6))
                        }
                    }
                }
            }
            return img
        }

        func fill(_ img: inout [UInt8], x0: Int, x1: Int, y0: Int, y1: Int, v: UInt8) {
            let ys = max(0, y0), ye = min(H, y1), xs = max(0, x0), xe = min(W, x1)
            guard ys < ye, xs < xe else { return }
            for y in ys..<ye { for x in xs..<xe { img[y * W + x] = v } }
        }
    }

    func run(speed: Double, launch: Double, side: TargetSide) -> (ShotMeasurement?, [DetectorEvent]) {
        let dir = Double(side.rawValue)
        let origin = side == .right ? Point(x: 300, y: 560) : Point(x: 980, y: 560)
        let impactFrame = 150.37
        var scene = Scene(origin: origin, speed: speed, launch: launch, dir: dir, impactT: impactFrame / 240)
        let det = ShotDetector()
        det.side = side
        det.setHint(Point(x: origin.x + 10, y: origin.y - 5))
        var events: [DetectorEvent] = []
        var result: ShotMeasurement?
        det.onEvent = { e in
            events.append(e)
            if case .shot(let m) = e { result = m }
        }
        for i in 40..<200 {
            let t = Double(i) / 240
            let px = scene.frame(t)
            px.withUnsafeBufferPointer { buf in
                det.process(GrayView(base: buf.baseAddress!, width: scene.W, height: scene.H, rowBytes: scene.W, time: t))
            }
            if result != nil { break }
        }
        return (result, events)
    }

    func check(speed: Double, launch: Double, side: TargetSide, file: StaticString = #filePath, line: UInt = #line) {
        let (m, events) = run(speed: speed, launch: launch, side: side)
        guard let m else { return XCTFail("計測できませんでした: \(events)", file: file, line: line) }
        XCTAssertEqual(m.speed, speed, accuracy: speed * 0.03, file: file, line: line)
        XCTAssertEqual(m.launch, launch, accuracy: 0.5, file: file, line: line)
        XCTAssertEqual(m.directionSign, side.rawValue, file: file, line: line)
    }

    func testDriver() { check(speed: 62, launch: 13, side: .right) }
    func testFastDriverToLeft() { check(speed: 70, launch: 10, side: .left) }
    func testSevenIron() { check(speed: 45, launch: 18, side: .right) }
    func testWedge() { check(speed: 38, launch: 26, side: .right) }

    func testNoShotWithoutImpact() {
        // 打たなければ、構えたまま armed で待つ
        var scene = Scene(origin: Point(x: 300, y: 560), speed: 60, launch: 12, dir: 1, impactT: 99)
        let det = ShotDetector()
        det.setHint(Point(x: 300, y: 560))
        var armed = false, shot = false
        det.onEvent = { e in
            if case .armed = e { armed = true }
            if case .shot = e { shot = true }
        }
        for i in 0..<120 {
            let px = scene.frame(Double(i) / 240)
            px.withUnsafeBufferPointer { det.process(GrayView(base: $0.baseAddress!, width: scene.W, height: scene.H, rowBytes: scene.W, time: Double(i) / 240)) }
        }
        XCTAssertTrue(armed)
        XCTAssertFalse(shot)
    }

    func testFlightMatchesTourDriver() {
        // PGA ツアー平均：初速 74.7m/s・10.9°・2686rpm → キャリー約 275yd
        let r = Flight.simulate(speed: 74.7, launchDeg: 10.9, spinRpm: 2686)
        XCTAssertEqual(r.carry * Flight.yardsPerMeter, 275, accuracy: 8)
    }
}

/// テスト用の決まった乱数
struct SystemRandomNumberGeneratorStub {
    var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state = state &* 6364136223846793005 &+ 1442695040888963407
        return state >> 33
    }
    /// おおよそ ±k の一様ノイズ
    mutating func noise(_ k: Int) -> Int { Int(next() % UInt64(2 * k + 1)) - k }
}
