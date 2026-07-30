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

export async function PUT(req, { params }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const { id } = await params;
  const _id = ObjectId.isValid(id) ? toObjectId(id) : null;
  if (!_id) {
    return NextResponse.json({ error: "找不到這筆價目" }, { status: 404 });
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
  const duplicate = await db
    .collection("prices")
    .findOne({ name, _id: { $ne: _id } });
  if (duplicate) {
    return NextResponse.json(
      { error: `「${name}」已在價目表中` },
      { status: 409 }
    );
  }
  const update = {
    name,
    unit: (body.unit || "").trim(),
    price,
    updatedAt: new Date(),
  };
  const result = await db
    .collection("prices")
    .findOneAndUpdate({ _id }, { $set: update }, { returnDocument: "after" });
  if (!result) {
    return NextResponse.json({ error: "找不到這筆價目" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function DELETE(req, { params }) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const { id } = await params;
  const _id = ObjectId.isValid(id) ? toObjectId(id) : null;
  if (!_id) {
    return NextResponse.json({ error: "找不到這筆價目" }, { status: 404 });
  }

  const db = await getDb();
  const result = await db.collection("prices").deleteOne({ _id });
  if (result.deletedCount === 0) {
    return NextResponse.json({ error: "找不到這筆價目" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
