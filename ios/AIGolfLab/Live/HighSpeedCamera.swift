import AVFoundation
import GolfCore

/// 240fps・高速シャッターで撮影し、毎コマを ShotDetector に渡すカメラ。
/// 映像は端末の向き「横（ホームボタン側が右）」= センサー本来の向きで扱う。
final class HighSpeedCamera: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
    let session = AVCaptureSession()
    let detector = ShotDetector()
    /// 映像処理用キュー（detector はこのキュー上でだけ触る）
    let videoQueue = DispatchQueue(label: "aigolf.video", qos: .userInteractive)

    /// 映像のピクセルサイズ（横, 縦）
    private(set) var frameSize = CGSize(width: 1280, height: 720)
    private(set) var device: AVCaptureDevice?

    /// 設定結果の報告（メインスレッドで呼ばれる）
    var onConfigured: ((CameraInfo) -> Void)?
    /// 実測フレームレートの報告（約1秒ごと、メインスレッド）
    var onFps: ((Double, Int) -> Void)?

    struct CameraInfo {
        var fps: Double
        var width: Int
        var height: Int
        var shutter: Double?   // 秒
        var error: String?
    }

    private var frameCount = 0
    private var dropCount = 0
    private var fpsWindowStart = 0.0

    // MARK: - 起動

    func start() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] ok in
            guard let self else { return }
            guard ok else {
                self.report(CameraInfo(fps: 0, width: 0, height: 0, shutter: nil,
                                       error: "カメラの使用が許可されていません。設定アプリ > AI GOLF LAB でカメラをオンにしてください。"))
                return
            }
            self.videoQueue.async { self.configure() }
        }
    }

    func stop() {
        videoQueue.async { [session] in
            if session.isRunning { session.stopRunning() }
        }
    }

    private func configure() {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device) else {
            report(CameraInfo(fps: 0, width: 0, height: 0, shutter: nil, error: "カメラを起動できませんでした。"))
            return
        }
        self.device = device
        session.beginConfiguration()
        session.sessionPreset = .inputPriority
        if session.canAddInput(input) { session.addInput(input) }

        let output = AVCaptureVideoDataOutput()
        output.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
        // 解析中に来たコマは捨てる（インパクト前後のコマは detector がコピー済み）
        output.alwaysDiscardsLateVideoFrames = true
        output.setSampleBufferDelegate(self, queue: videoQueue)
        if session.canAddOutput(output) { session.addOutput(output) }

        let (format, fps) = Self.bestFormat(device)
        do {
            try device.lockForConfiguration()
            if let format {
                device.activeFormat = format
                let d = CMTime(value: 1, timescale: CMTimeScale(fps))
                device.activeVideoMinFrameDuration = d
                device.activeVideoMaxFrameDuration = d
            }
            if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
            if device.isExposureModeSupported(.continuousAutoExposure) { device.exposureMode = .continuousAutoExposure }
            device.unlockForConfiguration()
        } catch {
            session.commitConfiguration()
            report(CameraInfo(fps: 0, width: 0, height: 0, shutter: nil, error: "カメラの設定に失敗しました。"))
            return
        }
        session.commitConfiguration()

        let dims = CMVideoFormatDescriptionGetDimensions(device.activeFormat.formatDescription)
        frameSize = CGSize(width: Int(dims.width), height: Int(dims.height))
        session.startRunning()

        var info = CameraInfo(fps: fps, width: Int(dims.width), height: Int(dims.height), shutter: nil, error: nil)
        if fps < 200 {
            info.error = "この端末は240fpsに対応していないため、精度が下がります（\(Int(fps))fps）。"
        }
        report(info)

        // 自動露出が落ち着いてから、高速シャッターに切り替える
        videoQueue.asyncAfter(deadline: .now() + 1.2) { [weak self] in
            guard let self else { return }
            let s = self.applyFastShutter()
            info.shutter = s
            self.report(info)
        }
    }

    /// 240fps に対応した形式を選ぶ（720p を優先。処理が軽く、ボールも十分な大きさで写る）
    static func bestFormat(_ device: AVCaptureDevice) -> (AVCaptureDevice.Format?, Double) {
        var best: (format: AVCaptureDevice.Format, fps: Double, score: Double)?
        for f in device.formats {
            let dims = CMVideoFormatDescriptionGetDimensions(f.formatDescription)
            let maxFps = f.videoSupportedFrameRateRanges.map(\.maxFrameRate).max() ?? 0
            let fps = min(maxFps, 240)
            guard fps >= 60, dims.width >= 1280 else { continue }
            // fps を最重視し、同じなら 1280x720 に近いもの
            let score = fps * 1000 - abs(Double(dims.width) - 1280) / 10
            if best == nil || score > best!.score { best = (f, fps, score) }
        }
        return (best?.format, best?.fps ?? 30)
    }

    /// シャッター速度を 1/2000 秒（できなければ最速）に固定し、ISO で明るさを補う
    @discardableResult
    func applyFastShutter(target: Double = 1.0 / 2000) -> Double? {
        guard let device, device.isExposureModeSupported(.custom) else { return nil }
        let format = device.activeFormat
        let current = device.exposureDuration.seconds
        let dur = max(target, format.minExposureDuration.seconds)
        let gain = current > 0 ? Float(current / dur) : 4
        let iso = min(format.maxISO, max(format.minISO, device.iso * gain))
        do {
            try device.lockForConfiguration()
            device.setExposureModeCustom(duration: CMTime(seconds: dur, preferredTimescale: 1_000_000), iso: iso, completionHandler: nil)
            device.unlockForConfiguration()
            return dur
        } catch {
            return nil
        }
    }

    /// ボールにピントを合わせて固定する（構えたときに呼ぶ）
    func focus(atNormalized p: CGPoint) {
        videoQueue.async { [weak self] in
            guard let device = self?.device, (try? device.lockForConfiguration()) != nil else { return }
            if device.isFocusPointOfInterestSupported { device.focusPointOfInterest = p }
            if device.isFocusModeSupported(.autoFocus) { device.focusMode = .autoFocus }
            device.unlockForConfiguration()
        }
    }

    private func report(_ info: CameraInfo) {
        DispatchQueue.main.async { [weak self] in self?.onConfigured?(info) }
    }

    // MARK: - 毎コマ

    func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        guard let pb = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        let t = CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds

        frameCount += 1
        if fpsWindowStart == 0 { fpsWindowStart = t }
        if t - fpsWindowStart >= 1 {
            let fps = Double(frameCount) / (t - fpsWindowStart)
            let drops = dropCount
            frameCount = 0; dropCount = 0; fpsWindowStart = t
            DispatchQueue.main.async { [weak self] in self?.onFps?(fps, drops) }
        }

        CVPixelBufferLockBaseAddress(pb, .readOnly)
        defer { CVPixelBufferUnlockBaseAddress(pb, .readOnly) }
        guard let base = CVPixelBufferGetBaseAddressOfPlane(pb, 0) else { return }
        let view = GrayView(base: UnsafePointer(base.assumingMemoryBound(to: UInt8.self)),
                            width: CVPixelBufferGetWidthOfPlane(pb, 0),
                            height: CVPixelBufferGetHeightOfPlane(pb, 0),
                            rowBytes: CVPixelBufferGetBytesPerRowOfPlane(pb, 0),
                            time: t)
        detector.process(view)
    }

    func captureOutput(_ output: AVCaptureOutput, didDrop sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
        dropCount += 1
    }
}
