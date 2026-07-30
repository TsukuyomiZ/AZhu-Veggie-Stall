"use client";

// 手寫 i18n(零依賴):React context + localStorage 記住語言。
// 語言:zh(繁體中文,預設)/ vi(越南文)。
// 不用登入也能切換 —— 語言只存在瀏覽器 localStorage,跟登入狀態無關。
//
// 用法:
//   const { t, lang, setLang } = useI18n();
//   t("orders.title")                    → 對照字典
//   t("orders.itemCount", { n: 3 })      → 「{n} 項」的 {n} 會代入 3
// 字典按領域拆檔(common/orders/customers/stats/prices),避免多人同時改同一檔。

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import dictCommon from "./dict-common";
import dictOrders from "./dict-orders";
import dictCustomers from "./dict-customers";
import dictStats from "./dict-stats";
import dictPrices from "./dict-prices";

const STORAGE_KEY = "azhu_lang";
const LANGS = ["zh", "vi"];

function mergeDicts(lang) {
  return {
    ...dictCommon[lang],
    ...dictOrders[lang],
    ...dictCustomers[lang],
    ...dictStats[lang],
    ...dictPrices[lang],
  };
}

const DICTS = {
  zh: mergeDicts("zh"),
  vi: mergeDicts("vi"),
};

const I18nContext = createContext({
  lang: "zh",
  setLang: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }) {
  // SSR 與首次 render 一律 zh,掛載後才讀 localStorage 切換,避免 hydration 不一致
  const [lang, setLangState] = useState("zh");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (LANGS.includes(saved) && saved !== "zh") setLangState(saved);
    } catch {
      // localStorage 不可用(隱私模式等)就維持預設中文
    }
  }, []);

  const value = useMemo(() => {
    const dict = DICTS[lang] || DICTS.zh;
    function t(key, vars) {
      // 找不到翻譯就退回中文,再不行直接顯示 key(開發時一眼看出漏翻)
      let s = dict[key] ?? DICTS.zh[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.split(`{${k}}`).join(String(v));
        }
      }
      return s;
    }
    function setLang(next) {
      if (!LANGS.includes(next)) return;
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 存不進去就只影響下次開啟,本次切換仍生效
      }
    }
    return { lang, setLang, t };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
