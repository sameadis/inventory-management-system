"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Package,
  ClipboardCheck,
  ArrowRightLeft,
  Trash2,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Home,
  Settings,
  DoorOpen,
  DollarSign,
  Users,
  Building,
  UserCheck,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  comingSoon?: boolean;
  adminOnly?: boolean;
  external?: boolean; // For cross-app navigation
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, isAssetManager, isSystemAdmin, signOut } = useAuth();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // State for collapsible sections - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Toggle section expansion
  const toggleSection = (title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  // Treat system admin as having all admin permissions
  const isAdmin = isSystemAdmin || isAssetManager;

  // Get user role display name
  const getRoleDisplay = () => {
    if (isSystemAdmin) return "System Admin";
    if (isAssetManager) return "Asset Manager";
    return "Ministry Leader";
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    const email = user?.email || "";
    const name = email.split("@")[0] || "";
    if (!name) return "U";
    return name
      .split(/[._-]/)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Get display name from email
  const getDisplayName = () => {
    const email = user?.email || "";
    const name = email.split("@")[0] || "User";
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Dashboard link (standalone, not in a collapsible group)
  const dashboardItem: NavItem = {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
    description: "Calendar overview",
    external: true,
  };

  // Navigation configuration - Unified across Calendar and Inventory apps
  const navigationSections: NavSection[] = [
    {
      title: "Calendar",
      items: [
        {
          name: "Event Review",
          href: "/event-reviews",
          icon: Settings,
          description: isAdmin ? "Approve events" : "View my requests",
          external: true,
        },
        ...(isAdmin
          ? [
              {
                name: "Rooms",
                href: "/rooms",
                icon: DoorOpen,
                description: "Manage rooms",
                adminOnly: true,
                external: true,
              },
            ]
          : []),
      ],
    },
    {
      title: "Financial",
      items: [
        {
          name: "Budget",
          href: "/budget",
          icon: DollarSign,
          description: isAdmin ? "Financial management" : "My expenses",
          external: true,
        },
      ],
    },
    {
      title: "Inventory",
      items: [
        {
          name: "Asset Overview",
          href: "/inventory",
          icon: LayoutDashboard,
          description: "Inventory dashboard",
        },
        {
          name: "Assets",
          href: "/inventory/assets",
          icon: Package,
          description: "Manage assets",
        },
        {
          name: "Verifications",
          href: "/inventory/verification",
          icon: ClipboardCheck,
          description: "Verify inventory",
        },
        {
          name: "Transfers",
          href: "/inventory/transfers",
          icon: ArrowRightLeft,
          description: "Asset transfers",
        },
        {
          name: "Disposals",
          href: "/inventory/disposals",
          icon: Trash2,
          description: "Disposed assets",
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "Administration",
            items: [
              {
                name: "Users & Roles",
                href: "/admin/users",
                icon: Users,
                description: "Manage users",
                adminOnly: true,
              },
              {
                name: "Branches",
                href: "/admin/branches",
                icon: Building,
                description: "Manage branches",
                adminOnly: true,
              },
              {
                name: "Ministries",
                href: "/admin/ministries",
                icon: UserCheck,
                description: "Manage ministries",
                adminOnly: true,
              },
            ],
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            title: "Coming Soon",
            items: [
              {
                name: "Members",
                href: "/members",
                icon: UserCheck,
                description: "Church membership",
                comingSoon: true,
                adminOnly: true,
                external: true,
              },
            ],
          },
        ]
      : []),
  ];

  // Auto-expand section containing the current route
  useEffect(() => {
    const matchingSection = navigationSections.find((section) =>
      section.items.some((item) => {
        if (item.href === "/inventory") {
          return pathname === item.href;
        }
        return pathname === item.href || pathname?.startsWith(item.href + "/");
      })
    );
    if (matchingSection) {
      setExpandedSections((prev) => {
        if (prev.has(matchingSection.title)) return prev;
        return new Set([...prev, matchingSection.title]);
      });
    }
  }, [pathname, isAdmin]); // Re-run when isAdmin changes (auth loads)

  // Check if a path is active
  const isPathActive = (href: string) => {
    if (href === "/inventory") {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = isPathActive(item.href);

    // Handle external navigation (cross-app)
    if (item.external) {
      return (
        <button
          key={item.name}
          type="button"
          onClick={() => {
            setIsMobileMenuOpen(false);
            window.location.href = item.href;
          }}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
            "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Icon className="h-5 w-5" />
          <div className="flex-1 text-left">
            <div className="font-medium text-sm flex items-center gap-2">
              {item.name}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground">
                {item.description}
              </div>
            )}
          </div>
        </button>
      );
    }

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => setIsMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary",
          item.comingSoon && "opacity-75"
        )}
      >
        <Icon className="h-5 w-5" />
        <div className="flex-1">
          <div className="font-medium text-sm flex items-center gap-2">
            {item.name}
            {item.comingSoon && (
              <span className="text-[10px] px-1 py-0 border rounded">
                Soon
              </span>
            )}
          </div>
          {item.description && (
            <div
              className={cn(
                "text-xs",
                isActive
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              )}
            >
              {item.description}
            </div>
          )}
        </div>
        {isActive && <ChevronRight className="h-4 w-4" />}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 rounded-lg bg-card p-2 shadow-lg lg:hidden border"
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
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-[280px] border-r bg-card transition-transform duration-300 lg:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="border-b p-6 pt-20 lg:pt-6">
            <Link href="/inventory" className="flex items-center gap-3">
              <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border shadow-sm">
                <img
                  src="/alic-logo.png"
                  alt="ALIC"
                  className="h-10 w-10 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg truncate">ALIC</h1>
                <p className="text-xs text-muted-foreground truncate">
                  Management System
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {/* Standalone Dashboard link */}
            <div className="mb-2">
              {renderNavItem(dashboardItem)}
            </div>
            
            {/* Collapsible sections */}
            {navigationSections.map((section) => {
              const isExpanded = expandedSections.has(section.title);
              return (
                <div key={section.title} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    <span>{section.title}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div
                    className={cn(
                      "space-y-1 overflow-hidden transition-all duration-200",
                      isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                    )}
                  >
                    {section.items.map(renderNavItem)}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-3 h-auto"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 text-left flex-1">
                    <div className="text-sm font-medium truncate">
                      {getDisplayName()}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Users className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-h-screen lg:ml-[280px]">
        <div className="container mx-auto p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
