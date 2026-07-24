import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { isAuthed } from "@/lib/auth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD&prevFrom=...&prevTo=...
// 回傳該區間的營收摘要、每日營收、品項排行、客戶排行，以及上一期摘要（供比較）
export async function GET(req) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const prevFrom = searchParams.get("prevFrom") || "";
  const prevTo = searchParams.get("prevTo") || "";

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json({ error: "from/to 日期格式錯誤" }, { status: 400 });
  }
  const hasPrev = DATE_RE.test(prevFrom) && DATE_RE.test(prevTo);

  const db = await getDb();
  const orders = db.collection("orders");
  // 統計不含 LINE 進來還沒確認的「待確認」訂單；
  // 舊訂單沒有 status 欄位＝視同已確認，所以用 $ne 而不是 $eq: "confirmed"
  const notPending = { status: { $ne: "pending" } };
  const match = { date: { $gte: from, $lte: to }, ...notPending };

  const [summaryArr, byDate, byItem, byCustomer, prevArr] = await Promise.all([
    orders
      .aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            revenue: { $sum: "$total" },
            orderCount: { $sum: 1 },
            customers: { $addToSet: "$customerId" },
          },
        },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: match },
        { $group: { _id: "$date", revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: match },
        { $unwind: "$items" },
        {
          $group: {
            _id: { name: "$items.name", unit: "$items.unit" },
            qty: { $sum: "$items.qty" },
            amount: { $sum: "$items.amount" },
            times: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    orders
      .aggregate([
        { $match: match },
        { $group: { _id: "$customerName", amount: { $sum: "$total" }, orders: { $sum: 1 } } },
        { $sort: { amount: -1 } },
        { $limit: 5 },
      ])
      .toArray(),
    hasPrev
      ? orders
          .aggregate([
            { $match: { date: { $gte: prevFrom, $lte: prevTo }, ...notPending } },
            { $group: { _id: null, revenue: { $sum: "$total" }, orderCount: { $sum: 1 } } },
          ])
          .toArray()
      : Promise.resolve([]),
  ]);

  const s = summaryArr[0];
  const p = prevArr[0];

  return NextResponse.json({
    summary: {
      revenue: s ? s.revenue : 0,
      orderCount: s ? s.orderCount : 0,
      customerCount: s ? s.customers.length : 0,
    },
    prev: hasPrev
      ? { revenue: p ? p.revenue : 0, orderCount: p ? p.orderCount : 0 }
      : null,
    byDate: byDate.map((d) => ({ date: d._id, revenue: d.revenue, orders: d.orders })),
    byItem: byItem.map((i) => ({
      name: i._id.name,
      unit: i._id.unit,
      qty: i.qty,
      amount: i.amount,
      times: i.times,
    })),
    byCustomer: byCustomer.map((c) => ({ name: c._id, amount: c.amount, orders: c.orders })),
  });
}
