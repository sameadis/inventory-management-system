"use client";

/**
 * @deprecated This component is deprecated. Use DashboardLayout instead.
 * Admin pages now use the unified DashboardLayout with admin sections built-in.
 * The unified navigation includes all admin routes under the "Administration" section.
 *
 * Migration:
 * - Replace AdminLayout with DashboardLayout
 * - Admin routes are now at /inventory/admin/* paths
 * - The unified sidenav automatically shows admin sections for system admins
 */

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

type AdminSection = "events" | "branches" | "ministries" | "users";

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  activeSection?: AdminSection;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Updated routes to use /inventory/admin/* paths
const sections: { id: AdminSection; label: string; href: string }[] = [
  { id: "events", label: "Event Review", href: "/inventory/admin" },
  { id: "branches", label: "Branches", href: "/inventory/admin/branches" },
  { id: "ministries", label: "Ministries", href: "/inventory/admin/ministries" },
  { id: "users", label: "Users & Roles", href: "/inventory/admin/users" },
];

/**
 * @deprecated Use DashboardLayout instead
 */
export default function AdminLayout({
  title,
  subtitle,
  activeSection = "events",
  actions,
  children,
}: AdminLayoutProps) {
  const { user, isAssetManager, isSystemAdmin, isMinistryLeader, signOut } =
    useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getRoleDisplay = () => {
    if (isSystemAdmin) return "System Admin";
    if (isAssetManager) return "Asset Manager";
    if (isMinistryLeader) return "Ministry Leader";
    return "User";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-white p-2 shadow-lg md:hidden"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="border-b border-slate-200 p-6 pt-20 md:pt-6">
          <h1 className="text-xl font-bold text-slate-900">Admin</h1>
          <p className="mt-1 text-sm text-slate-500">ALIC Administration</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            return (
              <Link
                key={section.id}
                href={section.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <span>{section.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-slate-200 p-4">
          <div className="mb-3 rounded-lg bg-slate-50 p-3">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.email}
            </p>
            <p className="mt-1 text-xs text-slate-500">{getRoleDisplay()}</p>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            size="sm"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex min-h-screen flex-1 flex-col md:ml-64">
        {/* Title bar */}
        <div className="border-b border-slate-200 bg-white px-4 py-4 pt-20 md:px-8 md:pt-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-shrink-0">
              <h2 className="text-2xl font-semibold text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 px-4 py-6 md:px-8">{children}</div>
      </main>
    </div>
  );
}
