import type { MemberStatus, Prisma } from "@prisma/client";
import { prisma } from "./db";

/** 管理者が手動で操作できるステータス遷移 */
export const ADMIN_TRANSITIONS: Partial<Record<MemberStatus, MemberStatus[]>> = {
  APPLIED: ["APPROVED", "NEEDS_INFO", "REJECTED"],
  NEEDS_INFO: ["APPROVED", "NEEDS_INFO", "REJECTED"],
  APPROVED: ["NEEDS_INFO", "REJECTED"],
  REJECTED: ["APPLIED"], // 再審査に戻す
  ACTIVE: ["SUSPENDED"],
  PAST_DUE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  CANCEL_REQUESTED: ["ACTIVE"], // 退会申請の取り下げ（退会の承認は専用操作）
};

export function canAdminTransition(from: MemberStatus, to: MemberStatus): boolean {
  return ADMIN_TRANSITIONS[from]?.includes(to) ?? false;
}

type Tx = Prisma.TransactionClient;

/**
 * ステータス遷移と履歴記録を同一トランザクションで行う。
 * expectedFrom を渡すと、現在値が一致しない場合は何もせず false を返す（競合・二重処理対策）。
 */
export async function transitionStatus(
  tx: Tx,
  params: {
    userId: string;
    to: MemberStatus;
    expectedFrom?: MemberStatus[];
    changedById?: string | null;
    note?: string | null;
    extra?: Prisma.UserUpdateInput;
  },
): Promise<boolean> {
  const user = await tx.user.findUnique({ where: { id: params.userId }, select: { status: true } });
  if (!user) return false;
  if (params.expectedFrom && !params.expectedFrom.includes(user.status)) return false;
  const res = await tx.user.updateMany({
    where: { id: params.userId, status: user.status },
    data: { status: params.to },
  });
  if (res.count !== 1) return false;
  if (params.extra) await tx.user.update({ where: { id: params.userId }, data: params.extra });
  await tx.statusHistory.create({
    data: {
      userId: params.userId,
      fromStatus: user.status,
      toStatus: params.to,
      changedById: params.changedById ?? null,
      note: params.note ?? null,
    },
  });
  return true;
}

export async function transitionStatusStandalone(params: Parameters<typeof transitionStatus>[1]) {
  return prisma.$transaction((tx) => transitionStatus(tx, params));
}
