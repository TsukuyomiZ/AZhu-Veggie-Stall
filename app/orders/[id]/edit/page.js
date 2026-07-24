"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import OrderForm from "@/components/OrderForm";
import { useI18n } from "@/lib/i18n";

export default function EditOrderPage() {
  const { t } = useI18n();
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
          <h1 className="page-title">
            {order && order.status === "pending" ? t("orders.confirmTitle") : t("orders.editTitle")}
          </h1>
        </div>
      </header>

      {status === "loading" && <p className="text-muted mt-4">{t("orders.loadingOrder")}</p>}

      {status === "notfound" && (
        <div className="empty">
          <div className="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <p className="empty-text">{t("orders.notFound")}</p>
          <p className="empty-hint">{t("orders.notFoundHint")}</p>
          <Link href="/orders" className="btn btn-primary">{t("orders.backToList")}</Link>
        </div>
      )}

      {status === "error" && (
        <div className="empty">
          <p className="empty-text">{t("orders.loadFailedTitle")}</p>
          <p className="empty-hint">{t("orders.loadFailedHint")}</p>
          <Link href="/orders" className="btn btn-primary">{t("orders.backToList")}</Link>
        </div>
      )}

      {status === "ready" && <OrderForm initial={order} />}
    </>
  );
}
