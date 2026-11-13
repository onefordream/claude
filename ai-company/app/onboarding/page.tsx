import { redirect } from "next/navigation";
import { requireUserPage } from "@/lib/server/page";
import { OnboardingFlow } from "./OnboardingFlow";

export const metadata = { title: "会社設立面談" };

export default async function OnboardingPage() {
  const { store } = await requireUserPage();
  if (await store.getCompany()) redirect("/office");
  return <OnboardingFlow />;
}
