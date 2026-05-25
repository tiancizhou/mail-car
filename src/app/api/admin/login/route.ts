import { NextRequest, NextResponse } from "next/server";
import { ADMIN_PASSWORD, SESSION_TOKEN } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }

  const token = crypto.randomUUID();
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_TOKEN, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return res;
}
