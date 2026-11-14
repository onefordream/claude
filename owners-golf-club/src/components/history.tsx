import type { StatusHistory, User } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";

export function HistoryList({ items }: { items: (StatusHistory & { changedBy: Pick<User, "name" | "role"> | null })[] }) {
  if (items.length === 0) return <p className="text-sm text-mute">履歴はありません。</p>;
  return (
    <ol className="space-y-3 text-sm">
      {items.map((h) => (
        <li key={h.id} className="border-l-2 border-gold pl-3">
          <p className="text-xs text-mute">
            {fmtDateTime(h.createdAt)} ・ {h.changedBy ? `${h.changedBy.name}${h.changedBy.role === "ADMIN" ? "（管理者）" : "（本人）"}` : "システム"}
          </p>
          <p>
            {h.fromStatus ? STATUS_LABEL[h.fromStatus] : "—"} → <strong>{STATUS_LABEL[h.toStatus]}</strong>
          </p>
          {h.note ? <p className="mt-1 text-xs whitespace-pre-wrap text-mute">{h.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
