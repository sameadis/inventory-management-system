"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type VerificationRecord = {
  id: string;
  asset: {
    asset_tag_number: string;
    asset_description: string | null;
  } | null;
  verification_date: string;
  condition: string;
  physical_location_at_verification: string | null;
  remarks: string | null;
  verified_by: string | null;
  verified_by_name: string | null;
};

const conditionColors: Record<string, string> = {
  New: "bg-blue-100 text-blue-800",
  Good: "bg-green-100 text-green-800",
  Fair: "bg-yellow-100 text-yellow-800",
  Poor: "bg-red-100 text-red-800",
};

export default function VerificationPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: "",
    verification_date: new Date().toISOString().split("T")[0],
    condition: "",
    physical_location_at_verification: "",
    remarks: "",
  });

  // Fetch active assets for verification
  const { data: assets } = useQuery({
    queryKey: ["assets-for-verification"],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("asset")
        .select("id, asset_tag_number, asset_description, physical_location")
        .eq("asset_status", "active")
        .order("asset_tag_number");
      
      if (error) {
        console.error("Error fetching assets:", error);
        return [];
      }
      
      return data;
    },
  });

  // Get unique locations from assets
  const availableLocations = Array.from(
    new Set(assets?.map((a) => a.physical_location).filter(Boolean))
  ).sort();

  // Create verification mutation
  const createVerificationMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");

      const { error } = await supabase.schema("inventory").from("verification_history").insert({
        asset_id: data.asset_id,
        verification_date: data.verification_date,
        condition: data.condition,
        physical_location_at_verification: data.physical_location_at_verification || null,
        remarks: data.remarks || null,
        verified_by: session.session.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["verification-history-full"] });
      queryClient.invalidateQueries({ queryKey: ["verifications"] });
      queryClient.invalidateQueries({ queryKey: ["recent-verifications"] });
      setDialogOpen(false);
      setFormData({
        asset_id: "",
        verification_date: new Date().toISOString().split("T")[0],
        condition: "",
        physical_location_at_verification: "",
        remarks: "",
      });
    },
    onError: (error: Error) => {
      console.error("Verification creation failed:", error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createVerificationMutation.mutate(formData);
  };

  const { data: verifications, isLoading } = useQuery({
    queryKey: ["verification-history-full"],
    queryFn: async (): Promise<VerificationRecord[]> => {
      const { data, error } = await supabase
        .schema("inventory")
        .from("verification_history")
        .select(
          `
          *,
          asset:asset_id(
            asset_tag_number,
            asset_description
          )
        `
        )
        .order("verification_date", { ascending: false });

      if (error) {
        console.error("Error fetching verifications:", error);
        return [];
      }

      const verifierIds = Array.from(
        new Set(data.map((record) => record.verified_by).filter(Boolean))
      ) as string[];

      const verifierMap = new Map<string, string>();
      if (verifierIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("user_profile")
          .select("id, full_name")
          .in("id", verifierIds) as { data: Array<{ id: string; full_name: string }> | null; error: unknown };

        if (profileError) {
          console.error("Error loading verifier names:", profileError);
        } else {
          profiles?.forEach((profile) => {
            if (profile?.id) {
              verifierMap.set(profile.id, profile.full_name ?? "");
            }
          });
        }
      }

      return (
        data?.map((record) => ({
          ...record,
          verified_by_name: record.verified_by
            ? verifierMap.get(record.verified_by) ?? null
            : null,
        })) ?? []
      );
    },
  });

  const getConditionBadge = (condition: string) => {
    const classes = conditionColors[condition] ?? "bg-slate-100 text-slate-800";
    return (
      <Badge variant="outline" className={classes}>
        {condition}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Verification History</h2>
          <p className="text-muted-foreground">
            Track asset verification records and responsible verifiers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Verification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Asset Verification</DialogTitle>
              <DialogDescription>
                Verify the condition and location of an asset.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">Asset *</Label>
                <Select
                  value={formData.asset_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, asset_id: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets?.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_tag_number} - {asset.asset_description || "No description"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification_date">Verification Date *</Label>
                <Input
                  id="verification_date"
                  type="date"
                  value={formData.verification_date}
                  onChange={(e) =>
                    setFormData({ ...formData, verification_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) =>
                    setFormData({ ...formData, condition: value })
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

              <div className="space-y-2">
                <Label htmlFor="physical_location">Physical Location</Label>
                <Input
                  id="physical_location"
                  type="text"
                  placeholder="Select or type location"
                  value={formData.physical_location_at_verification}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      physical_location_at_verification: e.target.value,
                    })
                  }
                  list="location-suggestions"
                />
                <datalist id="location-suggestions">
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
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={createVerificationMutation.isPending}>
                  {createVerificationMutation.isPending ? "Recording..." : "Record Verification"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Verified By</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, index) => (
                <TableRow key={`verification-skeleton-${index}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                </TableRow>
              ))
            ) : verifications && verifications.length > 0 ? (
              verifications.map((verification) => (
                <TableRow key={verification.id}>
                  <TableCell>
                    {verification.verification_date
                      ? new Date(verification.verification_date).toLocaleDateString()
                      : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="font-medium">
                      {verification.asset?.asset_tag_number ?? "Unknown"}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {verification.asset?.asset_description ?? "No description"}
                    </div>
                  </TableCell>
                  <TableCell>{getConditionBadge(verification.condition)}</TableCell>
                  <TableCell>
                    {verification.physical_location_at_verification ?? "—"}
                  </TableCell>
                  <TableCell>{verification.verified_by_name ?? "—"}</TableCell>
                  <TableCell className="max-w-md">
                    {verification.remarks ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No verification records available.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

