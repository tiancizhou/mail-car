import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/auth";
import { createCdk, getCdksWithCountByAccount, deleteCdk, updateCdkStatus, updateCdkUserName } from "@/lib/db";
import { customAlphabet } from "nanoid";

const CDK_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateCdkCode = customAlphabet(CDK_ALPHABET, 8);

export async function GET(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const accountId = new URL(req.url).searchParams.get("accountId");
  if (!accountId) return NextResponse.json({ error: "accountId 必填" }, { status: 400 });
  return NextResponse.json({ data: getCdksWithCountByAccount(Number(accountId)) });
}

export async function POST(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { accountId, userName } = await req.json();
  if (!accountId) return NextResponse.json({ error: "accountId 必填" }, { status: 400 });
  const code = "MC-" + generateCdkCode();
  createCdk(code, Number(accountId), userName);
  return NextResponse.json({ data: { code } });
}

export async function PATCH(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id, status, userName } = await req.json();
  if (status !== undefined) updateCdkStatus(id, status);
  if (userName !== undefined) updateCdkUserName(id, userName);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdmin(req)) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await req.json();
  deleteCdk(id);
  return NextResponse.json({ success: true });
}
