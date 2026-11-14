/**
 * メール送信インターフェース。
 * 開発時はログ出力のダミー実装（ConsoleMailer）。本番では送信サービス（SendGrid / Resend / SES 等）
 * の実装を追加し、getMailer() の切り替えで差し替える。
 */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    console.info(
      `[mail:dev] to=${message.to} subject=${message.subject}\n----\n${message.text}\n----`,
    );
  }
}

let mailer: Mailer | null = null;

export function getMailer(): Mailer {
  if (!mailer) mailer = new ConsoleMailer();
  return mailer;
}

export async function sendMail(message: MailMessage): Promise<void> {
  try {
    await getMailer().send(message);
  } catch (e) {
    console.error("[mail] send failed", e instanceof Error ? e.message : e);
  }
}

export const MAIL_FOOTER = "\n\n--\nOWNERS GOLF CLUB 事務局\n※本メールは送信専用です。";
