import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";

// 用官方別名「最新 Flash 穩定版」，避免像 gemini-2.5-flash 那樣被退役導致 404
const GEMINI_MODEL = "gemini-flash-latest";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysStr(todayStr, n) {
  const d = parseDateStr(todayStr);
  d.setDate(d.getDate() + n);
  return fmtDate(d);
}

// 未來最近的星期 X（不含今天）
function nextWeekdayStr(todayStr, weekdayIdx) {
  const d = parseDateStr(todayStr);
  let diff = (weekdayIdx - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  return fmtDate(d);
}

// 今天的日期由前端（手機的本地時間）帶上來，動態組進 prompt，
// 這樣「明天」「禮拜六」才算得準（伺服器部署在雲端時是 UTC 時區，不可信）。
function buildSystemPrompt(todayStr) {
  const weekday = WEEKDAYS[parseDateStr(todayStr).getDay()];
  const saturday = nextWeekdayStr(todayStr, 6);
  return `你是菜攤的訂單解析助手。把顧客傳來的中文訊息解析成結構化的訂單品項與要貨日期。

今天是 ${todayStr}（星期${weekday}）。

品項規則：
- 每個品項輸出 name（品名）、qty（數量，數字）、unit（單位，例如：斤、公斤、兩、把、顆、粒、箱、袋、包、條、隻、塊）。
- 中文數字轉成阿拉伯數字：「兩把」→ qty 2、unit 把；「半斤」→ qty 0.5、unit 斤。
- 顧客說「不要」「取消」「不用了」某品項，就不要輸出該品項。
- 同一品項被修改數量時，以最後提到的為準。
- 忽略問候語、表情符號和與訂購無關的內容。
- 沒講數量的品項 qty 給 1；單位聽不出來就給空字串。

日期規則（date 欄位，格式 YYYY-MM-DD）：
- 「明天」→ 今天 +1 天；「後天」→ +2 天；「大後天」→ +3 天。
- 「禮拜X」「週X」「星期X」→ 未來最近的那個星期X（不含今天）。
- 「X月X日」「X號」→ 最近的未來那一天（今年已過就算下個月或明年）。
- 訊息完全沒提到時間就給 null，不要自己猜。

範例 1：
輸入：「明天要 高麗菜2顆 蔥三把 小黃瓜一袋」
輸出：date="${addDaysStr(todayStr, 1)}"，items=[{name:"高麗菜",qty:2,unit:"顆"},{name:"蔥",qty:3,unit:"把"},{name:"小黃瓜",qty:1,unit:"袋"}]

範例 2：
輸入：「老闆你好~ 禮拜六要豆腐4塊 空心菜半斤 啊豆腐不用了」
輸出：date="${saturday}"，items=[{name:"空心菜",qty:0.5,unit:"斤"}]

範例 3：
輸入：「跟上次一樣要蘿蔔3條，等等改5條好了，再加一包金針菇」
輸出：date=null，items=[{name:"蘿蔔",qty:5,unit:"條"},{name:"金針菇",qty:1,unit:"包"}]`;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    date: { type: "STRING", nullable: true },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          qty: { type: "NUMBER" },
          unit: { type: "STRING" },
        },
        required: ["name"],
      },
    },
  },
  required: ["items"],
};

export async function POST(req) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "尚未設定 GEMINI_API_KEY，請先在環境變數設定" },
      { status: 500 }
    );
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

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(today) }] },
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.1,
    },
  };

  let res;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000),
      }
    );
  } catch (_) {
    return NextResponse.json(
      { error: "連不上 AI 服務，請檢查網路後再試" },
      { status: 502 }
    );
  }

  if (res.status === 429) {
    return NextResponse.json(
      { error: "AI 額度暫時用完，請稍等一分鐘再試，或手動輸入" },
      { status: 429 }
    );
  }
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Gemini API error:", res.status, errBody.slice(0, 500));
    return NextResponse.json(
      { error: "AI 解析服務暫時無法使用，請稍後再試" },
      { status: 502 }
    );
  }

  const data = await res.json().catch(() => null);
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) {
    return NextResponse.json(
      { error: "AI 沒有回傳結果，請再試一次" },
      { status: 502 }
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (_) {
    return NextResponse.json(
      { error: "AI 回傳格式異常，請再試一次" },
      { status: 502 }
    );
  }

  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((i) => i && String(i.name || "").trim())
    .map((i) => ({
      name: String(i.name).trim(),
      qty: Number(i.qty) > 0 ? Number(i.qty) : 1,
      unit: String(i.unit || "").trim(),
    }));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "看不出訂單內容，請確認貼上的文字，或手動輸入" },
      { status: 422 }
    );
  }

  // 日期只收合法格式且不早於今天，其他一律當沒有
  let date = null;
  if (typeof parsed.date === "string" && DATE_RE.test(parsed.date) && parsed.date >= today) {
    date = parsed.date;
  }

  return NextResponse.json({ date, items });
}
