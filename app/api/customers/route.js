import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";

export async function GET() {
  const db = await getDb();
  const customers = await db
    .collection("customers")
    .find({})
    .sort({ name: 1 })
    .toArray();
  return NextResponse.json(customers);
}

export async function POST(req) {
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
