"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Check, X, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

type DisposalRecord = {
  id: string;
  asset: {
    asset_tag_number: string;
    asset_description: string | null;
  } | null;
  disposal_method: string;
  disposal_date: string;
  disposal_value: number | null;
  requested_by: string | null;
  reviewed_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  requested_by_name: string | null;
  reviewed_by_name: string | null;
  approved_by_name: string | null;
  rejected_by_name: string | null;
  remarks: string | null;
};

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Reviewed: "bg-blue-100 text-blue-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
};

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

export default function DisposalsPage() {
  const { isAssetManager } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: "",
    disposal_method: "",
    disposal_date: "",
    disposal_value: "",
    remarks: "",
  });

  // Fetch assets
  const { data: assets } = useQuery({
    queryKey: ["assets-for-disposal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("asset")
        .select("id, asset_tag_number, asset_description")
        .eq("asset_status", "active")
        .order("asset_tag_number");
      
      if (error) {
        console.error("Error fetching assets:", error);
        return [];
      }
      return data ?? [];
    },
  });

  const { data: disposals, isLoading } = useQuery({
    queryKey: ["disposal-history-full"],
    queryFn: async (): Promise<DisposalRecord[]> => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("disposal_history")
        .select(
          `
          *,
          asset:asset_id(
            asset_tag_number,
            asset_description
          )
        `
        )
        .order("disposal_date", { ascending: false });

      if (error) {
        console.error("Error fetching disposals:", error);
        return [];
      }

      const userIds = Array.from(
        new Set(
          data
            .flatMap((record) => [
              record.requested_by,
              record.reviewed_by,
              record.approved_by,
              record.rejected_by,
            ])
            .filter(Boolean)
        )
      ) as string[];

      const userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("user_profile")
          .select("id, full_name")
          .in("id", userIds) as { data: Array<{ id: string; full_name: string }> | null; error: unknown };

        if (profileError) {
          console.error("Error fetching user names:", profileError);
        } else {
          profiles?.forEach((profile) => {
            if (profile?.id) {
              userMap.set(profile.id, profile.full_name ?? "");
            }
          });
        }
      }

      return (
        data?.map((record) => ({
          ...record,
          requested_by_name: record.requested_by
            ? userMap.get(record.requested_by) ?? null
            : null,
          reviewed_by_name: record.reviewed_by
            ? userMap.get(record.reviewed_by) ?? null
            : null,
          approved_by_name: record.approved_by
            ? userMap.get(record.approved_by) ?? null
            : null,
          rejected_by_name: record.rejected_by
            ? userMap.get(record.rejected_by) ?? null
            : null,
        })) ?? []
      );
    },
  });

  // Create disposal mutation
  const createDisposalMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      // Validate asset is active before creating disposal
      const { data: asset, error: assetError } = await supabase
        .schema("inventory")
        .from("asset")
        .select("asset_status, asset_tag_number")
        .eq("id", data.asset_id)
        .single();

      if (assetError) throw new Error("Failed to verify asset status");
      
      if (asset.asset_status !== "active") {
        throw new Error(
          `Cannot dispose ${asset.asset_status} asset "${asset.asset_tag_number}". Only active assets can be disposed.`
        );
      }

      const { error } = await supabase.schema("inventory").from("disposal_history").insert({
        asset_id: data.asset_id,
        disposal_method: data.disposal_method,
        disposal_date: data.disposal_date,
        disposal_value: Number(data.disposal_value) || 0,
        remarks: data.remarks || null,
        requested_by: session.session.user.id,
      });

      if (error) {
        // Check if it's our custom constraint error
        if (error.message.includes("Cannot create disposal request for non-active asset")) {
          throw new Error("This asset is not active and cannot be disposed");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposal-history-full"] });
      queryClient.invalidateQueries({ queryKey: ["assets-for-disposal"] });
      // Invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: ["disposals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-disposals"] });
      setDialogOpen(false);
      setFormData({
        asset_id: "",
        disposal_method: "",
        disposal_date: "",
        disposal_value: "",
        remarks: "",
      });
    },
    onError: (error: Error) => {
      console.error("Disposal creation failed:", error.message);
      // Error will be displayed by the UI
    },
  });

  // Review disposal mutation
  const reviewDisposalMutation = useMutation({
    mutationFn: async (disposalId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .schema("inventory")
        .from("disposal_history")
        .update({
          reviewed_by: session.session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", disposalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposal-history-full"] });
      // Invalidate dashboard queries (status changed)
      queryClient.invalidateQueries({ queryKey: ["disposals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-disposals"] });
    },
  });

  // Approve disposal mutation
  const approveDisposalMutation = useMutation({
    mutationFn: async (disposal: DisposalRecord) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      // First, get the disposal record to get the asset_id
      const { data: disposalData, error: fetchError } = await supabase
        .schema("inventory")
        .from("disposal_history")
        .select("asset_id")
        .eq("id", disposal.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the asset status to 'disposed' and clear ministry assignment
      const { error: assetError } = await supabase
        .schema("inventory")
        .from("asset")
        .update({
          asset_status: "disposed",
          ministry_assigned: null, // Clear ministry assignment when disposed
          responsible_ministry_leader: null, // Clear responsible person
        })
        .eq("id", disposalData.asset_id);

      if (assetError) throw assetError;

      // Then update the disposal record as approved
      const { error } = await supabase
        .schema("inventory")
        .from("disposal_history")
        .update({
          approved_by: session.session.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", disposal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposal-history-full"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["assets-for-disposal"] });
      queryClient.invalidateQueries({ queryKey: ["assets-for-transfer"] });
      // Invalidate dashboard queries (disposal approved, asset disposed)
      queryClient.invalidateQueries({ queryKey: ["disposals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-disposals"] });
    },
  });

  // Reject disposal mutation
  const rejectDisposalMutation = useMutation({
    mutationFn: async (disposalId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .schema("inventory")
        .from("disposal_history")
        .update({
          rejected_by: session.session.user.id,
          rejected_at: new Date().toISOString(),
        })
        .eq("id", disposalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disposal-history-full"] });
      // Invalidate dashboard queries (disposal rejected, no longer pending)
      queryClient.invalidateQueries({ queryKey: ["disposals"] });
      queryClient.invalidateQueries({ queryKey: ["recent-disposals"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDisposalMutation.mutate(formData);
  };

  const getDisposalStatus = (record: DisposalRecord): string => {
    if (record.rejected_by) return "Rejected";
    if (record.approved_by) return "Approved";
    if (record.reviewed_by) return "Reviewed";
    return "Pending";
  };

  const renderStatus = (record: DisposalRecord) => {
    const status = getDisposalStatus(record);
    return (
      <Badge variant="outline" className={statusColors[status] ?? "bg-slate-100 text-slate-800"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Asset Disposals</h2>
          <p className="text-muted-foreground">
            Review disposal requests and approval trail
          </p>
        </div>
        {isAssetManager && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Disposal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Asset Disposal</DialogTitle>
                <DialogDescription>
                  Create a request to dispose of an asset.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset *</Label>
                  <Select
                    value={formData.asset_id}
                    onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset to dispose" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets?.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.asset_tag_number} - {asset.asset_description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Disposal Method *</Label>
                  <Select
                    value={formData.disposal_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, disposal_method: value })
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sold">Sold</SelectItem>
                      <SelectItem value="Donated">Donated</SelectItem>
                      <SelectItem value="WrittenOff">Written Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Disposal Date *</Label>
                  <Input
                    type="date"
                    value={formData.disposal_date}
                    onChange={(e) =>
                      setFormData({ ...formData, disposal_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.disposal_value}
                    onChange={(e) =>
                      setFormData({ ...formData, disposal_value: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                    placeholder="Optional notes about this disposal"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDisposalMutation.isPending}>
                    {createDisposalMutation.isPending ? "Creating..." : "Request Disposal"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Estimated Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Last Action By</TableHead>
              {isAssetManager && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, index) => (
                <TableRow key={`disposal-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  {isAssetManager && (
                    <TableCell>
                      <Skeleton className="h-8 w-24 ml-auto" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : disposals && disposals.length > 0 ? (
              disposals.map((disposal) => {
                const status = getDisposalStatus(disposal);
                const lastActionBy =
                  disposal.rejected_by_name ||
                  disposal.approved_by_name ||
                  disposal.reviewed_by_name ||
                  "Awaiting review";

                return (
                  <TableRow key={disposal.id}>
                    <TableCell>
                      {disposal.disposal_date
                        ? new Date(disposal.disposal_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">
                        {disposal.asset?.asset_tag_number ?? "Unknown"}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {disposal.asset?.asset_description ?? "No description"}
                      </div>
                    </TableCell>
                    <TableCell>{disposal.disposal_method}</TableCell>
                    <TableCell>{formatCurrency(disposal.disposal_value)}</TableCell>
                    <TableCell>{renderStatus(disposal)}</TableCell>
                    <TableCell>{disposal.requested_by_name ?? "—"}</TableCell>
                    <TableCell>{lastActionBy}</TableCell>
                    {isAssetManager && (
                      <TableCell className="text-right">
                        {status === "Pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reviewDisposalMutation.mutate(disposal.id)}
                            disabled={reviewDisposalMutation.isPending}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                        )}
                        {status === "Reviewed" && (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => approveDisposalMutation.mutate(disposal)}
                              disabled={approveDisposalMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectDisposalMutation.mutate(disposal.id)}
                              disabled={rejectDisposalMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {(status === "Approved" || status === "Rejected") && (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={isAssetManager ? 8 : 7} className="py-10 text-center text-muted-foreground">
                  No disposal history available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

