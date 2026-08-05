import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";

function toObjectId(id) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

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

export async function GET(req, { params }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const { id } = await params;
  const _id = toObjectId(id);
  if (!_id) return NextResponse.json({ error: "無效的 id" }, { status: 400 });

  const db = await getDb();
  const order = await db.collection("orders").findOne({ _id });
  if (!order) return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req, { params }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const { id } = await params;
  const _id = toObjectId(id);
  if (!_id) return NextResponse.json({ error: "無效的 id" }, { status: 400 });

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
  // 只 $set 指定欄位，LINE 進來的 source / sourceText 不會被蓋掉
  const update = {
    customerId: body.customerId,
    customerName: (body.customerName || "").trim(),
    date: body.date,
    items,
    total: items.reduce((sum, i) => sum + i.amount, 0),
  };

  // 確認訂單：只允許 pending → confirmed 這個方向，body 帶其他 status 值一律忽略
  if (body.status === "confirmed") {
    if (!body.customerId || !update.customerName) {
      return NextResponse.json({ error: "請先選擇客戶" }, { status: 400 });
    }
    const existing = await db.collection("orders").findOne({ _id });
    if (!existing) {
      return NextResponse.json({ error: "找不到訂單" }, { status: 404 });
    }
    if (existing.status === "pending") {
      update.status = "confirmed";
    }
  }

  await db.collection("orders").updateOne({ _id }, { $set: update });
  return NextResponse.json({ ok: true });
}

// 勾選／取消勾選單一品項的備貨狀態
export async function PATCH(req, { params }) {
  const { id } = await params;
  const _id = toObjectId(id);
  if (!_id) return NextResponse.json({ error: "無效的 id" }, { status: 400 });

  const body = await req.json();
  const index = Number(body.itemIndex);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "無效的品項索引" }, { status: 400 });
  }
  const db = await getDb();
  // 條件加上 items.{index} 必須存在，避免越界索引把陣列補成 null；
  // 待確認（pending）訂單還沒轉正，不開放勾備貨
  const result = await db
    .collection("orders")
    .updateOne(
      { _id, status: { $ne: "pending" }, [`items.${index}`]: { $exists: true } },
      { $set: { [`items.${index}.prepared`]: !!body.prepared } }
    );
  if (result.matchedCount === 0) {
    return NextResponse.json(
      { error: "找不到該品項，訂單可能已被修改，請重新整理" },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const { id } = await params;
  const _id = toObjectId(id);
  if (!_id) return NextResponse.json({ error: "無效的 id" }, { status: 400 });

  const db = await getDb();
  await db.collection("orders").deleteOne({ _id });
  return NextResponse.json({ ok: true });
}
