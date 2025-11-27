"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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

export default function AssetsPage() {
  const { isAssetManager } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

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

  const { data: ministries } = useQuery({
    queryKey: ["ministries"],
    queryFn: async () => {
      const { data, error } = await getMinistries();
      if (error) {
        console.error("Error fetching ministries:", error);
        return [];
      }
      return data || [];
    },
  });

  const ministryMap = useMemo(() => {
    const map = new Map<string, string>();
    ministries?.forEach((ministry: any) => {
      if (ministry.id) {
        map.set(ministry.id, ministry.name);
      }
    });
    return map;
  }, [ministries]);

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
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
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
              <TableHead className="text-right">Actions</TableHead>
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
                  <TableCell>
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : assets && assets.length > 0 ? (
              assets.map((asset: any) => (
                <TableRow key={asset.id}>
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
                  <TableCell className="text-right">
                    <Link href={`/inventory/assets/${asset.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
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

