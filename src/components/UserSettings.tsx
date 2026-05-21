"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, Plus, User, Mail, AlertTriangle, Pencil, Search, Filter, ChevronLeft, ChevronRight, Shield, ShieldCheck, UserCheck, UserX } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/contexts/AuthContext";
import { userApi } from "@/lib/api/user";
import { roleApi, type RoleDto } from "@/lib/api/role";
import type { UserResponse, CreateUserRequest, UpdateUserRequest } from "@/types/api";

const UserSettings: React.FC = () => {
  const { user: currentUser, effectiveAgencyId } = useAuth();

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | "">("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [roles, setRoles] = useState<RoleDto[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);

  const [newUser, setNewUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roleIds: string[];
    isAgencyAdmin: boolean;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    roleIds: [],
    isAgencyAdmin: false,
  });

  const [editUser, setEditUser] = useState<{
    firstName: string;
    lastName: string;
    roleIds: string[];
  } | null>(null);

  const totalPages = useMemo(
    () => (pageSize ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1),
    [totalCount, pageSize],
  );

  const getApiErrorMessage = (err: any, fallback: string) => {
    const api = err?.response?.data ?? err?.response?.Data;
    const code = api?.errorCode ?? api?.ErrorCode;
    const message = api?.message ?? api?.Message ?? fallback;
    switch (code) {
      case "InvalidRequest":
        return message || "There are validation errors. Please check the form.";
      case "NotFound":
        return message || "Record not found.";
      case "Conflict":
        return message || "A record with the same details already exists.";
      case "ServerError":
        return message || "A server error occurred. Please try again.";
      default:
        return message || fallback;
    }
  };

  const loadRoles = async () => {
    try {
      const agencyId = effectiveAgencyId ?? null;
      if (!agencyId) return;
      const list = await roleApi.getByAgency(agencyId);
      setRoles(list);
    } catch (err) {
      console.error("Failed to load roles", err);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const agencyId = effectiveAgencyId ?? null;
      const isActive =
        statusFilter === "all" ? null : statusFilter === "active" ? true : false;

      const result = await userApi.list({
        agencyId,
        page,
        pageSize,
        search: search.trim() || undefined,
        roleId: roleFilter || null,
        isActive,
      });

      setUsers(result.data);
      setTotalCount(result.totalCount);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to load users.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAgencyId]);

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, roleFilter, statusFilter, effectiveAgencyId]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const payload: CreateUserRequest = {
        firstName: newUser.firstName.trim(),
        lastName: newUser.lastName.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        agencyId: effectiveAgencyId ?? null,
        roleIds: newUser.roleIds,
        isAgencyAdmin: newUser.isAgencyAdmin,
      };
      await userApi.create(payload);
      setShowAddUserModal(false);
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        roleIds: [],
        isAgencyAdmin: false,
      });
      await loadUsers();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to add user. Please try again.");
      setError(msg);
      console.error("Error adding user:", err);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      setError(null);
      await userApi.delete(selectedUser.id);
      setShowDeleteModal(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to delete user. Please try again.");
      setError(msg);
      console.error("Error deleting user:", err);
    }
  };

  const openDeleteModal = (user: UserResponse) => {
    setError(null);
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openEditModal = (user: UserResponse) => {
    setError(null);
    setSelectedUser(user);
    setEditUser({
      firstName: user.firstName,
      lastName: user.lastName,
      roleIds: (user.userRoles || []).map((r) => r.id),
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editUser) return;
    try {
      setError(null);
      const payload: UpdateUserRequest = {
        firstName: editUser.firstName.trim(),
        lastName: editUser.lastName.trim(),
        agencyId: selectedUser.agencyId ?? null,
        roleIds: editUser.roleIds,
      };
      await userApi.update(selectedUser.id, payload);
      setShowEditUserModal(false);
      setSelectedUser(null);
      setEditUser(null);
      await loadUsers();
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to update user. Please try again.");
      setError(msg);
      console.error("Error updating user:", err);
    }
  };

  const getRoleBadge = (roleNames: string[]) => {
    if (!roleNames.length) return <Badge variant="outline">No role</Badge>;
    return (
      <div className="flex flex-wrap gap-1">
        {roleNames.map((name) => (
          <Badge key={name} variant="outline">
            {name}
          </Badge>
        ))}
      </div>
    );
  };

  const getInitials = (u: UserResponse) => {
    const first = (u.firstName || "").trim();
    const last = (u.lastName || "").trim();
    const initials = `${first.charAt(0) || ""}${last.charAt(0) || ""}`.toUpperCase();
    if (initials) return initials;
    return (u.email || "U").charAt(0).toUpperCase();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <Button onClick={() => { setError(null); setShowAddUserModal(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Users ({totalCount})
          </CardTitle>
          <CardDescription>Search, filter and manage user accounts within the system.</CardDescription>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="user-search"
                placeholder="Search by name or email"
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-gray-600">Role</Label>
              <select
                className="border rounded-md px-2 py-1 text-sm bg-background"
                value={roleFilter}
                onChange={(e) => {
                  setPage(1);
                  setRoleFilter(e.target.value);
                }}
              >
                <option value="">All</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                className="border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-[var(--primary)] focus:outline-none transition-all shadow-sm"
                value={statusFilter}
                onChange={(e) => {
                  setPage(1);
                  setStatusFilter(e.target.value as any);
                }}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
                <p className="text-gray-600">Loading users...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-4">Get started by adding your first user.</p>
              <Button onClick={() => setShowAddUserModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImage} alt="Profile" />
                            <AvatarFallback className="text-xs">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {`${user.firstName} ${user.lastName}`.trim() || user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge((user.userRoles || []).map((r) => r.roleName))}
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/90 p-1 shadow-sm">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditModal(user)}
                            className="h-10 w-10 rounded-lg text-slate-700 hover:text-amber-700 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-1 transition-all"
                            title="Edit User"
                            aria-label="Edit user"
                          >
                            <Pencil className="h-5 w-5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDeleteModal(user)}
                            className="h-10 w-10 rounded-lg text-slate-700 hover:text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-1 transition-all"
                            title="Delete User"
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {users.length > 0 && (
        <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} ({totalCount} users)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal isOpen={showAddUserModal} onClose={() => { setError(null); setShowAddUserModal(false); }} title="Add New User">
        <form onSubmit={handleAddUser} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              type="text"
              value={newUser.firstName}
              onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
              placeholder="Enter first name"
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              type="text"
              value={newUser.lastName}
              onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
              placeholder="Enter last name"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              required
              placeholder="Enter email address"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              required
              placeholder="Enter password"
            />
          </div>
          <div>
            <Label htmlFor="createRole">Role</Label>
            <select
              id="createRole"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-background text-sm"
              value={newUser.roleIds[0] ?? ""}
              onChange={(e) =>
                setNewUser((prev) => ({
                  ...prev,
                  roleIds: e.target.value ? [e.target.value] : [],
                }))
              }
            >
              <option value="">Select a role</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="isAgencyAdmin"
              type="checkbox"
              checked={newUser.isAgencyAdmin}
              onChange={(e) => setNewUser({ ...newUser, isAgencyAdmin: e.target.checked })}
              className="h-4 w-4"
            />
            <Label htmlFor="isAgencyAdmin" className="text-sm">
              Agency admin
            </Label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setError(null); setShowAddUserModal(false); }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !newUser.firstName.trim() ||
                !newUser.lastName.trim() ||
                !newUser.email.trim() ||
                !newUser.password.trim() ||
                newUser.roleIds.length === 0
              }
            >
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={showEditUserModal} onClose={() => { setError(null); setShowEditUserModal(false); }} title="Edit User">
        {editUser && selectedUser && (
          <form onSubmit={handleUpdateUser} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800 flex gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <Label htmlFor="editFirstName">First Name</Label>
              <Input
                id="editFirstName"
                type="text"
                value={editUser.firstName}
                onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="editLastName">Last Name</Label>
              <Input
                id="editLastName"
                type="text"
                value={editUser.lastName}
                onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={selectedUser.email}
                disabled
              />
            </div>
            <div>
              <Label>Roles</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {roles.map((r) => {
                  const checked = editUser.roleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        setEditUser((prev) =>
                          prev
                            ? {
                                ...prev,
                                roleIds: checked
                                  ? prev.roleIds.filter((id) => id !== r.id)
                                  : [...prev.roleIds, r.id],
                              }
                            : prev,
                        )
                      }
                      className={`px-2 py-1 rounded-md border text-xs ${
                        checked ? "bg-primary text-primary-foreground" : "bg-background"
                      }`}
                    >
                      {r.name}
                    </button>
                  );
                })}
                {roles.length === 0 && (
                  <span className="text-xs text-gray-500">No roles available for this agency.</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setError(null); setShowEditUserModal(false); }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !editUser.firstName.trim() ||
                  !editUser.lastName.trim() ||
                  editUser.roleIds.length === 0
                }
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setError(null); setShowDeleteModal(false); }}
        title="Delete User"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800 flex gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-md">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Are you sure you want to delete this user?</p>
              <p className="text-sm text-red-600">This action cannot be undone.</p>
            </div>
          </div>
          
          {selectedUser && (
            <div className="p-4 border rounded-md">
              <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={selectedUser.profileImage && selectedUser.profileImage.trim() !== "" ? selectedUser.profileImage : undefined}
                  alt="Profile"
                />
                <AvatarFallback className="text-xs">
                  {getInitials(selectedUser)}
                </AvatarFallback>
              </Avatar>
                <div>
                  <div className="font-medium">
                    {`${selectedUser.firstName} ${selectedUser.lastName}`.trim() || selectedUser.email}
                  </div>
                  <div className="text-sm text-gray-500">{selectedUser.email}</div>
                  <div className="text-sm text-gray-500">
                    Roles: {(selectedUser.userRoles || []).map((r) => r.roleName).join(", ") || "None"}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => { setError(null); setShowDeleteModal(false); }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteUser}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserSettings;
