// 共用的 Gemini 訂單解析邏輯：
// 給「AI 解析框」(app/api/ai/parse-order) 與「LINE webhook 自動收單」(app/api/line/webhook) 共用。
// 失敗時 throw 帶 code 屬性的 Error（message 是給長輩看的人話），由呼叫端各自決定回應方式：
//   "no-key"     沒設定 GEMINI_API_KEY
//   "rate-limit" 429 額度用完
//   "upstream"   連不上 / 非 2xx / 回傳格式異常
//   "empty"      解析不出任何品項

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

// 「今天」的日期由呼叫端帶進來（前端手機本地時間、或 webhook 用台灣時區算），
// 動態組進 prompt，這樣「明天」「禮拜六」才算得準（伺服器部署在雲端時是 UTC 時區，不可信）。
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

// 建立帶錯誤代碼的 Error，呼叫端用 err.code 分流
function codedError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * 把顧客的中文訊息解析成 { date, items }。
 * @param {string} text 顧客訊息（呼叫端先驗過非空、長度）
 * @param {string} todayStr 「今天」的 YYYY-MM-DD（呼叫端算好帶進來）
 * @param {{timeoutMs?: number}} [opts] webhook 這種有整體時限的呼叫端可以縮短逾時
 * @returns {Promise<{date: string|null, items: Array<{name:string, qty:number, unit:string}>}>}
 * @throws {Error & {code: "no-key"|"rate-limit"|"upstream"|"empty"}}
 */
export async function parseOrderText(text, todayStr, { timeoutMs = 30000 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw codedError("no-key", "尚未設定 GEMINI_API_KEY，請先在環境變數設定");
  }

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt(todayStr) }] },
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
        signal: AbortSignal.timeout(timeoutMs),
      }
    );
  } catch (_) {
    throw codedError("upstream", "連不上 AI 服務，請檢查網路後再試");
  }

  if (res.status === 429) {
    throw codedError("rate-limit", "AI 額度暫時用完，請稍等一分鐘再試，或手動輸入");
  }
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Gemini API error:", res.status, errBody.slice(0, 500));
    throw codedError("upstream", "AI 解析服務暫時無法使用，請稍後再試");
  }

  const data = await res.json().catch(() => null);
  const jsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) {
    throw codedError("upstream", "AI 沒有回傳結果，請再試一次");
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (_) {
    throw codedError("upstream", "AI 回傳格式異常，請再試一次");
  }

  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((i) => i && String(i.name || "").trim())
    .map((i) => ({
      name: String(i.name).trim(),
      qty: Number(i.qty) > 0 ? Number(i.qty) : 1,
      unit: String(i.unit || "").trim(),
    }));

  if (items.length === 0) {
    throw codedError("empty", "看不出訂單內容，請確認貼上的文字，或手動輸入");
  }

  // 日期只收合法格式且不早於今天，其他一律當沒有
  let date = null;
  if (
    typeof parsed.date === "string" &&
    DATE_RE.test(parsed.date) &&
    parsed.date >= todayStr
  ) {
    date = parsed.date;
  }

  return { date, items };
}
