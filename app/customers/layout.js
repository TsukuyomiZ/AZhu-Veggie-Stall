import RequireAuth from "@/components/RequireAuth";

export default function CustomersLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
