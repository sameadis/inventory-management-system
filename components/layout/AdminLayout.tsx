"use client";

import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

type AdminSection = "events" | "branches" | "ministries" | "users";

interface AdminLayoutProps {
  title: string;
  subtitle?: string;
  activeSection?: AdminSection;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const sections: { id: AdminSection; label: string; comingSoon?: boolean }[] = [
  { id: "events", label: "Event Review" },
  { id: "branches", label: "Branches", comingSoon: true },
  { id: "ministries", label: "Ministries", comingSoon: true },
  { id: "users", label: "Users & Roles", comingSoon: true },
];

export default function AdminLayout({
  title,
  subtitle,
  activeSection = "events",
  actions,
  children,
}: AdminLayoutProps) {
  const { user, isAssetManager, isSystemAdmin, isMinistryLeader, signOut } =
    useAuth();

  const getRoleDisplay = () => {
    if (isSystemAdmin) return "System Admin";
    if (isAssetManager) return "Asset Manager";
    if (isMinistryLeader) return "Ministry Leader";
    return "User";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-6">
          <h1 className="text-xl font-bold text-slate-900">Admin</h1>
          <p className="mt-1 text-sm text-slate-500">ALIC Administration</p>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {sections.map((section) => {
            const isActive = section.id === activeSection;
            const disabled = section.comingSoon && !isActive;
            return (
              <button
                key={section.id}
                type="button"
                disabled={disabled}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                )}
              >
                <span>{section.label}</span>
                {section.comingSoon && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
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
      <main className="flex min-h-screen flex-1 flex-col">
        {/* Title bar */}
        <div className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                {title}
              </h2>
              {subtitle && (
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              )}
            </div>
            {actions && <div className="w-full max-w-md">{actions}</div>}
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 px-8 py-6">{children}</div>
      </main>
    </div>
  );
}


