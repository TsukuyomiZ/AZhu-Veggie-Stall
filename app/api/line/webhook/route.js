import crypto from "crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { parseOrderText } from "@/lib/parse-order-text";

// 一個 webhook 可能帶多則訊息，序列處理每則都要跑 Gemini，時限拉到 60 秒
// （單則 Gemini 逾時縮到 12 秒，見下方 parseOrderText 的 timeoutMs）
export const maxDuration = 60;

// 台灣時區（UTC+8，無日光節約時間）的今天，回 YYYY-MM-DD。
// 伺服器在 Vercel 是 UTC，所以先加 8 小時再用 getUTC* 取值（嚴禁 toISOString）。
function taiwanTodayStr() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// todayStr + n 天（本地手動組字串，嚴禁 toISOString）
function addDaysStr(todayStr, n) {
  const [y, m, day] = todayStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, day + n));
  const yy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// "2026-07-31" → "7/31(明天)"、"8/2(星期六)" — LINE 回覆裡給家人看的日期
function friendlyDate(dateStr, today) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr || "";
  const label = `${parts[1]}/${parts[2]}`;
  if (dateStr === today) return `${label}(今天)`;
  if (dateStr === addDaysStr(today, 1)) return `${label}(明天)`;
  if (dateStr === addDaysStr(today, 2)) return `${label}(後天)`;
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return `${label}(星期${WEEKDAYS[d.getUTCDay()]})`;
}

// 建單成功的回覆:逐行列出解析到的品項 + 要貨日,家人不用開網站就能核對 AI 有沒有看懂
function buildOrderSummary(items, dateStr, today) {
  const MAX_LINES = 15; // 訂單極少超過,防呆避免超長訊息
  const lines = items.slice(0, MAX_LINES).map((i) => {
    if (i.qty) return `・${i.name} × ${i.qty}${i.unit || ""}`;
    return i.unit ? `・${i.name}(${i.unit})` : `・${i.name}`;
  });
  if (items.length > MAX_LINES) lines.push(`…等共 ${items.length} 項`);
  return [
    "✅ 已收到訂單(待確認)",
    ...lines,
    `要貨日:${friendlyDate(dateStr, today)}`,
    "請到網站確認客戶與金額",
  ].join("\n");
}

// 驗證 LINE 簽章：x-line-signature = HMAC-SHA256(channel secret, raw body) 的 base64
function verifySignature(rawBody, signature, channelSecret) {
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest();
  let received;
  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return false;
  }
  // 長度不同直接失敗（timingSafeEqual 長度不同會 throw）
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

// 用 replyToken 回一句確認訊息；失敗只記 log，不影響建單流程
async function replyText(replyToken, text, accessToken) {
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: "text", text }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("LINE 回覆失敗:", res.status, errBody.slice(0, 300));
    }
  } catch (err) {
    console.error("LINE 回覆失敗:", err);
  }
}

// LINE 官方帳號 webhook：家人把客人訊息轉傳進來 → Gemini 解析 → 建「待確認」訂單
export async function POST(req) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret) {
    return NextResponse.json(
      { error: "尚未設定 LINE_CHANNEL_SECRET，請先在環境變數設定" },
      { status: 503 }
    );
  }

  // 一定要用 raw body 算 HMAC（JSON.parse 再 stringify 會因為欄位順序/空白對不上）
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  if (!verifySignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ error: "簽章驗證失敗" }, { status: 401 });
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 });
  }

  const events = Array.isArray(body.events) ? body.events : [];
  // LINE 後台的 Verify 按鈕會送合法簽章但 events 為空陣列 → 直接回 200
  if (events.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const today = taiwanTodayStr();

  for (const event of events) {
    // 只處理文字訊息；其他（貼圖、圖片、加好友…）一律忽略
    if (event.type !== "message" || event.message?.type !== "text") continue;

    const fullText = String(event.message.text || "").trim();
    if (!fullText) continue;
    // 超過 2000 字截斷（訂單訊息不會這麼長，超長多半是誤傳）
    const text = fullText.slice(0, 2000);

    // 去重用 LINE 的 webhookEventId：同一事件已建過單就跳過。
    // 不能看到重送（isRedelivery）就一律跳過 —— 上一批可能處理到一半超時被砍，
    // 沒處理到的事件只會出現在重送裡，一律跳過等於把那些訂單永久丟掉。
    let db;
    try {
      db = await getDb();
    } catch (err) {
      console.error("LINE webhook 連不上資料庫:", err);
      continue;
    }
    const eventId = event.webhookEventId || null;
    if (eventId) {
      const dup = await db
        .collection("orders")
        .findOne({ lineEventId: eventId }, { projection: { _id: 1 } })
        .catch(() => null);
      if (dup) continue;
    } else if (event.deliveryContext?.isRedelivery === true) {
      // 極少數拿不到 webhookEventId 的事件，退回保守做法：重送一律跳過
      continue;
    }

    // 解析失敗（額度用完、連線異常…）不能把客人的訊息丟掉：
    // 改建一張只有原始訊息、沒有品項的待確認單，家人照著訊息手動補品項。
    let parsed = null;
    let parseFailed = false;
    try {
      parsed = await parseOrderText(text, today, { timeoutMs: 12000 });
    } catch (err) {
      if (err.code === "empty") {
        // 閒聊、貼圖說明文字等解析不出品項 → 靜默跳過，不建單也不回訊，
        // 避免垃圾訊息污染訂單列表
        continue;
      }
      console.error("LINE webhook 解析失敗:", err.code, err.message);
      parseFailed = true;
    }

    // 沒解析到日期就預設明天（與訂單表單的預設一致）;回覆摘要也要用同一個日期
    const orderDate = (parsed && parsed.date) || addDaysStr(today, 1);

    // 建「待確認」訂單：沒有客戶、沒有金額，家人之後在網站上補
    try {
      await db.collection("orders").insertOne({
        customerId: null,
        customerName: "",
        date: orderDate,
        total: 0,
        status: "pending",
        source: "line",
        sourceText: fullText,
        lineEventId: eventId,
        items: parseFailed
          ? []
          : parsed.items.map((i) => ({
              name: i.name,
              qty: i.qty,
              unit: i.unit,
              amount: 0,
              prepared: false,
            })),
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("LINE webhook 建單失敗:", err);
      continue;
    }

    // 建單成功 → 回一句確認訊息（沒設 token 或回覆失敗都不影響流程）
    if (accessToken && event.replyToken) {
      await replyText(
        event.replyToken,
        parseFailed
          ? "⚠️ 已收到訊息，AI 暫時忙碌，已先存成待確認訂單，品項請到網站對照訊息補上"
          : buildOrderSummary(parsed.items, orderDate, today),
        accessToken
      );
    }
  }

  return NextResponse.json({ ok: true });
}
