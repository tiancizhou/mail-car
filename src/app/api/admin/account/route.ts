import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { createAccount, deleteAccount, getAllAccounts, updateAccount } from "@/lib/db";

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const accounts = getAllAccounts();
  return NextResponse.json({ data: accounts });
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { email, password, note } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "邮箱不能为空" }, { status: 400 });
  }

  createAccount(email, password, note);
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id, email, password, note, status } = await req.json();
  updateAccount(id, email, password || "", note || "", status);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await req.json();
  deleteAccount(id);
  return NextResponse.json({ success: true });
}
