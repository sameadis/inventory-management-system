"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Package,
  ClipboardCheck,
  ArrowRightLeft,
  Trash2,
  LayoutDashboard,
  LogOut,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAssetManager, isSystemAdmin, signOut } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: "/inventory", label: "Dashboard", icon: LayoutDashboard, roles: ["all"] },
    { href: "/inventory/assets", label: "Assets", icon: Package, roles: ["all"] },
    {
      href: "/inventory/verification",
      label: "Verifications",
      icon: ClipboardCheck,
      roles: ["all"],
    },
    { href: "/inventory/transfers", label: "Transfers", icon: ArrowRightLeft, roles: ["all"] },
    { href: "/inventory/disposals", label: "Disposals", icon: Trash2, roles: ["all"] },
    {
      href: "/admin",
      label: "Admin",
      icon: LayoutDashboard,
      roles: ["system_admin"],
    },
  ];

  // Filter navigation based on user roles
  const filteredNavItems = navItems.filter((item) => {
    if (item.roles.includes("all")) return true;
    if (item.roles.includes("system_admin") && isSystemAdmin) return true;
    if (item.roles.includes("asset_manager") && (isAssetManager || isSystemAdmin)) return true;
    return false;
  });

  // Get user role display name
  const getRoleDisplay = () => {
    if (isSystemAdmin) return "System Admin";
    if (isAssetManager) return "Asset Manager";
    return "Ministry Leader";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="border-b border-slate-200 p-6">
            <h1 className="text-xl font-bold text-slate-900">Inventory System</h1>
            <p className="text-sm text-slate-500 mt-1">ALIC Asset Management</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info & logout */}
          <div className="border-t border-slate-200 p-4">
            <div className="mb-3 rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
              <p className="text-xs text-slate-500 mt-1">{getRoleDisplay()}</p>
            </div>
            <Button onClick={signOut} variant="outline" size="sm" className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}

