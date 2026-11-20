import Foundation
import WebKit

/// アプリに同梱した Web 版（ai-golf フォルダ）を aigolf://app/... で配信する。
/// file:// だと ES モジュールが読み込めないため、独自スキームで配信している。
final class LocalSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "aigolf"
    private let root: URL? = Bundle.main.url(forResource: "ai-golf", withExtension: nil)

    private static let mime: [String: String] = [
        "html": "text/html; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "svg": "image/svg+xml",
        "json": "application/json",
        "webmanifest": "application/manifest+json",
        "png": "image/png",
        "jpg": "image/jpeg",
        "webp": "image/webp",
    ]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url, let root else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path), let data = try? Data(contentsOf: file) else {
            task.didFailWithError(URLError(.fileDoesNotExist)); return
        }
        let type = Self.mime[file.pathExtension.lowercased()] ?? "application/octet-stream"
        let resp = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                   headerFields: ["Content-Type": type, "Content-Length": "\(data.count)", "Cache-Control": "no-cache"])!
        task.didReceive(resp)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
