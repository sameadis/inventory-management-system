"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function AssetDetailPage() {
  const { isAssetManager } = useAuth();
  const supabase = createClient();
  const params = useParams<{ id: string }>();
  const assetId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const queryClient = useQueryClient();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [assetTagError, setAssetTagError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    asset_tag_number: "",
    asset_description: "",
    category: "",
    model_or_serial_number: "",
    quantity: "1",
    unit_of_measure: "ea",
    acquisition_date: "",
    acquisition_cost: "",
    estimated_useful_life_years: "",
    depreciation_method: "",
    physical_location: "",
    current_condition: "",
    remarks: "",
  });

  // Fetch all assets to get categories and locations
  const { data: allAssets } = useQuery({
    queryKey: ["all-assets-for-edit"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("asset")
        .select("category, physical_location");
      
      if (error) {
        console.error("Error fetching assets:", error);
        return [];
      }
      return data || [];
    },
  });

  const availableCategories = Array.from(
    new Set(allAssets?.map((a) => a.category).filter(Boolean))
  ).sort();

  const availableLocations = Array.from(
    new Set(allAssets?.map((a) => a.physical_location).filter(Boolean))
  ).sort();

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
      let updatedByName: string | null = null;

      // Fetch related data
      if (data?.ministry_assigned) {
        const { data: ministry } = await supabase
          .from("ministry")
          .select("name")
          .eq("id", data.ministry_assigned)
          .maybeSingle() as { data: { name: string } | null };
        ministryName = ministry?.name ?? null;
      }

      if (data?.church_branch_id) {
        const { data: branch } = await supabase
          .from("church_branch")
          .select("name")
          .eq("id", data.church_branch_id)
          .maybeSingle() as { data: { name: string } | null };
        churchBranchName = branch?.name ?? null;
      }

      if (data?.prepared_by) {
        const { data: preparedBy } = await supabase
          .from("user_profile")
          .select("full_name")
          .eq("id", data.prepared_by)
          .maybeSingle() as { data: { full_name: string } | null };
        preparedByName = preparedBy?.full_name ?? null;
      }

      if (data?.updated_by) {
        const { data: updatedBy } = await supabase
          .from("user_profile")
          .select("full_name")
          .eq("id", data.updated_by)
          .maybeSingle() as { data: { full_name: string } | null };
        updatedByName = updatedBy?.full_name ?? null;
      }

      return {
        ...data,
        ministry_name: ministryName,
        church_branch_name: churchBranchName,
        prepared_by_name: preparedByName,
        updated_by_name: updatedByName,
      };
    },
  });

  // Populate form when asset loads
  useEffect(() => {
    if (asset && editDialogOpen) {
      setFormData({
        asset_tag_number: asset.asset_tag_number || "",
        asset_description: asset.asset_description || "",
        category: asset.category || "",
        model_or_serial_number: asset.model_or_serial_number || "",
        quantity: String(asset.quantity || 1),
        unit_of_measure: asset.unit_of_measure || "ea",
        acquisition_date: asset.acquisition_date || "",
        acquisition_cost: String(asset.acquisition_cost || ""),
        estimated_useful_life_years: asset.estimated_useful_life_years ? String(asset.estimated_useful_life_years) : "",
        depreciation_method: asset.depreciation_method || "",
        physical_location: asset.physical_location || "",
        current_condition: asset.current_condition || "",
        remarks: asset.remarks || "",
      });
      setAssetTagError(null);
    }
  }, [asset, editDialogOpen]);

  // Validate asset tag on blur (excluding current asset)
  const validateAssetTag = async (tagNumber: string) => {
    if (!tagNumber) {
      setAssetTagError("Asset tag is required");
      return false;
    }

    // Skip validation if tag hasn't changed
    if (tagNumber === asset?.asset_tag_number) {
      setAssetTagError(null);
      return true;
    }

    // Check if tag already exists (excluding current asset)
    const { data, error } = await supabase
      .schema("inventory")
      .from("asset")
      .select("id")
      .eq("asset_tag_number", tagNumber)
      .neq("id", assetId)
      .single();

    if (error) {
      console.error("Error validating asset tag:", error);
    }

    if (data) {
      setAssetTagError(`Asset tag "${tagNumber}" already exists`);
      return false;
    }

    setAssetTagError(null);
    return true;
  };

  const handleAssetTagBlur = () => {
    if (formData.asset_tag_number) {
      validateAssetTag(formData.asset_tag_number);
    }
  };

  // Update asset mutation
  const updateAssetMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!assetId) throw new Error("Asset ID is required");

      // Check if asset is disposed
      if (asset?.asset_status === "disposed") {
        throw new Error("Cannot edit disposed asset. Disposed assets are read-only.");
      }

      const { error } = await supabase
        .schema("inventory")
        .from("asset")
        .update({
          asset_tag_number: data.asset_tag_number,
          asset_description: data.asset_description,
          category: data.category,
          model_or_serial_number: data.model_or_serial_number || null,
          quantity: parseInt(data.quantity),
          unit_of_measure: data.unit_of_measure,
          acquisition_date: data.acquisition_date,
          acquisition_cost: parseFloat(data.acquisition_cost),
          estimated_useful_life_years: data.estimated_useful_life_years
            ? parseInt(data.estimated_useful_life_years)
            : null,
          depreciation_method: data.depreciation_method || null,
          physical_location: data.physical_location,
          current_condition: data.current_condition,
          remarks: data.remarks || null,
        })
        .eq("id", assetId);

      if (error) {
        const errorMessage = error.message ?? "";
        // Some errors (like PostgrestError) include a code field
        const errorCode = (error as { code?: string }).code ?? "";
        
        if (errorCode === "23505" || errorMessage.includes("duplicate key") || errorMessage.includes("asset_tag_number")) {
          throw new Error(`Asset tag "${data.asset_tag_number}" already exists. Please use a different tag number.`);
        }
        
        // Check for disposed asset constraint
        if (errorMessage.includes("Cannot update disposed asset")) {
          throw new Error("Cannot edit disposed asset. Disposed assets are read-only.");
        }
        
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", assetId] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setEditDialogOpen(false);
      setAssetTagError(null);
    },
    onError: (error: Error) => {
      console.error("Asset update failed:", error.message);
      if (error.message.includes("already exists")) {
        setAssetTagError(error.message);
      } else {
        alert(error.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (assetTagError) {
      return; // Don't submit if there's a validation error
    }
    updateAssetMutation.mutate(formData);
  };

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
        {isAssetManager && asset.asset_status !== "disposed" && (
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Asset</DialogTitle>
                <DialogDescription>
                  Update the asset information below.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      placeholder="Select or type category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      list="category-suggestions-edit"
                      required
                    />
                    <datalist id="category-suggestions-edit">
                      {availableCategories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset_tag_number">Asset Tag Number *</Label>
                    <Input
                      id="asset_tag_number"
                      placeholder="Asset tag"
                      value={formData.asset_tag_number}
                      onChange={(e) => {
                        setFormData({ ...formData, asset_tag_number: e.target.value });
                        setAssetTagError(null);
                      }}
                      onBlur={handleAssetTagBlur}
                      className={assetTagError ? "border-red-500" : ""}
                      required
                    />
                    {assetTagError && (
                      <p className="text-xs text-red-600">{assetTagError}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asset_description">Description *</Label>
                  <Textarea
                    id="asset_description"
                    placeholder="Describe the asset..."
                    value={formData.asset_description}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_description: e.target.value })
                    }
                    required
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="model_or_serial_number">Model/Serial Number</Label>
                    <Input
                      id="model_or_serial_number"
                      placeholder="Optional"
                      value={formData.model_or_serial_number}
                      onChange={(e) =>
                        setFormData({ ...formData, model_or_serial_number: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_condition">Condition *</Label>
                    <Select
                      value={formData.current_condition}
                      onValueChange={(value) =>
                        setFormData({ ...formData, current_condition: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_of_measure">Unit *</Label>
                    <Input
                      id="unit_of_measure"
                      placeholder="e.g., ea, pcs"
                      value={formData.unit_of_measure}
                      onChange={(e) =>
                        setFormData({ ...formData, unit_of_measure: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acquisition_date">Acquisition Date *</Label>
                    <Input
                      id="acquisition_date"
                      type="date"
                      value={formData.acquisition_date}
                      onChange={(e) =>
                        setFormData({ ...formData, acquisition_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="acquisition_cost">Acquisition Cost *</Label>
                    <Input
                      id="acquisition_cost"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.acquisition_cost}
                      onChange={(e) =>
                        setFormData({ ...formData, acquisition_cost: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="physical_location">Physical Location *</Label>
                  <Input
                    id="physical_location"
                    placeholder="Select or type location"
                    value={formData.physical_location}
                    onChange={(e) =>
                      setFormData({ ...formData, physical_location: e.target.value })
                    }
                    list="location-suggestions-edit"
                    required
                  />
                  <datalist id="location-suggestions-edit">
                    {availableLocations.map((location) => (
                      <option key={location} value={location} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    placeholder="Additional notes..."
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={updateAssetMutation.isPending || !!assetTagError}>
                    {updateAssetMutation.isPending ? "Updating..." : "Update Asset"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
        {isAssetManager && asset.asset_status === "disposed" && (
          <Button disabled title="Disposed assets cannot be edited">
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

      {/* Audit Trail - Merged Workflow and Record Information */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Created Info */}
          <div className="grid md:grid-cols-2 gap-6 pb-4 border-b border-slate-200">
            <div>
              <p className="text-sm text-slate-600">Created On</p>
              <p className="font-medium">
                {new Date(asset.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Prepared By</p>
              <p className="font-medium">
                {asset.prepared_by_name || "—"}
              </p>
            </div>
          </div>

          {/* Updated Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-slate-600">Last Updated</p>
              <p className="font-medium">
                {new Date(asset.updated_at).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Updated By</p>
              <p className="font-medium">
                {asset.updated_by_name || "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

