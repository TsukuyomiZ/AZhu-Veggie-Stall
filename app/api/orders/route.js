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
  const query = date ? { date } : {};
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
