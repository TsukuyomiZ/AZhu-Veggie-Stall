import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const db = await getDb();
  const customers = await db
    .collection("customers")
    .find({})
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(customers);
}

export async function POST(req) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "姓名為必填" }, { status: 400 });
  }
  const db = await getDb();
  const doc = {
    name,
    phone: (body.phone || "").trim(),
    address: (body.address || "").trim(),
    note: (body.note || "").trim(),
    createdAt: new Date(),
  };
  const result = await db.collection("customers").insertOne(doc);
  return NextResponse.json({ ...doc, _id: result.insertedId });
}
