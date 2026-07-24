import OrderForm from "@/components/OrderForm";
import NewOrderHeader from "./NewOrderHeader";

// metadata 是 server 端靜態產生,無法跟著瀏覽器語言切換,維持中文
export const metadata = {
  title: "新增訂單 — 阿珠菜攤",
};

export default function NewOrderPage() {
  return (
    <>
      <NewOrderHeader />
      <OrderForm initial={null} />
    </>
  );
}
