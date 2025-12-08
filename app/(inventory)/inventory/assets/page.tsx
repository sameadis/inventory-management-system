"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { getMinistries } from "@/lib/supabase/queries";
import { useRouter } from "next/navigation";

export default function AssetsPage() {
  const { isAssetManager } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assetTagError, setAssetTagError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    asset_tag_number: "",
    asset_description: "",
    category: "",
    model_or_serial_number: "",
    quantity: "1",
    unit_of_measure: "ea",
    acquisition_date: new Date().toISOString().split("T")[0],
    acquisition_cost: "",
    estimated_useful_life_years: "",
    depreciation_method: "",
    ministry_assigned: "",
    physical_location: "",
    current_condition: "",
    remarks: "",
  });

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets", searchTerm],
    queryFn: async () => {
      let query = supabase
        .schema("inventory")
        .from("asset")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(
          `asset_tag_number.ilike.%${searchTerm}%,asset_description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching assets:", error);
        return [];
      }
      return data || [];
    },
  });

  // Get unique categories and locations from existing assets
  const availableCategories = useMemo(() => {
    return Array.from(new Set(assets?.map((a) => a.category).filter(Boolean))).sort();
  }, [assets]);

  const availableLocations = useMemo(() => {
    return Array.from(new Set(assets?.map((a) => a.physical_location).filter(Boolean))).sort();
  }, [assets]);

  // Get current user's full name
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return null;
      
      const { data, error } = await supabase
        .from("user_profile")
        .select("full_name")
        .eq("id", session.session.user.id)
        .single() as { data: { full_name: string } | null; error: unknown };
      
      if (error) console.error("Error fetching current user profile:", error);
      return data;
    },
  });

  type Ministry = {
    id: string;
    name: string;
  };

  const { data: ministries } = useQuery<Ministry[]>({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await getMinistries();
      if (error) {
        console.error("Error fetching ministries:", error);
        return [];
      }
      return (data || []) as Ministry[];
    },
  });

  const ministryMap = useMemo(() => {
    const map = new Map<string, string>();
    ministries?.forEach((ministry) => {
      if (ministry.id) {
        map.set(ministry.id, ministry.name);
      }
    });
    return map;
  }, [ministries]);

  // Get Finance Ministry ID (must be after ministries query)
  const financeMinistry = useMemo(() => {
    return ministries?.find((m) => m.name === "Finance Ministry");
  }, [ministries]);

  // Category abbreviation mapping
  const getCategoryAbbreviation = (category: string): string => {
    const abbreviations: Record<string, string> = {
      "Computer Equipment": "COMP",
      "Furniture": "FURN",
      "Sound Equipment": "SOUND",
      "Musical Instruments": "MUS",
      "Projector Equipment": "PROJ",
      "Kitchen Equipment": "KITCH",
      "Office Equipment": "OFF",
      "Audio Visual": "AV",
      "Vehicle": "VEH",
    };

    // Return existing abbreviation or generate one
    if (abbreviations[category]) {
      return abbreviations[category];
    }

    // Generate abbreviation from category name (first 4-5 letters, uppercase)
    return category
      .replace(/[^a-zA-Z\s]/g, "")
      .split(" ")
      .map((word) => word.substring(0, 2))
      .join("")
      .substring(0, 5)
      .toUpperCase();
  };

  // Generate next asset tag number for a category
  const generateAssetTag = (category: string): string => {
    if (!category) return "";

    const abbreviation = getCategoryAbbreviation(category);
    
    // Find all assets in this category
    const categoryAssets = assets?.filter((a) => a.category === category) || [];
    
    // Extract numbers from existing tags
    const numbers = categoryAssets
      .map((a) => {
        const match = a.asset_tag_number?.match(new RegExp(`^${abbreviation}-(\\d+)$`));
        return match ? parseInt(match[1]) : 0;
      })
      .filter((n) => n > 0);

    // Get the next number
    const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

    // Format as TAG-001
    return `${abbreviation}-${String(nextNumber).padStart(3, "0")}`;
  };

  // Auto-generate tag when category changes
  const handleCategoryChange = (category: string) => {
    const newTag = generateAssetTag(category);
    setFormData({
      ...formData,
      category,
      asset_tag_number: newTag,
    });
    setAssetTagError(null); // Clear error when generating new tag
  };

  // Validate asset tag on blur
  const validateAssetTag = async (tagNumber: string) => {
    if (!tagNumber) {
      setAssetTagError("Asset tag is required");
      return false;
    }

    // Check if tag already exists
    const { data, error } = await supabase
      .schema("inventory")
      .from("asset")
      .select("id")
      .eq("asset_tag_number", tagNumber)
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

  // Get unique church branches (for now, we'll use the user's branch)
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) return null;
      
      const { data, error } = await supabase
        .from("user_profile")
        .select("church_branch_id")
        .eq("id", session.session.user.id)
        .single() as { data: { church_branch_id: string } | null; error: unknown };
      
      if (error) console.error("Error fetching user profile:", error);
      return data;
    },
  });

  // Create asset mutation
  const createAssetMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user.id) throw new Error("Not authenticated");
      if (!userProfile?.church_branch_id) throw new Error("User profile not found");
      if (!financeMinistry?.id) throw new Error("Finance Ministry not found");

      const { error } = await supabase.schema("inventory").from("asset").insert({
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
        ministry_assigned: financeMinistry.id, // Always Finance Ministry
        physical_location: data.physical_location,
        responsible_ministry_leader: currentUserProfile?.full_name || null, // Auto-set from current user
        current_condition: data.current_condition,
        asset_status: "active",
        remarks: data.remarks || null,
        church_branch_id: userProfile.church_branch_id,
        prepared_by: session.session.user.id,
      });

      if (error) {
        // Check for duplicate asset tag number error (PostgreSQL unique constraint violation)
        const errorMessage = error.message ?? "";
        const errorCode = (error as { code?: string }).code ?? "";
        
        if (errorCode === "23505" || errorMessage.includes("duplicate key") || errorMessage.includes("asset_tag_number")) {
          throw new Error(`Asset tag "${data.asset_tag_number}" already exists. Please use a different tag number.`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      setDialogOpen(false);
      setAssetTagError(null);
      setFormData({
        asset_tag_number: "",
        asset_description: "",
        category: "",
        model_or_serial_number: "",
        quantity: "1",
        unit_of_measure: "ea",
        acquisition_date: new Date().toISOString().split("T")[0],
        acquisition_cost: "",
        estimated_useful_life_years: "",
        depreciation_method: "",
        ministry_assigned: "",
        physical_location: "",
        current_condition: "",
        remarks: "",
      });
    },
    onError: (error: Error) => {
      console.error("Asset creation failed:", error.message);
      // Show error inline for duplicate tag
      if (error.message.includes("already exists")) {
        setAssetTagError(error.message);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAssetMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-800",
      disposed: "bg-gray-100 text-gray-800",
      missing: "bg-red-100 text-red-800",
    };
    return (
      <Badge variant="outline" className={colors[status] || "bg-slate-100 text-slate-800"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assets</h1>
          <p className="text-slate-600 mt-1">Manage your fixed asset inventory</p>
        </div>
        {isAssetManager && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
                <DialogDescription>
                  Fill in the details below to add a new asset to the inventory.
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
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      list="category-suggestions"
                      required
                    />
                    <datalist id="category-suggestions">
                      {availableCategories.map((category) => (
                        <option key={category} value={category} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="asset_tag_number">Asset Tag Number *</Label>
                    <Input
                      id="asset_tag_number"
                      placeholder="Auto-generated"
                      value={formData.asset_tag_number}
                      onChange={(e) => {
                        setFormData({ ...formData, asset_tag_number: e.target.value });
                        setAssetTagError(null); // Clear error on change
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
                      placeholder="e.g., pcs, units"
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
                    list="location-suggestions"
                    required
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
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={createAssetMutation.isPending}>
                    {createAssetMutation.isPending ? "Creating..." : "Create Asset"}
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
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search assets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Tag</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Ministry</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Quantity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20" />
                  </TableCell>
                  <TableCell>
                <Skeleton className="h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))
            ) : assets && assets.length > 0 ? (
              assets.map((asset) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/inventory/assets/${asset.id}`)}
                >
                  <TableCell className="font-medium">{asset.asset_tag_number}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {asset.asset_description || "—"}
                  </TableCell>
                  <TableCell>{asset.category}</TableCell>
                  <TableCell>{ministryMap.get(asset.ministry_assigned) || "—"}</TableCell>
                  <TableCell>{asset.physical_location || "—"}</TableCell>
                  <TableCell>{getStatusBadge(asset.asset_status)}</TableCell>
                  <TableCell>
                    {asset.quantity} {asset.unit_of_measure}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
            <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-slate-500">No assets found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

