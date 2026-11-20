import Foundation
import StoreKit

/// AIパス（買い切りの期間パス）の購入と期限の管理。
///
/// App Store では「非更新サブスクリプション（Non-Renewing Subscription）」として登録する。
/// 非更新サブスクリプションは期限を App Store が管理しないため、
/// 購入履歴（購入日時と日数）から期限をアプリ側で計算する：
///   有効期限 = 購入を古い順に並べ、max(前の期限, 購入日時) + 日数 を積み上げたもの
/// 購入履歴は同じ Apple ID の端末間で同期されるので、機種変更や再インストールでも復元できる。
@MainActor
final class PassStore {
    /// Web 側の ID → 日数
    static let passDays: [String: Int] = ["day1": 1, "day3": 3, "day7": 7]
    /// App Store Connect に登録する製品 ID の接頭辞（Bundle ID に合わせて変更する）
    static let productPrefix = "com.example.aigolflab.pass."

    struct Status {
        var until: Date?
        var lastPassId: String?
        var prices: [String: String]
    }

    private var products: [String: Product] = [:]
    private var updatesTask: Task<Void, Never>?
    /// 状態が変わったときの通知（Web へ渡す）
    var onChange: ((Status, _ event: String, _ message: String?) -> Void)?

    init() {
        // アプリ外で完了した購入（承認待ちが承認された など）を受け取る
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if case .verified(let t) = result { await t.finish() }
                await self.publish(event: "purchased")
            }
        }
    }

    static func webId(for productID: String) -> String? {
        productID.hasPrefix(productPrefix) ? String(productID.dropFirst(productPrefix.count)) : nil
    }

    func loadProducts() async {
        let ids = Self.passDays.keys.map { Self.productPrefix + $0 }
        if let list = try? await Product.products(for: ids) {
            for p in list { if let id = Self.webId(for: p.id) { products[id] = p } }
        }
    }

    // MARK: - 購入

    func buy(_ webId: String) async {
        if products.isEmpty { await loadProducts() }
        guard let product = products[webId] else {
            await publish(event: "failed", message: "商品情報を取得できませんでした。通信環境を確認してください。")
            return
        }
        do {
            switch try await product.purchase() {
            case .success(let verification):
                guard case .verified(let t) = verification else {
                    await publish(event: "failed", message: "購入を確認できませんでした。")
                    return
                }
                await t.finish()
                await publish(event: "purchased")
            case .userCancelled:
                await publish(event: "cancelled")
            case .pending:
                await publish(event: "pending")
            @unknown default:
                await publish(event: "failed")
            }
        } catch {
            await publish(event: "failed", message: "購入できませんでした（\(error.localizedDescription)）")
        }
    }

    /// 「購入を復元」：App Store と購入履歴を同期し直す
    func restore() async {
        try? await AppStore.sync()
        await publish(event: "restored")
    }

    // MARK: - 期限の計算

    func currentStatus() async -> Status {
        if products.isEmpty { await loadProducts() }
        var purchases: [(date: Date, days: Int, id: String)] = []
        for await result in Transaction.all {
            guard case .verified(let t) = result,
                  t.productType == .nonRenewable,
                  t.revocationDate == nil,
                  let id = Self.webId(for: t.productID),
                  let days = Self.passDays[id] else { continue }
            purchases.append((t.purchaseDate, days * max(1, t.purchasedQuantity), id))
        }
        purchases.sort { $0.date < $1.date }
        var until: Date?
        var last: String?
        for p in purchases {
            let start = max(until ?? p.date, p.date)
            until = start.addingTimeInterval(Double(p.days) * 86_400)
            last = p.id
        }
        var prices: [String: String] = [:]
        for (id, p) in products { prices[id] = p.displayPrice }
        return Status(until: until, lastPassId: last, prices: prices)
    }

    func publish(event: String, message: String? = nil) async {
        let s = await currentStatus()
        onChange?(s, event, message)
    }
}
