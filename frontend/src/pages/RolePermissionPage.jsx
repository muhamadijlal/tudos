import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { TablePagination } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { collectErrors, validateRequired } from "@/lib/validation";
import { Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

const EMPTY_FORM = { name: "", description: "", permissionKeys: [] };

export default function RolePermissionPage() {
  const [roles, setRoles] = useState([]);
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(roles);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        api.get("/roles"),
        api.get("/roles/permissions"),
      ]);
      setRoles(rolesRes.data);

      const grouped = new Map();
      for (const permission of permissionsRes.data) {
        if (!grouped.has(permission.group)) grouped.set(permission.group, []);
        grouped.get(permission.group).push(permission);
      }
      setPermissionGroups(Array.from(grouped, ([group, permissions]) => ({ group, permissions })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat role");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(role) {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description ?? "",
      permissionKeys: role.permissions ?? [],
    });
    setFieldErrors({});
    setFormOpen(true);
  }

  function togglePermission(key) {
    setForm((prev) => ({
      ...prev,
      permissionKeys: prev.permissionKeys.includes(key)
        ? prev.permissionKeys.filter((k) => k !== key)
        : [...prev.permissionKeys, key],
    }));
  }

  function validate() {
    return collectErrors({ name: validateRequired(form.name, "Nama role") });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, form);
      } else {
        await api.post("/roles", form);
      }
      setFormOpen(false);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: editingRole ? "Gagal mengubah role" : "Gagal membuat role",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/roles/${deleteTarget.id}`);
      await loadData();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus role",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Role & Permission</CardTitle>
          <CardDescription>
            Buat role sendiri dan atur fitur apa aja yang boleh diakses tiap role.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreateForm}>
          <Plus /> Role Baru
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead className="hidden sm:table-cell">Deskripsi</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={5} />
            ) : (
              pageItems.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {role.description || "-"}
                  </TableCell>
                  <TableCell>{role.permissions.length}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditForm(role)}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={role.isSystem}
                        onClick={() => setDeleteTarget(role)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {!isLoading && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={roles.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="role"
          />
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Role Baru"}</DialogTitle>
            <DialogDescription>
              {editingRole
                ? "Ubah nama, deskripsi, dan permission role ini."
                : "Isi nama role dan pilih permission yang boleh dipakai."}
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-name">
                Nama
                <RequiredMark />
              </Label>
              <Input
                id="role-name"
                aria-invalid={Boolean(fieldErrors.name)}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role-description">Deskripsi</Label>
              <Input
                id="role-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Permission</Label>
              <div className="flex max-h-64 flex-col gap-4 overflow-y-auto rounded-none ring-1 ring-border p-3">
                {permissionGroups.map(({ group, permissions }) => (
                  <div key={group} className="flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-muted-foreground">{group}</p>
                    {permissions.map((permission) => (
                      <label
                        key={permission.key}
                        className="flex items-center gap-2 text-xs"
                      >
                        <Checkbox
                          checked={form.permissionKeys.includes(permission.key)}
                          onCheckedChange={() => togglePermission(permission.key)}
                        />
                        {permission.label}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner />}
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus role "${deleteTarget?.name}"?`}
        description="Role yang masih dipakai user tidak bisa dihapus."
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
