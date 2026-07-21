import crypto from "crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE = "azhu_auth";

// 沒設定 APP_PASSWORD 時視為「未啟用登入」，全部放行（方便本機開發）。
// 正式環境務必在 Vercel 設定 APP_PASSWORD。
export function authDisabled() {
  return !process.env.APP_PASSWORD;
}

// 登入成功後發給瀏覽器的 token：由密碼推導，換密碼即讓所有裝置登出
export function makeToken() {
  return crypto
    .createHmac("sha256", process.env.APP_PASSWORD)
    .update("azhu-auth-v1")
    .digest("hex");
}

function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function passwordMatches(input) {
  return safeEqual(input, process.env.APP_PASSWORD);
}

export async function isAuthed() {
  if (authDisabled()) return true;
  const store = await cookies();
  const val = store.get(AUTH_COOKIE)?.value;
  if (!val) return false;
  return safeEqual(val, makeToken());
}
