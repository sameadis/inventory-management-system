import DashboardLayout from "@/components/layout/DashboardLayout";

export default function InventoryLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

