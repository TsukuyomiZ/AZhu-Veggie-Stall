"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

// 金額顯示(訂單列表/歷史頁共用)
export function formatMoney(n) {
  return `NT$ ${(Number(n) || 0).toLocaleString()}`;
}

// 品項摘要:「高麗菜、青蔥 等 3 項」(品項名是資料不翻,句型走字典)
export function itemSummary(items, t) {
  const names = (items || []).map((i) => i.name).filter(Boolean);
  if (names.length === 0) return t("orders.noItems");
  if (names.length <= 2) return names.join("、");
  return t("orders.moreItems", { names: names.slice(0, 2).join("、"), n: names.length });
}

// 已確認訂單卡(訂單列表頁與歷史訂單頁共用):名稱 + 備貨 badge + 品項摘要 + 合計 + 操作列
export default function OrderCard({ order, deleting, onDelete }) {
  const { t } = useI18n();
  const items = order.items || [];
  const preparedCount = items.filter((i) => i.prepared).length;
  const allPrepared = items.length > 0 && preparedCount === items.length;
  return (
    <div className="card">
      <div className="row-between">
        <span className="font-bold" style={{ fontSize: "var(--fs-lg)" }}>
          {order.customerName}
        </span>
        <span className={allPrepared ? "badge badge-green" : "badge badge-amber"}>
          {t("orders.preparedBadge", { done: preparedCount, total: items.length })}
        </span>
      </div>
      <div className="mt-2">
        <div className="item-line">
          <span>{itemSummary(items, t)}</span>
        </div>
      </div>
      <hr className="divider" />
      <div className="row-between">
        <span className="text-muted">{t("orders.subtotal")}</span>
        <span className="amount-sm">{formatMoney(order.total)}</span>
      </div>
      <div className="btn-row mt-2">
        <Link href={`/orders/${order._id}/receipt`} className="btn btn-ghost">
          {t("orders.export")}
        </Link>
        <Link href={`/orders/${order._id}/edit`} className="btn btn-ghost">
          {t("common.edit")}
        </Link>
        <button
          type="button"
          className="btn btn-ghost-danger"
          disabled={deleting}
          onClick={() => onDelete(order)}
        >
          {deleting ? t("orders.deleting") : t("common.delete")}
        </button>
      </div>
    </div>
  );
}
