"use client";

// 語言切換鈕:中文/越南文。放在不用登入也看得到的頁面(今日備貨、登入頁)。
// 選項文字各自用自己的語言顯示(看不懂中文的人才找得到自己的語言),不進字典。
import { useI18n } from "@/lib/i18n";

export default function LangToggle({ compact = false }) {
  const { lang, setLang } = useI18n();
  return (
    <div
      className={`segmented lang-toggle${compact ? " lang-toggle-compact" : ""}`}
      role="group"
      aria-label="Language / 語言"
    >
      <button
        type="button"
        className={`segmented-btn${lang === "zh" ? " active" : ""}`}
        onClick={() => setLang("zh")}
      >
        中文
      </button>
      <button
        type="button"
        className={`segmented-btn${lang === "vi" ? " active" : ""}`}
        onClick={() => setLang("vi")}
      >
        Tiếng Việt
      </button>
    </div>
  );
}
