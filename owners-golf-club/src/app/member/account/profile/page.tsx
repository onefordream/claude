import { prisma } from "@/lib/db";
import { requireMemberArea } from "@/lib/auth";
import { MemberTitle } from "@/components/member";
import { BackLink, Card, btn, inputCls } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PROFILE_FIELDS, parseVisibility } from "@/lib/profile";
import { updateProfileAction } from "@/actions/member";

export const metadata = { title: "会員紹介の掲載設定" };

const LONG = new Set(["businessDescription", "message"]);

export default async function ProfileSettings() {
  const user = await requireMemberArea();
  const p = await prisma.memberProfile.findUnique({ where: { userId: user.id } });
  const vis = parseVisibility(p?.visibility);
  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/member/account">会員情報管理</BackLink>
      <div className="mt-4">
        <MemberTitle en="PROFILE" title="会員紹介の掲載設定">
          「公開」にチェックを入れた項目だけが、他の会員に表示されます。チェックのない項目は他の会員には一切表示されません。お名前は掲載時に表示されます。
        </MemberTitle>
      </div>
      <Card>
        <ActionForm action={updateProfileAction}>
          <label className="flex items-center gap-2 border border-gold/60 bg-[#fbf7ea] p-4 text-sm">
            <input type="checkbox" name="listed" defaultChecked={p?.listed} />
            会員企業・経営者紹介ページに掲載する
          </label>
          {PROFILE_FIELDS.map(([k, label]) => (
            <div key={k} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={k} className="text-sm font-medium">{label}</label>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" name={`show_${k}`} defaultChecked={vis[k]} />
                  公開
                </label>
              </div>
              {LONG.has(k) ? (
                <textarea id={k} name={k} rows={4} maxLength={2000} defaultValue={p?.[k] ?? ""} className={inputCls} />
              ) : (
                <input id={k} name={k} maxLength={300} defaultValue={p?.[k] ?? ""} className={inputCls} />
              )}
            </div>
          ))}
          <SubmitButton className={`${btn.primary} w-full`}>保存する</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
