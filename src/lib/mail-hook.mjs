// ============================================================================
// mail-hook.mjs — 自動返信メール送信フック（未実装のスタブ）
//
// 現時点ではメール送信サービスの資格情報が未設定のため、実際の送信は行って
// いません。SMTP や SendGrid / Resend 等のAPIキーが用意でき次第、この関数の
// 中身を実装してください。呼び出し側（server.mjs）は既にこの関数を
// エントリー・お問い合わせ受付の直後に呼ぶ構造になっています。
// ============================================================================

/**
 * @param {{to:string, kind:"entry-confirmed"|"entry-waitlist"|"contact", payload:object}} params
 */
export async function sendAutoReply(params) {
  // TODO: メール送信サービスを実装する
  // 例: nodemailer / Resend / SendGrid 等のAPIをここで呼び出す
  // 現状は何もしない（ログにも出さない = 本番シークレットが無いことを前提)
  return { sent: false, reason: "not-configured" };
}
