"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAssets,
  getVerifications,
  getPendingTransfers,
  getPendingDisposals,
  getRecentTransfers,
  getRecentDisposals,
} from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, ArrowRightLeft, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

export default function DashboardPage() {
  // Fetch summary stats using schema-specific queries
  const { data: assets, isLoading: loadingAssets } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await getAssets();
      if (error) console.error("Error fetching assets:", error);
      return data || [];
    },
  });

  const { data: verifications, isLoading: loadingVerifications } = useQuery({
    queryKey: ["verifications"],
    queryFn: async () => {
      const { data, error } = await getVerifications(10);
      if (error) console.error("Error fetching verifications:", error);
      return data || [];
    },
  });

  const { data: recentTransfers, isLoading: loadingRecentTransfers } = useQuery({
    queryKey: ["recent-transfers"],
    queryFn: async () => {
      const { data, error } = await getRecentTransfers(10);
      if (error) console.error("Error fetching recent transfers:", error);
      return data || [];
    },
  });

  const { data: recentDisposals, isLoading: loadingRecentDisposals } = useQuery({
    queryKey: ["recent-disposals"],
    queryFn: async () => {
      const { data, error } = await getRecentDisposals(10);
      if (error) console.error("Error fetching recent disposals:", error);
      return data || [];
    },
  });

  const { data: transfers, isLoading: loadingTransfers } = useQuery({
    queryKey: ["transfers"],
    queryFn: async () => {
      const { data, error } = await getPendingTransfers();
      if (error) console.error("Error fetching transfers:", error);
      return data || [];
    },
  });

  const { data: disposals, isLoading: loadingDisposals } = useQuery({
    queryKey: ["disposals"],
    queryFn: async () => {
      const { data, error } = await getPendingDisposals();
      if (error) console.error("Error fetching disposals:", error);
      return data || [];
    },
  });

  // Combine all activities and sort by date
  type VerificationRow = {
    id: string;
    verification_date: string | null;
    created_at: string | null;
    condition: string | null;
    asset?: { asset_tag_number?: string | null } | null;
  };

  type TransferRow = {
    id: string;
    created_at: string | null;
    transfer_date: string | null;
    approved_by: string | null;
    asset?: { asset_tag_number?: string | null } | null;
  };

  type DisposalRow = {
    id: string;
    created_at: string | null;
    disposal_date: string | null;
    disposal_method: string | null;
    rejected_by: string | null;
    approved_by: string | null;
    reviewed_by: string | null;
    asset?: { asset_tag_number?: string | null } | null;
  };

  type ActivityType = "verification" | "transfer" | "disposal";

  type Activity = {
    id: string;
    type: ActivityType;
    date: string;
    assetTag: string;
    description: string;
  };

  const recentActivities = useMemo(() => {
    const activities: Activity[] = [];

    // Add verifications
    verifications?.forEach((v: VerificationRow) => {
      activities.push({
        id: v.id,
        type: "verification",
        date: (v.verification_date ?? v.created_at ?? "") as string,
        assetTag: v.asset?.asset_tag_number || "Unknown",
        description: `Condition: ${v.condition}`,
      });
    });

    // Add transfers
    recentTransfers?.forEach((t: TransferRow) => {
      const status = t.transfer_date ? "Completed" : t.approved_by ? "Approved" : "Pending";
      activities.push({
        id: t.id,
        type: "transfer",
        date: (t.transfer_date ?? t.created_at ?? "") as string,
        assetTag: t.asset?.asset_tag_number || "Unknown",
        description: `Transfer ${status}`,
      });
    });

    // Add disposals
    recentDisposals?.forEach((d: DisposalRow) => {
      const status = d.rejected_by
        ? "Rejected"
        : d.approved_by
          ? "Approved"
          : d.reviewed_by
            ? "Under Review"
            : "Pending";
      activities.push({
        id: d.id,
        type: "disposal",
        date: (d.disposal_date ?? d.created_at ?? "") as string,
        assetTag: d.asset?.asset_tag_number || "Unknown",
        description: `${d.disposal_method} - ${status}`,
      });
    });

    // Sort by date (latest first)
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [verifications, recentTransfers, recentDisposals]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case "verification":
        return { Icon: CheckCircle, color: "text-green-600" };
      case "transfer":
        return { Icon: ArrowRightLeft, color: "text-orange-600" };
      case "disposal":
        return { Icon: Trash2, color: "text-red-600" };
    }
  };

  const getActivityLabel = (type: ActivityType) => {
    switch (type) {
      case "verification":
        return "Verification";
      case "transfer":
        return "Transfer";
      case "disposal":
        return "Disposal";
    }
  };

  const stats = [
    {
      title: "Total Assets",
      value: assets?.length || 0,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      loading: loadingAssets,
    },
    {
      title: "Verifications",
      value: verifications?.length || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
      loading: loadingVerifications,
    },
    {
      title: "Active Transfers",
      value: transfers?.length || 0,
      icon: ArrowRightLeft,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      loading: loadingTransfers,
    },
    {
      title: "Pending Disposals",
      value: disposals?.length || 0,
      icon: Trash2,
      color: "text-red-600",
      bgColor: "bg-red-100",
      loading: loadingDisposals,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Asset Overview</h1>
        <p className="text-slate-600 mt-1">Manage and monitor your inventory</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`${stat.bgColor} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {stat.loading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="text-2xl font-bold">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingVerifications || loadingRecentTransfers || loadingRecentDisposals ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const { Icon, color } = getActivityIcon(activity.type);
                const label = getActivityLabel(activity.type);

                return (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${color}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{label}</p>
                        <p className="text-xs text-slate-600">
                          {activity.assetTag} - {activity.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
              {recentActivities.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
