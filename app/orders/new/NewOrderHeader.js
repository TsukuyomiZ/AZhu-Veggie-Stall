"use client";

// page.js 是 server component(要 export metadata),標題要跟語言走
// 只好拆出這個小 client 元件用 useI18n
import { useI18n } from "@/lib/i18n";

export default function NewOrderHeader() {
  const { t } = useI18n();
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{t("orders.newTitle")}</h1>
      </div>
    </header>
  );
}
