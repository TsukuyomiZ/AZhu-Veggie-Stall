import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { I18nProvider } from "@/lib/i18n";

export const metadata = {
  title: "阿珠菜攤",
  description: "菜攤客戶與訂單管理",
  appleWebApp: {
    capable: true,
    title: "阿珠菜攤",
    statusBarStyle: "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f9e44",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>
        <I18nProvider>
          <main className="page">{children}</main>
          <BottomNav />
        </I18nProvider>
      </body>
    </html>
  );
}
