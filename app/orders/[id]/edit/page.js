"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import OrderForm from "@/components/OrderForm";

export default function EditOrderPage() {
  const params = useParams();
  const id = params?.id;

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | notfound | error

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/orders/${id}`)
      .then((res) => {
        if (res.status === 404 || res.status === 400) {
          if (!cancelled) setStatus("notfound");
          return null;
        }
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        if (cancelled || data === null) return;
        if (!data || !data._id) {
          setStatus("notfound");
          return;
        }
        setOrder(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">編輯訂單</h1>
        </div>
      </header>

      {status === "loading" && <p className="text-muted mt-4">載入訂單中…</p>}

      {status === "notfound" && (
        <div className="empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="empty-text">找不到這筆訂單</p>
          <p className="empty-hint">訂單可能已被刪除</p>
          <Link href="/orders" className="btn btn-primary">回訂單列表</Link>
        </div>
      )}

      {status === "error" && (
        <div className="empty">
          <p className="empty-text">訂單載入失敗</p>
          <p className="empty-hint">請檢查網路後重新整理</p>
          <Link href="/orders" className="btn btn-primary">回訂單列表</Link>
        </div>
      )}

      {status === "ready" && <OrderForm initial={order} />}
    </>
  );
}
