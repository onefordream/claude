import "server-only";
import type { UsageSummary } from "@/lib/types";
import { serverConfig } from "@/lib/config";
import { periodStartsUtc } from "@/lib/game/dates";
import { getAdminStore } from "./auth";
import type { UserStore } from "./store/types";

export async function getUsageSummary(store: UserStore): Promise<UsageSummary> {
  const plan = await store.getPlan();
  const limits = (await getAdminStore().getSettings()).plans[plan];
  const p = periodStartsUtc(serverConfig.timezone);
  const [chatToday, chatMonth, meetingToday] = await Promise.all([
    store.countUsage(["chat", "task"], p.dayStart),
    store.countUsage(["chat", "task"], p.monthStart),
    store.countUsage(["meeting"], p.dayStart),
  ]);
  return {
    plan,
    chatToday,
    chatDailyLimit: limits.chatDaily,
    chatMonth,
    chatMonthlyLimit: limits.chatMonthly,
    meetingToday,
    meetingDailyLimit: limits.meetingDaily,
  };
}
