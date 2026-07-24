"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

function ClipboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 13 2 2 4-4" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M8 7h8" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3v18h18" />
      <path d="M8 17v-6" />
      <path d="M13 17V8" />
      <path d="M18 17v-3" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function BottomNav() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [authed, setAuthed] = useState(null); // null = 確認中

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setAuthed(!!d.authed);
      })
      .catch(() => {
        if (!cancelled) setAuthed(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isHome = pathname === "/";
  const isNew = pathname === "/orders/new";
  const isOrders = pathname.startsWith("/orders") && !isNew;
  const isCustomers = pathname.startsWith("/customers");
  const isStats = pathname.startsWith("/stats");
  const isLogin = pathname.startsWith("/login");

  // 未登入(或確認中):只顯示「今日備貨」和「登入」
  if (authed !== true) {
    return (
      <nav className="bottom-nav" aria-label={t("nav.main")}>
        <div className="bottom-nav-inner">
          <Link
            href="/"
            className={`nav-item${isHome ? " active" : ""}`}
            aria-current={isHome ? "page" : undefined}
          >
            <ClipboardIcon />
            <span className="nav-label">{t("nav.today")}</span>
          </Link>

          <Link
            href="/login"
            className={`nav-item${isLogin ? " active" : ""}`}
            aria-current={isLogin ? "page" : undefined}
          >
            <LockIcon />
            <span className="nav-label">{t("nav.login")}</span>
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav" aria-label={t("nav.main")}>
      <div className="bottom-nav-inner">
        <Link
          href="/"
          className={`nav-item${isHome ? " active" : ""}`}
          aria-current={isHome ? "page" : undefined}
        >
          <ClipboardIcon />
          <span className="nav-label">{t("nav.today")}</span>
        </Link>

        <Link
          href="/orders"
          className={`nav-item${isOrders ? " active" : ""}`}
          aria-current={isOrders ? "page" : undefined}
        >
          <ReceiptIcon />
          <span className="nav-label">{t("nav.orders")}</span>
        </Link>

        <div className={`nav-fab-wrap${isNew ? " active" : ""}`}>
          <Link
            href="/orders/new"
            className={`nav-fab${isNew ? " active" : ""}`}
            aria-label={t("nav.newOrder")}
            aria-current={isNew ? "page" : undefined}
          >
            <PlusIcon />
          </Link>
          <span className="nav-fab-label">{t("nav.newOrder")}</span>
        </div>

        <Link
          href="/customers"
          className={`nav-item${isCustomers ? " active" : ""}`}
          aria-current={isCustomers ? "page" : undefined}
        >
          <PeopleIcon />
          <span className="nav-label">{t("nav.customers")}</span>
        </Link>

        <Link
          href="/stats"
          className={`nav-item${isStats ? " active" : ""}`}
          aria-current={isStats ? "page" : undefined}
        >
          <ChartIcon />
          <span className="nav-label">{t("nav.stats")}</span>
        </Link>
      </div>
    </nav>
  );
}
