const EMAIL_API_BASE = process.env.EMAIL_API_BASE!;
const EMAIL_ADMIN = process.env.EMAIL_ADMIN!;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD!;

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function genToken(): Promise<string> {
  const res = await fetch(`${EMAIL_API_BASE}/api/public/genToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL_ADMIN, password: EMAIL_PASSWORD }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || "genToken failed");
  const token: string = data.data.token;
  cachedToken = token;
  tokenExpiry = Date.now() + 30 * 60 * 1000;
  return token;
}

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  return genToken();
}

export interface EmailItem {
  emailId: number;
  sendEmail: string;
  sendName: string;
  subject: string;
  toEmail: string;
  toName: string;
  createTime: string;
  type: number;
  content: string;
  text: string;
  isDel: number;
}

function isWithinMinutes(isoTime: string, minutes: number): boolean {
  const emailTime = new Date(isoTime.replace(" ", "T") + "Z").getTime();
  return Date.now() - emailTime <= minutes * 60 * 1000;
}

async function doEmailList(toEmail: string, token: string): Promise<EmailItem[]> {
  const res = await fetch(`${EMAIL_API_BASE}/api/public/emailList`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ toEmail, type: 0, isDel: 0, timeSort: "desc", num: 1, size: 5 }),
  });
  const data = await res.json();
  if (data.code !== 200) throw new Error(data.message || "emailList failed");
  return data.data || [];
}

export async function fetchEmails(toEmail: string, withinMinutes = 1): Promise<EmailItem[]> {
  const token = await getToken();

  try {
    const emails = await doEmailList(toEmail, token);
    return emails.filter((e) => isWithinMinutes(e.createTime, withinMinutes));
  } catch {
    // Token expired, retry once
    cachedToken = null;
    const newToken = await getToken();
    const emails = await doEmailList(toEmail, newToken);
    return emails.filter((e) => isWithinMinutes(e.createTime, withinMinutes));
  }
}
