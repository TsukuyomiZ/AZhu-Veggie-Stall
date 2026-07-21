"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// 包住需要登入的頁面：未登入時顯示「請先登入」，不渲染內容
export default function RequireAuth({ children }) {
  const [state, setState] = useState("loading"); // loading | ok | guest

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setState(d.authed ? "ok" : "guest");
      })
      .catch(() => {
        if (!cancelled) setState("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return <p className="text-muted text-center mt-6">確認登入狀態中…</p>;
  }

  if (state === "guest") {
    return (
      <div className="empty mt-6">
        <div className="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <p className="empty-text">這個頁面需要登入</p>
        <p className="empty-hint">未登入時只能查看今日備貨</p>
        <Link href="/login" className="btn btn-primary">前往登入</Link>
      </div>
    );
  }

  return children;
}
