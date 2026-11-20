import Foundation

public struct Point: Equatable, Sendable {
    public var x: Double
    public var y: Double
    public init(x: Double, y: Double) { self.x = x; self.y = y }
    public static func - (a: Point, b: Point) -> Point { Point(x: a.x - b.x, y: a.y - b.y) }
    public func distance(to p: Point) -> Double { hypot(x - p.x, y - p.y) }
}

/// 8bit グレースケール画像を読むための共通インターフェース
public protocol GraySource {
    var width: Int { get }
    var height: Int { get }
    var time: Double { get }
    func at(_ x: Int, _ y: Int) -> UInt8
}

/// カメラのピクセルバッファ（Y プレーン）をコピーせずに読むビュー。
/// process() の呼び出し中だけ有効。
public struct GrayView: GraySource {
    public let base: UnsafePointer<UInt8>
    public let width: Int
    public let height: Int
    public let rowBytes: Int
    public let time: Double

    public init(base: UnsafePointer<UInt8>, width: Int, height: Int, rowBytes: Int, time: Double) {
        self.base = base; self.width = width; self.height = height; self.rowBytes = rowBytes; self.time = time
    }

    @inline(__always) public func at(_ x: Int, _ y: Int) -> UInt8 { base[y * rowBytes + x] }
}

/// 保持用のグレースケール画像（再利用可能なバッファ）
public final class GrayImage: GraySource {
    public let width: Int
    public let height: Int
    public var time: Double = 0
    public var data: [UInt8]

    public init(width: Int, height: Int, fill: UInt8 = 0) {
        self.width = width; self.height = height
        data = [UInt8](repeating: fill, count: width * height)
    }

    @inline(__always) public func at(_ x: Int, _ y: Int) -> UInt8 { data[y * width + x] }
    @inline(__always) public func set(_ x: Int, _ y: Int, _ v: UInt8) { data[y * width + x] = v }

    /// 同じサイズのビューから中身をコピーする（メモリ確保なし）
    public func copy(from v: GrayView) {
        precondition(v.width == width && v.height == height)
        time = v.time
        data.withUnsafeMutableBufferPointer { dst in
            guard let d = dst.baseAddress else { return }
            for y in 0..<height {
                memcpy(d + y * width, v.base + y * v.rowBytes, width)
            }
        }
    }
}
