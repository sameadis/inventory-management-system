"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssets } from "@/lib/supabase/queries";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssetsPage() {
  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await getAssets();
      if (error) {
        console.error("Error fetching assets:", error);
        return [];
      }
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Assets</h2>
          <p className="text-muted-foreground">Manage all fixed assets in your church branch</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
          Add New Asset
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : assets && assets.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-sm">Asset Tag</th>
                <th className="text-left p-4 font-medium text-sm">Description</th>
                <th className="text-left p-4 font-medium text-sm">Category</th>
                <th className="text-left p-4 font-medium text-sm">Condition</th>
                <th className="text-left p-4 font-medium text-sm">Status</th>
                <th className="text-left p-4 font-medium text-sm">Quantity</th>
                <th className="text-right p-4 font-medium text-sm">Cost</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset: any) => (
                <tr key={asset.id} className="border-b hover:bg-slate-50">
                  <td className="p-4 font-medium">{asset.asset_tag_number}</td>
                  <td className="p-4">{asset.asset_description}</td>
                  <td className="p-4">{asset.category}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        asset.current_condition === "New"
                          ? "bg-blue-100 text-blue-800"
                          : asset.current_condition === "Good"
                          ? "bg-green-100 text-green-800"
                          : asset.current_condition === "Fair"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {asset.current_condition}
                    </span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        asset.asset_status === "active"
                          ? "bg-green-100 text-green-800"
                          : asset.asset_status === "disposed"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {asset.asset_status}
                    </span>
                  </td>
                  <td className="p-4">
                    {asset.quantity} {asset.unit_of_measure}
                  </td>
                  <td className="p-4 text-right font-medium">
                    ${asset.acquisition_cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-muted-foreground">
            No assets found. Click "Add New Asset" to create your first asset record.
          </p>
        </div>
      )}

      {assets && assets.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Total: {assets.length} asset{assets.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

