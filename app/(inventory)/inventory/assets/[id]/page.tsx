"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";

export default function AssetDetailPage() {
  const { isAssetManager } = useAuth();
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const assetId = Array.isArray(params?.id) ? params?.id[0] : params?.id;

  const { data: asset, isLoading } = useQuery({
    queryKey: ["asset", assetId],
    enabled: Boolean(assetId),
    queryFn: async () => {
      if (!assetId) return null;

      const { data, error } = await supabase
        .schema("inventory")
        .from("asset")
        .select("*")
        .eq("id", assetId)
        .single();

      if (error) {
        console.error("Error fetching asset:", error);
        return null;
      }

      let ministryName: string | null = null;
      let churchBranchName: string | null = null;
      let preparedByName: string | null = null;

      const [ministryResult, branchResult, preparedByResult] = await Promise.all([
        data?.ministry_assigned
          ? supabase
              .from("ministry")
              .select("name")
              .eq("id", data.ministry_assigned)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        data?.church_branch_id
          ? supabase
              .from("church_branch")
              .select("name")
              .eq("id", data.church_branch_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        data?.prepared_by
          ? supabase
              .from("user_profile")
              .select("full_name")
              .eq("id", data.prepared_by)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      ministryName = ministryResult?.data?.name ?? null;
      churchBranchName = branchResult?.data?.name ?? null;
      preparedByName = preparedByResult?.data?.full_name ?? null;

      return {
        ...data,
        ministry_name: ministryName,
        church_branch_name: churchBranchName,
        prepared_by_name: preparedByName,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Asset not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/inventory/assets">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{asset.asset_tag_number}</h1>
            <p className="text-slate-600 mt-1">{asset.asset_description || "No description"}</p>
          </div>
        </div>
        {isAssetManager && (
          <Button disabled>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600">Asset Tag</p>
            <p className="font-medium">{asset.asset_tag_number}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Category</p>
            <p className="font-medium">{asset.category}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Status</p>
            <Badge
              variant="outline"
              className={
                asset.asset_status === "active"
                  ? "bg-green-100 text-green-800"
                  : asset.asset_status === "disposed"
                  ? "bg-gray-100 text-gray-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {asset.asset_status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-slate-600">Quantity</p>
            <p className="font-medium">
              {asset.quantity} {asset.unit_of_measure}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Model/Serial</p>
            <p className="font-medium">{asset.model_or_serial_number || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Condition</p>
            <Badge
              variant="outline"
              className={
                asset.current_condition === "New"
                  ? "bg-blue-100 text-blue-800"
                  : asset.current_condition === "Good"
                  ? "bg-green-100 text-green-800"
                  : asset.current_condition === "Fair"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }
            >
              {asset.current_condition}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Organization */}
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600">Church Branch</p>
            <p className="font-medium">{asset.church_branch_name || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Ministry</p>
            <p className="font-medium">{asset.ministry_name || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Physical Location</p>
            <p className="font-medium">{asset.physical_location || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Responsible Person</p>
            <p className="font-medium">{asset.responsible_ministry_leader || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Info */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600">Acquisition Date</p>
            <p className="font-medium">
              {asset.acquisition_date
                ? new Date(asset.acquisition_date).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Acquisition Cost</p>
            <p className="font-medium">
              {asset.acquisition_cost ? `$${asset.acquisition_cost.toLocaleString()}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Useful Life</p>
            <p className="font-medium">
              {asset.estimated_useful_life_years
                ? `${asset.estimated_useful_life_years} years`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Depreciation Method</p>
            <p className="font-medium">{asset.depreciation_method || "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Verification Info */}
      {asset.last_verified_date && (
        <Card>
          <CardHeader>
            <CardTitle>Last Verification</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600">Date</p>
              <p className="font-medium">
                {new Date(asset.last_verified_date).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Info */}
      {asset.date_of_entry && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600">Date of Entry</p>
              <p className="font-medium">
                {new Date(asset.date_of_entry).toLocaleDateString()}
              </p>
            </div>
            {(asset.prepared_by_name || asset.prepared_by) && (
              <div>
                <p className="text-sm text-slate-600">Prepared By</p>
                <p className="font-medium">
                  {asset.prepared_by_name || asset.prepared_by || "—"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {asset.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700">{asset.remarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>Record Information</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-slate-600">Created</p>
            <p className="font-medium">
              {new Date(asset.created_at).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Last Updated</p>
            <p className="font-medium">
              {new Date(asset.updated_at).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

