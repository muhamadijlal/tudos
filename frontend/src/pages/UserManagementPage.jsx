import { Combobox } from "@/components/Combobox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { TablePagination } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/use-pagination";
import { api, ApiError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { useEffect, useState } from "react";

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const canAssignRole = hasPermission(currentUser, "users.assignRole");
  const canDeleteUser = hasPermission(currentUser, "users.delete");
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(users);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    setError("");
    try {
      const requests = [api.get("/users")];
      if (canAssignRole) requests.push(api.get("/roles"));
      const [usersRes, rolesRes] = await Promise.all(requests);
      setUsers(usersRes.data);
      if (rolesRes) setRoleOptions(rolesRes.data.map((r) => ({ value: r.id, label: r.name })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat user");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRoleChange(userId, roleId) {
    const previous = users;
    const role = roleOptions.find((r) => r.value === roleId);
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: { id: roleId, name: role?.label } } : u)),
    );
    try {
      await api.patch(`/users/${userId}/role`, { roleId });
    } catch (err) {
      setUsers(previous);
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal mengubah role",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      await loadUsers();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus user",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>Kelola role dan akses semua user.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden sm:table-cell">Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={4} />
            ) : (
              pageItems.map((user) => {
                const isSelf = user.id === currentUser?.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2">
                          Kamu
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {canAssignRole ? (
                        <Combobox
                          options={roleOptions}
                          value={user.role?.id}
                          disabled={isSelf}
                          onValueChange={(value) => handleRoleChange(user.id, Number(value))}
                          searchPlaceholder="Cari role..."
                          size="sm"
                          className="w-24 sm:w-32"
                        />
                      ) : (
                        <Badge variant="outline">{user.role?.name}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isSelf || !canDeleteUser}
                        onClick={() => setDeleteTarget(user)}
                      >
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {!isLoading && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={users.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="user"
          />
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus user "${deleteTarget?.name}"?`}
        description="Aksi ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleDelete}
      />

      <FeedbackDialog
        open={feedback.open}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        variant={feedback.variant}
        title={feedback.title}
        description={feedback.description}
      />
    </Card>
  );
}
