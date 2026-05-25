import { NextRequest, NextResponse } from "next/server";
import { getCdkByCode, getFetchStatsByAccount } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "CDK不能为空" }, { status: 400 });

  const cdk = getCdkByCode(code.trim().toUpperCase());
  if (!cdk) return NextResponse.json({ error: "CDK不存在" }, { status: 404 });
  if (cdk.status !== "active") return NextResponse.json({ error: "CDK已被禁用" }, { status: 403 });

  const stats = getFetchStatsByAccount(cdk.account_id);
  return NextResponse.json({
    data: {
      email: cdk.email,
      currentUser: cdk.user_name || "未知用户",
      stats,
    },
  });
}
