import RequireAuth from "@/components/RequireAuth";

export default function StatsLayout({ children }) {
  return <RequireAuth>{children}</RequireAuth>;
}
