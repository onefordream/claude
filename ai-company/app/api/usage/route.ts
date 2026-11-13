import { NextResponse } from "next/server";
import { withUser } from "@/lib/server/http";
import { getUsageSummary } from "@/lib/server/usage";

export const GET = withUser(null, async ({ store }) => NextResponse.json(await getUsageSummary(store)));
