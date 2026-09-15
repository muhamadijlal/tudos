import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { CodeBadge } from "@/components/CodeBadge";
import { Combobox } from "@/components/Combobox";
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
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { epicPeriodLabel } from "@/lib/epic";
import { EPIC_COLOR_DOT, EPIC_COLOR_OPTIONS } from "@/lib/epicColor";
import { filenamePeriodSuffix } from "@/lib/export";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { collectErrors, validateRequired } from "@/lib/validation";
import { MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";

const ALL = "all";
const EMPTY_FORM = {
  projectId: "",
  name: "",
  description: "",
  startDate: "",
  dueDate: "",
  userId: "",
  color: "",
};

// "Milik Saya": aku owner project-nya (epic gak punya owner sendiri buat
// otorisasi — authority-nya tetap project.userId, sama kayak Task) — sama
// persis pola filter di ProjectManagementPage.
const OWNERSHIP_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "mine", label: "Milik Saya" },
];

function EpicProgressBar({ progress }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 shrink-0 rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress.percent}%` }} />
      </div>
      <span className="shrink-0 text-muted-foreground">
        {progress.done}/{progress.total}
      </span>
    </div>
  );
}

// List flat semua Epic lintas project (bukan endpoint baru — diturunkan dari
// /projects yang udah nyertain epics-nya masing², sama pola kayak epics
// derivation di Kanban/Tudos, biar gak perlu GET /epics flat).
export default function EpicManagementPage() {
  const { user } = useAuth();
  const canAssignOwner = hasPermission(user, "epics.assignOwner");
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const [search, setSearch] = useState("");
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState(ALL);

  const epics = useMemo(
    () => projects.flatMap((p) => (p.epics ?? []).map((e) => ({ ...e, project: p }))),
    [projects],
  );

  // Cuma project yang dimiliki sendiri yang bisa ditambahin epic baru — coba
  // create di project orang lain bakal 403 di server (assertIsOwner).
  const ownedProjects = useMemo(() => projects.filter((p) => p.user?.id === user?.id), [projects, user]);

  const projectFilterOptions = [
    { value: ALL, label: "Semua Project" },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];
  const projectOptions = ownedProjects.map((p) => ({ value: String(p.id), label: p.name }));
  const userOptions = [
    { value: "", label: "Tanpa owner" },
    ...users.map((u) => ({ value: String(u.id), label: u.fullName || u.name })),
  ];

  function renderOwnerOption(option) {
    if (option.value === "") return option.label;
    const isSelf = String(option.value) === String(user?.id);
    return (
      <span className="flex items-center gap-2">
        <AssigneeAvatar id={option.value} name={option.label} size="xs" />
        {option.label}
        {isSelf && " (Kamu)"}
      </span>
    );
  }

  const filteredEpics = useMemo(() => {
    const query = search.trim().toLowerCase();
    return epics.filter((e) => {
      if (query && !e.name.toLowerCase().includes(query)) return false;
      if (projectFilter !== ALL && String(e.projectId) !== projectFilter) return false;
      if (ownershipFilter === "mine" && e.project.user?.id !== user?.id) return false;
      return true;
    });
  }, [epics, search, projectFilter, ownershipFilter, user]);

  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(filteredEpics);

  const exportColumns = useMemo(
    () => [
      { key: "code", label: "Kode", width: 12 },
      { key: "name", label: "Nama", width: 26 },
      { key: "project", label: "Project", width: 22 },
      { key: "owner", label: "Owner", width: 20 },
      { key: "period", label: "Periode", width: 24 },
      { key: "progress", label: "Progress", width: 12 },
      { key: "taskCount", label: "Jumlah Task", width: 12 },
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      filteredEpics.map((epic) => ({
        code: epic.code,
        name: epic.name,
        project: epic.project.name,
        owner: epic.user?.name ?? "-",
        period: epicPeriodLabel(epic),
        progress: `${epic.progress.percent}%`,
        taskCount: epic.progress.total,
      })),
    [filteredEpics],
  );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [projectsRes, usersRes] = await Promise.all([
        api.get("/projects"),
        api.get("/users/assignable"),
      ]);
      setProjects(projectsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat epic");
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateForm() {
    setEditingEpic(null);
    setForm({
      ...EMPTY_FORM,
      userId: canAssignOwner ? "" : String(user?.id ?? ""),
    });
    setFieldErrors({});
    setFormOpen(true);
  }

  function openEditForm(epic) {
    setEditingEpic(epic);
    setForm({
      projectId: String(epic.projectId),
      name: epic.name,
      description: epic.description ?? "",
      startDate: epic.startDate ? epic.startDate.slice(0, 10) : "",
      dueDate: epic.dueDate ? epic.dueDate.slice(0, 10) : "",
      userId: epic.user?.id ? String(epic.user.id) : "",
      color: epic.color,
    });
    setFieldErrors({});
    setFormOpen(true);
  }

  function validate() {
    return collectErrors({
      projectId: !editingEpic ? validateRequired(form.projectId, "Project") : null,
      name: validateRequired(form.name, "Nama epic"),
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      name: form.name,
      description: form.description,
      startDate: form.startDate || null,
      dueDate: form.dueDate || null,
      userId: form.userId ? Number(form.userId) : null,
      // Warna cuma dikirim pas edit — pas create selalu di-assign otomatis
      // round-robin di server (lihat epic.service.js#create).
      ...(editingEpic ? { color: form.color } : {}),
    };

    setIsSubmitting(true);
    try {
      if (editingEpic) {
        await api.put(`/epics/${editingEpic.id}`, payload);
      } else {
        await api.post(`/projects/${form.projectId}/epics`, payload);
      }
      setFormOpen(false);
      await loadData();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: editingEpic ? "Gagal mengubah epic" : "Gagal membuat epic",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      await api.delete(`/epics/${deleteTarget.id}`);
      await loadData();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus epic",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Management Epic</CardTitle>
          <CardDescription>Kelola semua epic lintas project — buat, ubah, hapus.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons
            title="Management Epic"
            columns={exportColumns}
            rows={exportRows}
            period={filenamePeriodSuffix()}
            onError={(message) =>
              setFeedback({ open: true, variant: "error", title: "Gagal export", description: message })
            }
          />
          <Button size="sm" onClick={openCreateForm}>
            <Plus /> Epic Baru
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && <p className="text-xs text-destructive">{error}</p>}

        {!isLoading && epics.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <InputGroup className="max-w-sm">
              <InputGroupAddon>
                <MagnifyingGlass />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Cari epic (nama)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>

            <Combobox
              options={projectFilterOptions}
              value={projectFilter}
              onValueChange={setProjectFilter}
              searchPlaceholder="Cari project..."
              size="sm"
              className="w-44"
            />

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

        {!isLoading && epics.length === 0 ? (
          <p className="text-xs text-muted-foreground">Belum ada epic.</p>
        ) : !isLoading && filteredEpics.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Gak ada epic yang cocok dengan pencarian/filter ini.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="hidden sm:table-cell">Project</TableHead>
                <TableHead className="hidden md:table-cell">Owner</TableHead>
                <TableHead className="hidden lg:table-cell">Periode</TableHead>
                <TableHead className="hidden sm:table-cell">Progress</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={8} />
              ) : (
                pageItems.map((epic) => (
                  <TableRow key={epic.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "block size-2.5 rounded-full",
                          EPIC_COLOR_DOT[epic.color] ?? EPIC_COLOR_DOT.slate,
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <CodeBadge>{epic.code}</CodeBadge>
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate font-medium sm:max-w-xs">
                      {epic.name}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {epic.project.name}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {epic.user?.name ?? "-"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {epicPeriodLabel(epic)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <EpicProgressBar progress={epic.progress} />
                    </TableCell>
                    <TableCell className="text-right">
                      {epic.project.user?.id === user?.id ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditForm(epic)}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(epic)}
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

        {!isLoading && epics.length > 0 && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalItems={filteredEpics.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            itemLabel="epic"
          />
        )}
      </CardContent>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEpic ? "Edit Epic" : "Epic Baru"}</DialogTitle>
            <DialogDescription>
              {editingEpic ? "Ubah detail epic ini." : "Isi detail epic yang mau dibuat."}
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {!editingEpic && (
              <div className="flex flex-col gap-1.5">
                <Label>
                  Project
                  <RequiredMark />
                </Label>
                <Combobox
                  options={projectOptions}
                  value={form.projectId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, projectId: value }))}
                  placeholder="Pilih project"
                  searchPlaceholder="Cari project..."
                  emptyText="Kamu belum punya project sendiri."
                  ariaInvalid={Boolean(fieldErrors.projectId)}
                />
                {fieldErrors.projectId && (
                  <p className="text-xs text-destructive">{fieldErrors.projectId}</p>
                )}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epic-name">
                Nama
                <RequiredMark />
              </Label>
              <Input
                id="epic-name"
                aria-invalid={Boolean(fieldErrors.name)}
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epic-description">Deskripsi</Label>
              <Textarea
                id="epic-description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Tanggal Mulai</Label>
                <DatePicker
                  value={form.startDate}
                  onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
                  placeholder="Tanpa tanggal mulai"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Due Date</Label>
                <DatePicker
                  value={form.dueDate}
                  onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))}
                  placeholder="Tanpa due date"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Owner</Label>
              {canAssignOwner ? (
                <Combobox
                  options={userOptions}
                  value={form.userId}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, userId: value }))}
                  placeholder="Tanpa owner"
                  searchPlaceholder="Cari user..."
                  emptyText="User tidak ditemukan."
                  renderOption={renderOwnerOption}
                  renderValue={renderOwnerOption}
                />
              ) : (
                <p className="flex h-8 items-center gap-2 text-xs text-muted-foreground">
                  <AssigneeAvatar id={user?.id} name={user?.fullName || user?.name} size="xs" />
                  {user?.fullName || user?.name} (Kamu)
                </p>
              )}
            </div>
            {editingEpic && (
              <div className="flex flex-col gap-1.5">
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {EPIC_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, color }))}
                      aria-label={color}
                      className={cn(
                        "size-6 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                        EPIC_COLOR_DOT[color],
                        form.color === color && "ring-2 ring-foreground",
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
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
        title={`Hapus epic "${deleteTarget?.name}"?`}
        description="Epic yang masih punya task tidak bisa dihapus."
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
