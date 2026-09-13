import { CodeBadge } from "@/components/CodeBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";
import { ExportButtons } from "@/components/ExportButtons";
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
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { usePagination } from "@/hooks/use-pagination";
import { baseProjectCode } from "@/lib/projectCode";
import { formatDate } from "@/lib/task";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { filenamePeriodSuffix } from "@/lib/export";
import { collectErrors, validateRequired } from "@/lib/validation";
import { MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

const EMPTY_FORM = { name: "", description: "", startDate: "", dueDate: "" };

// "Milik Saya": aku ownernya. "Ditugaskan ke Saya": aku bukan owner tapi jadi
// assignee di salah satu task-nya — sama persis pola filter di ProjectsPage.
const OWNERSHIP_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "mine", label: "Milik Saya" },
  { value: "assigned", label: "Ditugaskan ke Saya" },
];

function periodLabel(project) {
  if (!project.startDate && !project.dueDate) return "-";
  return `${formatDate(project.startDate)} – ${formatDate(project.dueDate)}`;
}

export default function ProjectManagementPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("all");

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (query && !p.name.toLowerCase().includes(query) && !p.code?.toLowerCase().includes(query)) {
        return false;
      }
      if (ownershipFilter === "mine" && p.user?.id !== user?.id) return false;
      if (
        ownershipFilter === "assigned" &&
        !p.tasks.some((t) => (t.assignees ?? []).some((a) => a.id === user?.id))
      ) {
        return false;
      }
      return true;
    });
  }, [projects, search, ownershipFilter, user]);

  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(filteredProjects);

  const exportColumns = useMemo(
    () => [
      { key: "code", label: "Kode", width: 14 },
      { key: "name", label: "Nama", width: 26 },
      { key: "description", label: "Deskripsi", width: 32 },
      { key: "owner", label: "Pemilik", width: 20 },
      { key: "period", label: "Periode", width: 24 },
      { key: "taskCount", label: "Jumlah Task", width: 12 },
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      filteredProjects.map((project) => ({
        code: project.code ?? "-",
        name: project.name,
        description: project.description || "-",
        owner: project.user?.name ?? "-",
        period: periodLabel(project),
        taskCount: project.tasks.length,
      })),
    [filteredProjects],
  );

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat project");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(project) {
    setEditingProject(project);
    setForm({
      name: project.name,
      description: project.description ?? "",
      startDate: project.startDate ? project.startDate.slice(0, 10) : "",
      dueDate: project.dueDate ? project.dueDate.slice(0, 10) : "",
    });
    setFieldErrors({});
    setFormOpen(true);
  }

  function validate() {
    return collectErrors({ name: validateRequired(form.name, "Nama project") });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // startDate/dueDate kosong ("") dikirim sebagai null (bukan di-skip) biar
    // bisa dipakai buat ngosongin tanggal yang sebelumnya udah keisi pas edit.
    const payload = {
      ...form,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
    };

    setIsSubmitting(true);
    try {
      if (editingProject) {
        await api.put(`/projects/${editingProject.id}`, payload);
      } else {
        await api.post("/projects", { ...payload, userId: user.id });
      }
      setFormOpen(false);
      await loadProjects();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: editingProject ? "Gagal mengubah project" : "Gagal membuat project",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/projects/${deleteTarget.id}`);
      await loadProjects();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus project",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Management Project</CardTitle>
          <CardDescription>Kelola semua project — buat, ubah, hapus.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <ExportButtons
            title="Management Project"
            columns={exportColumns}
            rows={exportRows}
            period={filenamePeriodSuffix()}
            onError={(message) =>
              setFeedback({ open: true, variant: "error", title: "Gagal export", description: message })
            }
          />
          <Button size="sm" onClick={openCreateForm}>
            <Plus /> Project Baru
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {!isLoading && projects.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <MagnifyingGlass />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Cari project (nama/kode)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            <div className="flex items-center gap-1">
              {OWNERSHIP_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  variant={ownershipFilter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOwnershipFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && projects.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada project.</p>
        ) : !isLoading && filteredProjects.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Gak ada project yang cocok dengan pencarian/filter ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden sm:table-cell">Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden md:table-cell">Deskripsi</TableHead>
                <TableHead className="hidden sm:table-cell">Pemilik</TableHead>
                <TableHead className="hidden lg:table-cell">Periode</TableHead>
                <TableHead>Task</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={7} />
              ) : (
                pageItems.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="hidden sm:table-cell">
                      <CodeBadge>{project.code}</CodeBadge>
                    </TableCell>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="hidden max-w-64 truncate text-muted-foreground md:table-cell">
                      {project.description || "-"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {project.user?.name ?? "-"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {periodLabel(project)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{project.tasks.length}</TableCell>
                    <TableCell className="text-right">
                      {project.user?.id === user?.id ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditForm(project)}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(project)}
                          >
                            Hapus
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Read only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {!isLoading && projects.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredProjects.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="project"
          />
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Project Baru"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Ubah detail project ini." : "Isi detail project yang mau dibuat."}
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">
                Nama
                <RequiredMark />
              </Label>
              <Input
                id="project-name"
                aria-invalid={Boolean(fieldErrors.name)}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
              {!editingProject && form.name.trim() && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  Preview kode: <CodeBadge>{baseProjectCode(form.name)}</CodeBadge>
                  <span>(bisa jadi {baseProjectCode(form.name)}2, dst kalau kodenya udah kepake)</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-description">Deskripsi</Label>
              <Textarea
                id="project-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal Mulai</Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={form.startDate}
                  onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
                  placeholder="Tanpa tanggal mulai"
                />
                {form.startDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setForm((prev) => ({ ...prev, startDate: "" }))}
                    aria-label="Hapus tanggal mulai"
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Due Date</Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={form.dueDate}
                  onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))}
                  placeholder="Tanpa due date"
                />
                {form.dueDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setForm((prev) => ({ ...prev, dueDate: "" }))}
                    aria-label="Hapus due date"
                  >
                    <X />
                  </Button>
                )}
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
        title={`Hapus project "${deleteTarget?.name}"?`}
        description="Project yang masih punya task tidak bisa dihapus."
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
