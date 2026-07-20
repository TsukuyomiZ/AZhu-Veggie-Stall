"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isNew = pathname === "/orders/new";
  const isOrders = pathname.startsWith("/orders") && !isNew;
  const isCustomers = pathname.startsWith("/customers");
  const isStats = pathname.startsWith("/stats");

  return (
    <nav className="bottom-nav" aria-label="主導覽">
      <div className="bottom-nav-inner">
        <Link
          href="/"
          className={`nav-item${isHome ? " active" : ""}`}
          aria-current={isHome ? "page" : undefined}
        >
          <ClipboardIcon />
          <span className="nav-label">今日備貨</span>
        </Link>

        <Link
          href="/orders"
          className={`nav-item${isOrders ? " active" : ""}`}
          aria-current={isOrders ? "page" : undefined}
        >
          <ReceiptIcon />
          <span className="nav-label">訂單</span>
        </Link>

        <div className={`nav-fab-wrap${isNew ? " active" : ""}`}>
          <Link
            href="/orders/new"
            className={`nav-fab${isNew ? " active" : ""}`}
            aria-label="新增訂單"
            aria-current={isNew ? "page" : undefined}
          >
            <PlusIcon />
          </Link>
          <span className="nav-fab-label">新增訂單</span>
        </div>

        <Link
          href="/customers"
          className={`nav-item${isCustomers ? " active" : ""}`}
          aria-current={isCustomers ? "page" : undefined}
        >
          <PeopleIcon />
          <span className="nav-label">客戶</span>
        </Link>

        <Link
          href="/stats"
          className={`nav-item${isStats ? " active" : ""}`}
          aria-current={isStats ? "page" : undefined}
        >
          <ChartIcon />
          <span className="nav-label">統計</span>
        </Link>
      </div>
    </nav>
  );
}
