import SwiftUI
import WebKit

/// Web 画面からのライブ計測リクエスト
struct LiveRequest: Identifiable {
    let id = UUID()
    let club: String
    let total: Int
}

/// ライブ計測で取れた1球（Web 側の shot 形式に合わせる）
struct LiveShot: Codable {
    var speed: Double
    var launch: Double
    var shape: String?
    var source: String = "live"
    var frames: Int
}

/// WKWebView と SwiftUI のあいだの橋渡し。
/// JS → ネイティブ: window.webkit.messageHandlers.golf.postMessage({type: 'live', club, total})
/// ネイティブ → JS: window.AIGolfNative.receiveShots([...])
@MainActor
final class WebBridge: NSObject, ObservableObject, WKScriptMessageHandler {
    @Published var liveRequest: LiveRequest?
    weak var webView: WKWebView?
    private lazy var passStore: PassStore = {
        let store = PassStore()
        store.onChange = { [weak self] status, event, message in self?.sendPass(status, event: event, message: message) }
        return store
    }()

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "live":
            let club = body["club"] as? String ?? "dr"
            let total = max(1, min(20, (body["total"] as? Int) ?? 5))
            liveRequest = LiveRequest(club: club, total: total)
        case "pass-sync":
            Task { await passStore.publish(event: "sync") }
        case "buy":
            guard let id = body["id"] as? String else { return }
            Task { await passStore.buy(id) }
        case "restore":
            Task { await passStore.restore() }
        default:
            break
        }
    }

    private func sendPass(_ s: PassStore.Status, event: String, message: String?) {
        var info: [String: Any] = [
            "until": (s.until?.timeIntervalSince1970 ?? 0) * 1000,
            "status": event,
            "prices": s.prices,
        ]
        if let id = s.lastPassId { info["id"] = id }
        if let message { info["message"] = message }
        guard let data = try? JSONSerialization.data(withJSONObject: info), let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.AIGolfNative && window.AIGolfNative.receivePass(\(json))")
    }

    func finishLive(shots: [LiveShot]) {
        liveRequest = nil
        guard let data = try? JSONEncoder().encode(shots), let json = String(data: data, encoding: .utf8) else { return }
        webView?.evaluateJavaScript("window.AIGolfNative && window.AIGolfNative.receiveShots(\(json))")
    }
}

struct WebContainer: UIViewRepresentable {
    let bridge: WebBridge

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(LocalSchemeHandler(), forURLScheme: LocalSchemeHandler.scheme)
        config.userContentController.add(bridge, name: "golf")
        // Web 側が「アプリ内で動いている」ことを知るための目印
        config.userContentController.addUserScript(WKUserScript(
            source: "window.AIGolfHost = { platform: 'ios', live: true, iap: true };",
            injectionTime: .atDocumentStart, forMainFrameOnly: true))
        config.allowsInlineMediaPlayback = true
        config.websiteDataStore = .default()

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = .clear
        web.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        if #available(iOS 16.4, *) { web.isInspectable = true }
        #endif
        bridge.webView = web
        web.load(URLRequest(url: URL(string: "\(LocalSchemeHandler.scheme)://app/index.html#home")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
