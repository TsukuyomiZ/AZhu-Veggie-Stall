import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { parseOrderText } from "@/lib/parse-order-text";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// 薄包裝：驗登入、驗輸入，實際的 Gemini 解析在 lib/parse-order-text.js（與 LINE webhook 共用）
export async function POST(req) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  if (!text) {
    return NextResponse.json({ error: "請先貼上訂單文字" }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: "文字太長，請分段解析" }, { status: 400 });
  }
  // 前端沒帶今天日期時退回伺服器時間（本機開發時區正確；雲端會有 UTC 誤差）
  const today = DATE_RE.test(String(body.today || "")) ? body.today : fmtDate(new Date());

  try {
    const parsed = await parseOrderText(text, today);
    return NextResponse.json(parsed);
  } catch (err) {
    // 共用函式的 err.message 已是給使用者看的人話，這裡只把 code 對回 status code
    const STATUS_BY_CODE = {
      "no-key": 500,
      "rate-limit": 429,
      empty: 422,
      upstream: 502,
    };
    const status = STATUS_BY_CODE[err.code];
    if (status) {
      return NextResponse.json({ error: err.message }, { status });
    }
    // 預期外的錯誤不把內部訊息露給使用者
    console.error("parse-order 未預期錯誤:", err);
    return NextResponse.json(
      { error: "AI 解析服務暫時無法使用，請稍後再試" },
      { status: 502 }
    );
  }
}
