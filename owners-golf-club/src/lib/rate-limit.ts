import { prisma } from "./db";

/**
 * DB を使った固定ウィンドウ方式のレート制限（サーバーレスの複数インスタンスでも共有される）。
 * 制限を超えた場合 false を返す。
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = new Date();
  const windowStartThreshold = new Date(now.getTime() - windowSec * 1000);
  return prisma.$transaction(async (tx) => {
    const row = await tx.rateLimit.findUnique({ where: { key } });
    if (!row || row.windowStart < windowStartThreshold) {
      await tx.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      });
      return true;
    }
    if (row.count >= limit) return false;
    await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return true;
  });
}

export const RATE_LIMIT_MESSAGE = "試行回数の上限に達しました。しばらく時間をおいて再度お試しください。";
