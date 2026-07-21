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
  const _id = toObjectId(id);
  if (!_id) return NextResponse.json({ error: "無效的 id" }, { status: 400 });

  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "姓名為必填" }, { status: 400 });
  }
  const db = await getDb();
  const update = {
    name,
    phone: (body.phone || "").trim(),
    plate: (body.plate || "").trim(),
    address: (body.address || "").trim(),
    note: (body.note || "").trim(),
  };
  await db.collection("customers").updateOne({ _id }, { $set: update });
  // 同步更新既有訂單上的客戶名稱
  await db
    .collection("orders")
    .updateMany({ customerId: id }, { $set: { customerName: name } });
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
  await db.collection("customers").deleteOne({ _id });
  return NextResponse.json({ ok: true });
}
