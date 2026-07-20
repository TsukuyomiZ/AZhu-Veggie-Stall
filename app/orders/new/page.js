import OrderForm from "@/components/OrderForm";

export const metadata = {
  title: "新增訂單 — 阿珠菜攤",
};

export default function NewOrderPage() {
  return (
    <>
      <header className="page-header">
        <div>
          <h1 className="page-title">新增訂單</h1>
        </div>
      </header>
      <OrderForm initial={null} />
    </>
  );
}
