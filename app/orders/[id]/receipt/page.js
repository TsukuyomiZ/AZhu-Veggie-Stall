"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

// "2026-07-21" → "2026/7/21 (星期二)"
function formatFullDate(dateStr) {
  const parts = (dateStr || "").split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return dateStr || "未填日期";
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return `${parts[0]}/${parts[1]}/${parts[2]} (星期${WEEKDAYS[d.getDay()]})`;
}

function formatMoney(n) {
  return `NT$ ${(Number(n) || 0).toLocaleString()}`;
}

export default function ReceiptPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null); // null = 載入中
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/orders/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError("訂單載入失敗,請回上一頁再試一次");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="empty mt-6">
        <p className="empty-text">{error}</p>
        <Link href="/orders" className="btn btn-primary mt-4">回訂單列表</Link>
      </div>
    );
  }

  if (order === null) {
    return <p className="text-muted text-center mt-6">載入中…</p>;
  }

  const items = order.items || [];

  return (
    <>
      <header className="page-header no-print">
        <div>
          <h1 className="page-title">訂單單據</h1>
          <p className="page-subtitle">{order.customerName}</p>
        </div>
      </header>

      <div className="receipt" id="receipt">
        <div className="receipt-header">
          <div className="receipt-brand">阿珠菜攤</div>
          <div className="receipt-doc-title">訂購單據</div>
        </div>

        <div className="receipt-meta">
          <div className="receipt-meta-row">
            <span className="receipt-meta-label">客戶</span>
            <span className="receipt-meta-value">{order.customerName}</span>
          </div>
          <div className="receipt-meta-row">
            <span className="receipt-meta-label">訂單日期</span>
            <span className="receipt-meta-value">{formatFullDate(order.date)}</span>
          </div>
        </div>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>品項</th>
              <th className="receipt-col-qty">數量</th>
              <th className="receipt-col-amount">金額</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td className="receipt-col-qty">
                  {item.qty ? `${item.qty} ${item.unit}`.trim() : item.unit || "—"}
                </td>
                <td className="receipt-col-amount">{formatMoney(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="receipt-total">
          <span>總額</span>
          <span className="receipt-total-amount">{formatMoney(order.total)}</span>
        </div>

        <p className="receipt-footer">感謝惠顧</p>
      </div>

      <div className="btn-row mt-4 no-print">
        <Link href="/orders" className="btn btn-ghost">回訂單列表</Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>
          存成 PDF / 列印
        </button>
      </div>
      <p className="text-muted text-sm text-center mt-2 no-print">
        按下後選擇「儲存為 PDF」即可匯出，也可以直接分享給客戶
      </p>
    </>
  );
}
