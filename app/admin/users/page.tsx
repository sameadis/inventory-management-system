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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Edit, Plus, X, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type UserProfile = {
  id: string;
  full_name: string | null;
  church_branch_id: string;
  ministry_id: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  church_branch?: {
    id: string;
    name: string;
    is_active: boolean;
  };
  ministry?: {
    id: string;
    name: string;
    is_active: boolean;
  } | null;
  roles: Array<{
    id: string;
    name: string;
    description: string | null;
  }>;
};

type Role = {
  id: string;
  name: string;
  description: string | null;
};

type ChurchBranch = {
  id: string;
  name: string;
  is_active: boolean;
};

type Ministry = {
  id: string;
  name: string;
  church_branch_id: string;
  is_active: boolean;
};

export default function UsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    full_name: "",
    church_branch_id: "",
    ministry_id: "",
  });

  const [roleFormData, setRoleFormData] = useState({
    role_id: "",
  });

  const [inviteFormData, setInviteFormData] = useState({
    email: "",
    full_name: "",
    church_branch_id: "",
    ministry_id: "",
    role_ids: [] as string[],
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: async (): Promise<ChurchBranch[]> => {
      const response = await fetch("/api/admin/church-branches");
      if (!response.ok) throw new Error("Failed to fetch branches");
      return response.json();
    },
  });

  // Fetch ministries for selected branch
  const { data: ministries } = useQuery({
    queryKey: ["admin", "ministries", formData.church_branch_id],
    queryFn: async (): Promise<Ministry[]> => {
      if (!formData.church_branch_id) return [];
      const params = new URLSearchParams({
        church_branch_id: formData.church_branch_id,
      });
      const response = await fetch(
        `/api/admin/ministries?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch ministries");
      return response.json();
    },
    enabled: !!formData.church_branch_id,
  });

  // Fetch roles
  const { data: roles } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: async (): Promise<Role[]> => {
      const response = await fetch("/api/admin/roles");
      if (!response.ok) throw new Error("Failed to fetch roles");
      return response.json();
    },
  });

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users", branchFilter],
    queryFn: async (): Promise<UserProfile[]> => {
      const params = new URLSearchParams();
      if (branchFilter !== "all") {
        params.append("church_branch_id", branchFilter);
      }
      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Filter and paginate users
  const filteredUsers = users?.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.church_branch?.name?.toLowerCase().includes(query) ||
      user.ministry?.name?.toLowerCase().includes(query) ||
      user.roles.some((r) => r.name.toLowerCase().includes(query))
    );
  }) || [];

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleBranchFilterChange = (value: string) => {
    setBranchFilter(value);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Update user profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`/api/admin/users/${id}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          ministry_id: data.ministry_id || null,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "User profile updated successfully" });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
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

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async ({
      user_id,
      role_id,
    }: {
      user_id: string;
      role_id: string;
    }) => {
      const response = await fetch("/api/admin/user-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id, role_id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to assign role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Role assigned successfully" });
      setIsRoleDialogOpen(false);
      setRoleFormData({ role_id: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({
      user_id,
      role_id,
    }: {
      user_id: string;
      role_id: string;
    }) => {
      const user = users?.find((u) => u.id === user_id);
      const userRole = user?.roles.find((r) => r.id === role_id);

      if (!userRole) {
        throw new Error("Role assignment not found");
      }

      const response = await fetch(
        `/api/admin/user-roles/${user_id}?role_id=${role_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "Role removed successfully" });
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
      full_name: "",
      church_branch_id: "",
      ministry_id: "",
    });
  };

  const resetInviteForm = () => {
    setInviteFormData({
      email: "",
      full_name: "",
      church_branch_id: "",
      ministry_id: "",
      role_ids: [],
    });
  };

  const handleEdit = () => {
    if (!selectedUser) return;
    updateProfileMutation.mutate({
      id: selectedUser.id,
      data: formData,
    });
  };

  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setFormData({
      full_name: user.full_name || "",
      church_branch_id: user.church_branch_id,
      ministry_id: user.ministry_id || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenRoleDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setRoleFormData({ role_id: "" });
    setIsRoleDialogOpen(true);
  };

  const handleAssignRole = () => {
    if (!selectedUser || !roleFormData.role_id) return;
    assignRoleMutation.mutate({
      user_id: selectedUser.id,
      role_id: roleFormData.role_id,
    });
  };

  const activeBranches = branches?.filter((b) => b.is_active) || [];
  const activeMinistries = ministries?.filter((m) => m.is_active) || [];

  // Fetch ministries for invite form
  const { data: inviteMinistries } = useQuery({
    queryKey: ["admin", "ministries", inviteFormData.church_branch_id],
    queryFn: async (): Promise<Ministry[]> => {
      if (!inviteFormData.church_branch_id) return [];
      const params = new URLSearchParams({
        church_branch_id: inviteFormData.church_branch_id,
      });
      const response = await fetch(
        `/api/admin/ministries?${params.toString()}`
      );
      if (!response.ok) throw new Error("Failed to fetch ministries");
      return response.json();
    },
    enabled: !!inviteFormData.church_branch_id,
  });

  const activeInviteMinistries = inviteMinistries?.filter((m) => m.is_active) || [];

  const getAvailableRoles = (user: UserProfile) => {
    const userRoleIds = user.roles.map((r) => r.id);
    return roles?.filter((r) => !userRoleIds.includes(r.id)) || [];
  };

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: typeof inviteFormData) => {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to invite user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ 
        title: "User invited successfully",
        description: "They will receive an email to set their password."
      });
      setIsInviteDialogOpen(false);
      resetInviteForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInviteUser = () => {
    inviteUserMutation.mutate(inviteFormData);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage user profiles, branch assignments, and role permissions
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full md:flex-row md:items-center md:w-auto">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="md:w-64"
          />
          <div className="flex gap-2">
            <Select value={branchFilter} onValueChange={handleBranchFilterChange}>
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
            <Button onClick={() => setIsInviteDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage user profiles and role assignments
            {filteredUsers.length > 0 && (
              <span className="ml-2">
                ({filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""})
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {searchQuery || branchFilter !== "all"
                ? "No users match your filters."
                : "No users found."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Ministry</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.full_name || "—"}
                    </TableCell>
                    <TableCell>{user.email || "—"}</TableCell>
                    <TableCell>{user.church_branch?.name || "—"}</TableCell>
                    <TableCell>{user.ministry?.name || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">
                            No roles
                          </span>
                        ) : (
                          user.roles.map((role) => (
                            <Badge key={role.id} variant="secondary">
                              {role.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenRoleDialog(user)}
                        >
                          <Plus className="h-4 w-4" />
                          Roles
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {/* Pagination */}
          {filteredUsers.length > itemsPerPage && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of{" "}
                {filteredUsers.length} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, index, array) => (
                      <div key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </div>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information and assignments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="church_branch_id">Church Branch *</Label>
              <Select
                value={formData.church_branch_id}
                onValueChange={(value) => {
                  setFormData({
                    ...formData,
                    church_branch_id: value,
                    ministry_id: "",
                  });
                }}
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
              <Label htmlFor="ministry_id">Ministry (Optional)</Label>
              <Select
                value={formData.ministry_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, ministry_id: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a ministry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeMinistries.map((ministry) => (
                    <SelectItem key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedUser(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={
                !formData.church_branch_id || updateProfileMutation.isPending
              }
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Roles</DialogTitle>
            <DialogDescription>
              Assign or remove roles for {selectedUser?.full_name || "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Current Roles</Label>
              <div className="mt-2 space-y-2">
                {selectedUser?.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles assigned</p>
                ) : (
                  selectedUser?.roles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between rounded-lg border p-2"
                    >
                      <div>
                        <p className="font-medium">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          selectedUser &&
                          removeRoleMutation.mutate({
                            user_id: selectedUser.id,
                            role_id: role.id,
                          })
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="role_id">Add Role</Label>
              <Select
                value={roleFormData.role_id}
                onValueChange={(value) =>
                  setRoleFormData({ role_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role to add" />
                </SelectTrigger>
                <SelectContent>
                  {selectedUser &&
                    getAvailableRoles(selectedUser).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                        {role.description && ` - ${role.description}`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRoleDialogOpen(false);
                setSelectedUser(null);
                setRoleFormData({ role_id: "" });
              }}
            >
              Close
            </Button>
            <Button
              onClick={handleAssignRole}
              disabled={!roleFormData.role_id || assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? "Adding..." : "Add Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Send an invitation email to a new user. They will receive a link to set their password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="invite-email">Email Address *</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteFormData.email}
                onChange={(e) =>
                  setInviteFormData({ ...inviteFormData, email: e.target.value })
                }
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="invite-full_name">Full Name</Label>
              <Input
                id="invite-full_name"
                value={inviteFormData.full_name}
                onChange={(e) =>
                  setInviteFormData({ ...inviteFormData, full_name: e.target.value })
                }
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="invite-church_branch_id">Church Branch *</Label>
              <Select
                value={inviteFormData.church_branch_id}
                onValueChange={(value) => {
                  setInviteFormData({
                    ...inviteFormData,
                    church_branch_id: value,
                    ministry_id: "",
                  });
                }}
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
              <Label htmlFor="invite-ministry_id">Ministry (Optional)</Label>
              <Select
                value={inviteFormData.ministry_id || "none"}
                onValueChange={(value) =>
                  setInviteFormData({ ...inviteFormData, ministry_id: value === "none" ? "" : value })
                }
                disabled={!inviteFormData.church_branch_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a ministry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {activeInviteMinistries.map((ministry) => (
                    <SelectItem key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign Roles (Optional)</Label>
              <div className="mt-2 space-y-2">
                {roles?.map((role) => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`role-${role.id}`}
                      checked={inviteFormData.role_ids.includes(role.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setInviteFormData({
                            ...inviteFormData,
                            role_ids: [...inviteFormData.role_ids, role.id],
                          });
                        } else {
                          setInviteFormData({
                            ...inviteFormData,
                            role_ids: inviteFormData.role_ids.filter(
                              (id) => id !== role.id
                            ),
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label
                      htmlFor={`role-${role.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {role.name}
                      {role.description && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          - {role.description}
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsInviteDialogOpen(false);
                resetInviteForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={
                !inviteFormData.email ||
                !inviteFormData.church_branch_id ||
                inviteUserMutation.isPending
              }
            >
              {inviteUserMutation.isPending ? "Inviting..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
