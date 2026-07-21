import RequireAuth from "@/components/RequireAuth";

export default function OrdersLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
