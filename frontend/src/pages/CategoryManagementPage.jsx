import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { TablePagination } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const EMPTY_FORM = { name: "" };

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(categories);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat kategori");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingCategory(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(category) {
    setEditingCategory(category);
    setForm({ name: category.name });
    setFieldErrors({});
    setFormOpen(true);
  }

  function validate() {
    return collectErrors({ name: validateRequired(form.name, "Nama kategori") });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, form);
      } else {
        await api.post("/categories", form);
      }
      setFormOpen(false);
      await loadCategories();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: editingCategory ? "Gagal mengubah kategori" : "Gagal membuat kategori",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      await loadCategories();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus kategori",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Kategori Task</CardTitle>
          <CardDescription>Kelola kategori yang bisa dipakai buat task (admin only).</CardDescription>
        </div>
        <Button size="sm" onClick={openCreateForm}>
          <Plus /> Kategori Baru
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
        {!isLoading && categories.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada kategori.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={2} />
              ) : (
                pageItems.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditForm(category)}>
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteTarget(category)}
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
        )}

        {!isLoading && categories.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={categories.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="kategori"
          />
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Kategori" : "Kategori Baru"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Ubah nama kategori ini." : "Isi nama kategori yang mau dibuat."}
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category-name">
                Nama
                <RequiredMark />
              </Label>
              <Input
                id="category-name"
                aria-invalid={Boolean(fieldErrors.name)}
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
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
        title={`Hapus kategori "${deleteTarget?.name}"?`}
        description="Kategori yang masih dipakai task tidak bisa dihapus."
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
