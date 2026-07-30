import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const db = await getDb();
  const prices = await db
    .collection("prices")
    .find({})
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(prices);
}

export async function POST(req) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "品項名稱為必填" }, { status: 400 });
  }
  const price = Number(body.price);
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json(
      { error: "單價必須是 0 以上的數字" },
      { status: 400 }
    );
  }
  const db = await getDb();
  const existing = await db.collection("prices").findOne({ name });
  if (existing) {
    return NextResponse.json(
      { error: `「${name}」已在價目表中` },
      { status: 409 }
    );
  }
  const doc = {
    name,
    unit: (body.unit || "").trim(),
    price,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const result = await db.collection("prices").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId });
}
