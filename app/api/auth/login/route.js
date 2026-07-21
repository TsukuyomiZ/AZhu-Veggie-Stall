import { NextResponse } from "next/server";
import { AUTH_COOKIE, authDisabled, makeToken, passwordMatches } from "@/lib/auth";

export async function POST(req) {
  if (authDisabled()) {
    // 未設定密碼時直接視為登入成功（本機開發用）
    return NextResponse.json({ ok: true });
  }
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  if (!password || !passwordMatches(password)) {
    return NextResponse.json({ error: "密碼錯誤" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180, // 半年免重新登入
    path: "/",
  });
  return res;
}
