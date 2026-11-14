import { requireActiveMember } from "@/lib/auth";

/** PAST_DUE の会員は会員情報管理以外を利用できない（支払い案内へ） */
export default async function FullAccessLayout({ children }: { children: React.ReactNode }) {
  await requireActiveMember();
  return <>{children}</>;
}
