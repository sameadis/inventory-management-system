"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssets, getVerifications, getPendingTransfers, getPendingDisposals } from "@/lib/supabase/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, CheckCircle, ArrowRightLeft, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
      const { data, error } = await getVerifications(5);
      if (error) console.error("Error fetching verifications:", error);
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
      title: "Pending Transfers",
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
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Overview of your asset inventory</p>
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
          {loadingVerifications ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {verifications?.slice(0, 5).map((verification: any) => (
                <div
                  key={verification.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Verification completed
                      </p>
                      <p className="text-xs text-slate-600">
                        {verification.asset?.asset_tag_number || "Unknown"} - {verification.condition}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(verification.verification_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {(!verifications || verifications.length === 0) && (
                <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

