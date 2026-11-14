import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader, btn } from "@/components/ui";
import { ApplyForm } from "@/components/apply-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "入会申請" };

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : user.role === "MEMBER" ? "/member" : "/apply/status");
  return (
    <>
      <PageHeader
        en="APPLICATION"
        title="入会申請"
        lead={<>OWNERS GOLF CLUBは完全審査制です。以下のフォームからお申し込みください。既に申請済みの方は<Link href="/login" className={btn.link}>ログイン</Link>して申請状況をご確認ください。</>}
      />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <ApplyForm />
      </div>
    </>
  );
}
