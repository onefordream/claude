import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser, getUserStore } from "./auth";

/** ログイン必須ページ用 */
export async function requireUserPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const store = await getUserStore(user);
  return { user, store };
}

/** 会社設立済み必須ページ用 */
export async function requireCompanyPage() {
  const { user, store } = await requireUserPage();
  const company = await store.getCompany();
  if (!company) redirect("/onboarding");
  return { user, store, company };
}
