import RequireAuth from "@/components/RequireAuth";

export default function PricesLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
