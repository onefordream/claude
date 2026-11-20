import AVFoundation
import SwiftUI
import UIKit

/// カメラ映像のプレビュー。タップ位置をモデルに渡す。
struct CameraPreview: UIViewRepresentable {
    let model: LiveMeasureModel

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
        var onTap: ((CGPoint) -> Void)?

        override func layoutSubviews() {
            super.layoutSubviews()
            // 横向き（ホームボタン側が右）= センサー本来の向き
            if let c = previewLayer.connection {
                if #available(iOS 17.0, *) {
                    if c.isVideoRotationAngleSupported(0) { c.videoRotationAngle = 0 }
                } else if c.isVideoOrientationSupported {
                    c.videoOrientation = .landscapeRight
                }
            }
        }

        @objc func tapped(_ g: UITapGestureRecognizer) { onTap?(g.location(in: self)) }
    }

    func makeUIView(context: Context) -> PreviewView {
        let v = PreviewView()
        v.backgroundColor = .black
        v.previewLayer.session = model.camera.session
        v.previewLayer.videoGravity = .resizeAspect   // 映像全体を表示（タップ位置がずれないように）
        v.onTap = { [weak model] p in model?.tap(at: p) }
        v.addGestureRecognizer(UITapGestureRecognizer(target: v, action: #selector(PreviewView.tapped(_:))))
        model.previewLayer = v.previewLayer
        return v
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}
}
