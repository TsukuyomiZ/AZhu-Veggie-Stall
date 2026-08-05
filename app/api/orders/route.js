import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";

function normalizeItems(items) {
  return (items || [])
    .filter((i) => (i.name || "").trim())
    .map((i) => ({
      name: (i.name || "").trim(),
      qty: Number(i.qty) || 0,
      unit: (i.unit || "").trim(),
      price: Number(i.price) || 0, // 單價;amount(單品總額)仍是 total 的計算來源
      amount: Number(i.amount) || 0,
      prepared: !!i.prepared,
    }));
}

export async function GET(req) {
  const db = await getDb();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (date !== null && !date.trim()) {
    return NextResponse.json({ error: "日期不可為空" }, { status: 400 });
  }
  // 訪客(未登入)只能查「單日」訂單給備貨頁用；完整訂單列表要登入
  if (!date && !(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  // 帶 date 的單日查詢是備貨頁用（訪客可看）：排除 LINE 進來還沒確認的「待確認」訂單。
  // 舊訂單沒有 status 欄位＝視同已確認，所以用 $ne 而不是 $eq: "confirmed"。
  // 不帶 date 的完整列表（需登入）照舊回全部（含 pending），前端要顯示待確認區塊。
  const query = date ? { date, status: { $ne: "pending" } } : {};
  // from/to 區間查詢（歷史訂單頁用，走「不帶 date 需登入」那條規則）：只回已確認的單
  if (!date) {
    const from = (searchParams.get("from") || "").trim();
    const to = (searchParams.get("to") || "").trim();
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
      query.status = { $ne: "pending" };
    }
  }
  // 查某客戶的歷史訂單（例如帶入上次訂單），最新的排前面
  const customerId = searchParams.get("customerId");
  if (customerId) query.customerId = customerId;
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 300, 1), 300);
  const orders = await db
    .collection("orders")
    .find(query)
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .toArray();
  return NextResponse.json(orders);
}

export async function POST(req) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const body = await req.json();
  const items = normalizeItems(body.items);
  if (!body.customerId) {
    return NextResponse.json({ error: "請選擇客戶" }, { status: 400 });
  }
  if (!body.date) {
    return NextResponse.json({ error: "請選擇訂單日期" }, { status: 400 });
  }
  if (items.length === 0) {
    return NextResponse.json({ error: "至少需要一個品項" }, { status: 400 });
  }
  const db = await getDb();
  const doc = {
    customerId: body.customerId,
    customerName: (body.customerName || "").trim(),
    date: body.date, // YYYY-MM-DD
    items,
    total: items.reduce((sum, i) => sum + i.amount, 0),
    createdAt: new Date(),
  };
  const result = await db.collection("orders").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId });
}
