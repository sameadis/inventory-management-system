"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Power, PowerOff, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Ministry = {
  id: string;
  name: string;
  church_branch_id: string;
  contact_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  church_branch?: {
    id: string;
    name: string;
    location: string | null;
    is_active: boolean;
  };
};

type ChurchBranch = {
  id: string;
  name: string;
  location: string | null;
  is_active: boolean;
};

export default function MinistriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState<Ministry | null>(
    null
  );
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    name: "",
    church_branch_id: "",
    contact_info: "",
  });

  // Fetch branches for dropdown
  const { data: branches } = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: async (): Promise<ChurchBranch[]> => {
      const response = await fetch("/api/admin/church-branches");
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  // Fetch ministries
  const { data: ministries, isLoading } = useQuery({
    queryKey: ["admin", "ministries", branchFilter],
    queryFn: async (): Promise<Ministry[]> => {
      const params = new URLSearchParams();
      if (branchFilter !== "all") {
        params.append("church_branch_id", branchFilter);
      }
      const response = await fetch(
        `/api/admin/ministries?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch ministries");
      return response.json();
    },
  });

  // Create ministry mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/admin/ministries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create ministry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ministries"] });
      toast({ title: "Ministry created successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update ministry mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<typeof formData>;
    }) => {
      const response = await fetch(`/api/admin/ministries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update ministry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ministries"] });
      toast({ title: "Ministry updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedMinistry(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: string;
      is_active: boolean;
    }) => {
      const response = await fetch(`/api/admin/ministries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update ministry status");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ministries"] });
      toast({
        title: variables.is_active
          ? "Ministry activated"
          : "Ministry deactivated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      church_branch_id: "",
      contact_info: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!selectedMinistry) return;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { church_branch_id, ...updateData } = formData;
    updateMutation.mutate({
      id: selectedMinistry.id,
      data: updateData,
    });
  };

  const handleOpenEdit = (ministry: Ministry) => {
    setSelectedMinistry(ministry);
    setFormData({
      name: ministry.name,
      church_branch_id: ministry.church_branch_id,
      contact_info: ministry.contact_info || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleToggleActive = (ministry: Ministry) => {
    toggleActiveMutation.mutate({
      id: ministry.id,
      is_active: !ministry.is_active,
    });
  };

  const activeBranches = branches?.filter((b) => b.is_active) || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ministries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage ministries within church branches
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches?.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Ministry
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Ministries</CardTitle>
          <CardDescription>
            View and manage ministries across all branches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">
              Loading ministries...
            </p>
          ) : !ministries || ministries.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No ministries found. Create your first ministry to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ministries.map((ministry) => (
                  <TableRow key={ministry.id}>
                    <TableCell className="font-medium">
                      {ministry.name}
                    </TableCell>
                    <TableCell>
                      {ministry.church_branch?.name || "—"}
                    </TableCell>
                    <TableCell>{ministry.contact_info || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={ministry.is_active ? "default" : "secondary"}
                      >
                        {ministry.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(ministry)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={ministry.is_active ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleActive(ministry)}
                        >
                          {ministry.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Ministry</DialogTitle>
            <DialogDescription>
              Add a new ministry to a church branch
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Ministry Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Worship, Youth, Finance"
              />
            </div>
            <div>
              <Label htmlFor="church_branch_id">Church Branch *</Label>
              <Select
                value={formData.church_branch_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, church_branch_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {activeBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="contact_info">Contact Info</Label>
              <Textarea
                id="contact_info"
                value={formData.contact_info}
                onChange={(e) =>
                  setFormData({ ...formData, contact_info: e.target.value })
                }
                placeholder="Phone, email, leader name, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !formData.name ||
                !formData.church_branch_id ||
                createMutation.isPending
              }
            >
              {createMutation.isPending ? "Creating..." : "Create Ministry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Ministry</DialogTitle>
            <DialogDescription>Update ministry information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Ministry Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-branch">Church Branch</Label>
              <Input
                id="edit-branch"
                value={
                  branches?.find((b) => b.id === formData.church_branch_id)
                    ?.name || ""
                }
                disabled
                className="bg-muted"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Branch cannot be changed after creation
              </p>
            </div>
            <div>
              <Label htmlFor="edit-contact_info">Contact Info</Label>
              <Textarea
                id="edit-contact_info"
                value={formData.contact_info}
                onChange={(e) =>
                  setFormData({ ...formData, contact_info: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedMinistry(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={!formData.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
