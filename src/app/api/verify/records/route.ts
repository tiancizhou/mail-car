import { NextRequest, NextResponse } from "next/server";
import { getCdkByCode, getFetchStatsByAccount } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "请输入访问密钥" }, { status: 400 });

  const cdk = getCdkByCode(code.trim().toUpperCase());
  if (!cdk) return NextResponse.json({ error: "访问密钥无效" }, { status: 404 });
  if (cdk.status !== "active") return NextResponse.json({ error: "访问密钥已停用" }, { status: 403 });

  const stats = getFetchStatsByAccount(cdk.account_id);
  const currentUser = cdk.user_name || "未知用户";

  const currentStat = stats.find((s) => s.user_name === currentUser);
  const others = stats.filter((s) => s.user_name !== currentUser).slice(0, 2);
  const visibleStats = currentStat ? [currentStat, ...others] : others.slice(0, 3);

  return NextResponse.json({
    data: {
      email: cdk.email,
      currentUser,
      stats: visibleStats,
    },
  });
}
