"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Check } from "lucide-react";
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
import { getMinistries } from "@/lib/supabase/queries";

type TransferRecord = {
  id: string;
  asset: {
    asset_tag_number: string;
    asset_description: string | null;
  } | null;
  previous_ministry: string | null;
  new_ministry: string | null;
  previous_location: string | null;
  new_location: string | null;
  requested_by: string | null;
  approved_by: string | null;
  requested_by_name: string | null;
  approved_by_name: string | null;
  transfer_date: string | null;
  created_at: string | null;
};

const getTransferStatus = (transfer: TransferRecord) => {
  if (transfer.transfer_date) return "Completed";
  if (transfer.approved_by) return "Approved";
  return "Pending Approval";
};

const statusColors: Record<string, string> = {
  "Pending Approval": "bg-yellow-100 text-yellow-800",
  Approved: "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
};

export default function TransfersPage() {
  const { isAssetManager } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: "",
    previous_ministry: "",
    new_ministry: "",
    previous_location: "",
    new_location: "",
    remarks: "",
  });

  // Fetch ministries
  type Ministry = {
    id: string;
    name: string;
  };

  type AssetForTransfer = {
    id: string;
    asset_tag_number: string;
    asset_description: string | null;
    ministry_assigned: string | null;
    physical_location: string | null;
  };

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await getMinistries();
      if (error) {
        console.error("Error fetching ministries:", error);
        return [];
      }
      return (data ?? []) as Ministry[];
    },
  });

  // Fetch assets
  const { data: assets } = useQuery<AssetForTransfer[]>({
    queryKey: ["assets-for-transfer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("asset")
        .select("id, asset_tag_number, asset_description, ministry_assigned, physical_location")
        .eq("asset_status", "active")
        .order("asset_tag_number");
      
      if (error) {
        console.error("Error fetching assets:", error);
        return [];
      }
      return (data ?? []) as AssetForTransfer[];
    },
  });

  // Extract unique locations from assets for the location dropdown
  const locations = useMemo(() => {
    if (!assets) return [];
    return Array.from(
      new Set(
        assets
          .map((asset) => asset.physical_location)
          .filter((loc): loc is string => Boolean(loc && loc.trim()))
      )
    ).sort();
  }, [assets]);

  const ministryMap = useMemo(() => {
    const map = new Map<string, string>();
    ministries?.forEach((ministry) => {
      if (ministry.id) {
        map.set(ministry.id, ministry.name);
      }
    });
    return map;
  }, [ministries]);

  const { data: transfers, isLoading } = useQuery({
    queryKey: ["transfer-history-full"],
    queryFn: async (): Promise<TransferRecord[]> => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("transfer_history")
        .select(
          `
          *,
          asset:asset_id(
            asset_tag_number,
            asset_description
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transfers:", error);
        return [];
      }

      const userIds = Array.from(
        new Set(
          data
            .flatMap((record) => [record.requested_by, record.approved_by])
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
          console.error("Error fetching user profiles:", profileError);
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
          approved_by_name: record.approved_by
            ? userMap.get(record.approved_by) ?? null
            : null,
        })) ?? []
      );
    },
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      // Validate asset is active before creating transfer
      const { data: asset, error: assetError } = await supabase
        .schema("inventory")
        .from("asset")
        .select("asset_status, asset_tag_number")
        .eq("id", data.asset_id)
        .single();

      if (assetError) throw new Error("Failed to verify asset status");
      
      if (asset.asset_status !== "active") {
        throw new Error(
          `Cannot transfer ${asset.asset_status} asset "${asset.asset_tag_number}". Only active assets can be transferred.`
        );
      }

      const { error } = await supabase.schema("inventory").from("transfer_history").insert({
        asset_id: data.asset_id,
        previous_ministry: data.previous_ministry,
        new_ministry: data.new_ministry,
        previous_location: data.previous_location,
        new_location: data.new_location,
        remarks: data.remarks || null,
        requested_by: session.session.user.id,
      });

      if (error) {
        // Check if it's our custom constraint error
        if (error.message.includes("Cannot create transfer request for non-active asset")) {
          throw new Error("This asset is not active and cannot be transferred");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-history-full"] });
      queryClient.invalidateQueries({ queryKey: ["assets-for-transfer"] });
      // Invalidate dashboard queries (new pending transfer created)
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transfers"] });
      setDialogOpen(false);
      setFormData({
        asset_id: "",
        previous_ministry: "",
        new_ministry: "",
        previous_location: "",
        new_location: "",
        remarks: "",
      });
    },
    onError: (error: Error) => {
      console.error("Transfer creation failed:", error.message);
      // Error will be displayed by the UI
    },
  });

  // Approve transfer mutation
  const approveTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .schema("inventory")
        .from("transfer_history")
        .update({ approved_by: session.session.user.id })
        .eq("id", transferId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-history-full"] });
      // Invalidate dashboard queries (transfer approved, still pending completion)
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transfers"] });
    },
  });

  // Complete transfer mutation (approve + update asset ministry)
  const completeTransferMutation = useMutation({
    mutationFn: async (transfer: TransferRecord) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      // Get the transfer details
      const { data: transferData, error: fetchError } = await supabase
        .schema("inventory")
        .from("transfer_history")
        .select("*")
        .eq("id", transfer.id)
        .single();

      if (fetchError) throw fetchError;

      // Update the asset's ministry
      const { error: assetError } = await supabase
        .schema("inventory")
        .from("asset")
        .update({
          ministry_assigned: transferData.new_ministry,
          physical_location: transferData.new_location,
        })
        .eq("id", transferData.asset_id);

      if (assetError) throw assetError;

      // Mark transfer as completed
      const { error: transferError } = await supabase
        .schema("inventory")
        .from("transfer_history")
        .update({
          transfer_date: new Date().toISOString().split("T")[0],
          approved_by: session.session.user.id,
        })
        .eq("id", transfer.id);

      if (transferError) throw transferError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfer-history-full"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      // Invalidate dashboard queries (transfer completed, no longer pending)
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["recent-transfers"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTransferMutation.mutate(formData);
  };

  const renderStatus = (record: TransferRecord) => {
    const status = getTransferStatus(record);
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
          <h2 className="text-3xl font-bold">Asset Transfers</h2>
          <p className="text-muted-foreground">
            Review transfer requests between ministries
          </p>
        </div>
        {isAssetManager && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Request Asset Transfer</DialogTitle>
                <DialogDescription>
                  Create a request to transfer an asset between ministries.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Asset *</Label>
                  <Select
                    value={formData.asset_id}
                    onValueChange={(value) => {
                      const asset = assets?.find((a) => a.id === value);
                      setFormData({
                        ...formData,
                        asset_id: value,
                        previous_ministry: asset?.ministry_assigned || "",
                        previous_location: asset?.physical_location || "",
                      });
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Ministry</Label>
                    <Input
                      value={
                        formData.previous_ministry
                          ? ministryMap.get(formData.previous_ministry) || "Not assigned"
                          : "Not assigned"
                      }
                      disabled
                      className="bg-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>To Ministry *</Label>
                    <Select
                      value={formData.new_ministry}
                      onValueChange={(value) =>
                        setFormData({ ...formData, new_ministry: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select ministry" />
                      </SelectTrigger>
                      <SelectContent>
                        {ministries
                          ?.filter((m) => m.id !== formData.previous_ministry)
                          .map((ministry) => (
                            <SelectItem key={ministry.id} value={ministry.id}>
                              {ministry.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From Location</Label>
                    <Input
                      value={formData.previous_location || "Not specified"}
                      disabled
                      className="bg-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>To Location *</Label>
                    <Input
                      list="locations-list"
                      placeholder="Select or type location"
                      value={formData.new_location}
                      onChange={(e) =>
                        setFormData({ ...formData, new_location: e.target.value })
                      }
                      required
                    />
                    <datalist id="locations-list">
                      {locations?.map((location) => (
                        <option key={location} value={location} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    rows={3}
                    placeholder="Optional notes about this transfer"
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
                  <Button type="submit" disabled={createTransferMutation.isPending}>
                    {createTransferMutation.isPending ? "Creating..." : "Create Transfer"}
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
              <TableHead>Requested On</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>From Ministry</TableHead>
              <TableHead>To Ministry</TableHead>
              <TableHead>New Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved / Completed By</TableHead>
              {isAssetManager && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, index) => (
                <TableRow key={`transfer-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
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
            ) : transfers && transfers.length > 0 ? (
              transfers.map((transfer) => {
                const status = getTransferStatus(transfer);
                return (
                  <TableRow key={transfer.id}>
                    <TableCell>
                      {transfer.created_at
                        ? new Date(transfer.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">
                        {transfer.asset?.asset_tag_number ?? "Unknown"}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {transfer.asset?.asset_description ?? "No description"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transfer.previous_ministry
                        ? ministryMap.get(transfer.previous_ministry) ?? "—"
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {transfer.new_ministry ? ministryMap.get(transfer.new_ministry) ?? "—" : "—"}
                    </TableCell>
                    <TableCell>{transfer.new_location ?? "—"}</TableCell>
                    <TableCell>{renderStatus(transfer)}</TableCell>
                    <TableCell>
                      {transfer.transfer_date && transfer.approved_by_name
                        ? transfer.approved_by_name
                        : transfer.approved_by_name ??
                          transfer.requested_by_name ??
                          "Awaiting assignment"}
                    </TableCell>
                    {isAssetManager && (
                      <TableCell className="text-right">
                        {status === "Pending Approval" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => approveTransferMutation.mutate(transfer.id)}
                            disabled={approveTransferMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {status === "Approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => completeTransferMutation.mutate(transfer)}
                            disabled={completeTransferMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {status === "Completed" && <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={isAssetManager ? 8 : 7} className="py-10 text-center text-muted-foreground">
                  No transfer history available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

