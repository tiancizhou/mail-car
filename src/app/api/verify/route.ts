import { NextRequest, NextResponse } from "next/server";
import { getCdkByCode, addFetchLog } from "@/lib/db";
import { fetchEmails } from "@/lib/email-api";
import { extractVerificationCodes } from "@/lib/extract-code";

export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "CDK不能为空" }, { status: 400 });

  const cdk = getCdkByCode(code.trim().toUpperCase());
  if (!cdk) return NextResponse.json({ error: "CDK不存在" }, { status: 404 });
  if (cdk.status !== "active") return NextResponse.json({ error: "CDK已被禁用" }, { status: 403 });

  try {
    const emails = await fetchEmails(cdk.email);
    console.log("[verify] email:", cdk.email, "fetchCount:", emails.length);
    if (emails.length > 0) {
      console.log("[verify] firstEmail:", JSON.stringify({ subject: emails[0].subject, createTime: emails[0].createTime, from: emails[0].sendEmail }));
    }

    if (emails.length > 0) {
      addFetchLog(cdk.account_id, cdk.id, cdk.user_name);
    }

    const results = emails.map((email) => {
      const codes = extractVerificationCodes(email.content || "", email.text || "");
      return {
        emailId: email.emailId,
        subject: email.subject,
        from: email.sendEmail,
        time: email.createTime,
        codes,
        text: email.text,
        html: email.content,
      };
    });

    return NextResponse.json({
      data: { email: cdk.email, userName: cdk.user_name, emails: results },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "查询邮件失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
