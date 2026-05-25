import { NextRequest } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_TOKEN = "mail-car-admin-session";

export function verifyAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(SESSION_TOKEN)?.value;
  return !!token;
}

export { ADMIN_PASSWORD, SESSION_TOKEN };
