import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { getFetchLogsByCdk } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const cdkId = new URL(req.url).searchParams.get("cdkId");
  if (!cdkId) return NextResponse.json({ error: "cdkId 必填" }, { status: 400 });
  const logs = getFetchLogsByCdk(Number(cdkId));
  return NextResponse.json({ data: logs });
}
