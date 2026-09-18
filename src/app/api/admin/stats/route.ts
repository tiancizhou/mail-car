import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { getDashboardStats, getFetchTrend, getAccountUsage, getExpiringSoon } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  switch (type) {
    case "dashboard":
      return NextResponse.json({ data: getDashboardStats() });
    case "trend":
      const days = parseInt(searchParams.get("days") || "7");
      return NextResponse.json({ data: getFetchTrend(days) });
    case "usage":
      return NextResponse.json({ data: getAccountUsage() });
    case "expiring":
      const inactiveDays = parseInt(searchParams.get("days") || "30");
      return NextResponse.json({ data: getExpiringSoon(inactiveDays) });
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
}
