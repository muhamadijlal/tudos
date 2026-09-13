import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AttachmentsField } from "@/components/AttachmentsField";
import { CodeBadge } from "@/components/CodeBadge";
import { Combobox } from "@/components/Combobox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker, formatDateStr } from "@/components/DatePicker";
import { MultiCombobox } from "@/components/MultiCombobox";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import {
  describeStatusTransition,
  PRIORITY_OPTIONS,
  requiresApproveConfirm,
  requiresReviewNote,
  STATUS_OPTIONS,
  statusLabel,
} from "@/lib/task";
import { collectErrors, validateRequired } from "@/lib/validation";
import { useEffect, useState } from "react";

function todayStr() {
  return formatDateStr(new Date());
}

function emptyForm() {
  return {
    projectId: "",
    epicId: "",
    userIds: [],
    categoryId: "",
    name: "",
    description: "",
    priority: "medium",
    status: "todo",
    reviewNote: "",
    startDate: todayStr(),
    dueDate: todayStr(),
    reportDate: todayStr(),
  };
}

// Dipakai bareng dari TudosPage & KanbanPage — create (task=null) atau edit (task terisi).
export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  projects,
  epics,
  users,
  categories,
  canAssignOthers,
  currentUser,
  onSaved,
  onError,
}) {
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFiles, setNewFiles] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);

  // Ditaruh di dalem komponen (bukan module-level) biar bisa nangkep
  // currentUser lewat closure — dipakai buat nandain diri sendiri "(Kamu)"
  // di opsi assignee.
  function renderAssigneeOption(option) {
    const isSelf = String(option.value) === String(currentUser?.id);
    return (
      <span className="flex items-center gap-2">
        <AssigneeAvatar id={option.value} name={option.label} size="xs" />
        {option.label}
        {isSelf && " (Kamu)"}
      </span>
    );
  }

  useEffect(() => {
    if (!open) return;

    if (task) {
      setForm({
        projectId: String(task.project?.id ?? ""),
        epicId: String(task.epic?.id ?? ""),
        userIds: (task.assignees ?? []).map((a) => String(a.id)),
        categoryId: String(task.category?.id ?? ""),
        name: task.name,
        description: task.description ?? "",
        priority: task.priority,
        status: task.status,
        reviewNote: "",
        startDate: task.startDate ? task.startDate.slice(0, 10) : todayStr(),
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : todayStr(),
        reportDate: task.reportDate ? task.reportDate.slice(0, 10) : todayStr(),
      });
    } else {
      setForm({
        ...emptyForm(),
        userIds: canAssignOthers ? [] : [String(currentUser?.id ?? "")],
      });
    }
    setFieldErrors({});
    setNewFiles([]);
    setExistingAttachments(task?.attachments ?? []);
  }, [open, task, canAssignOthers, currentUser]);

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }));
  const selectedProject = projects.find((p) => String(p.id) === form.projectId);
  const epicOptions = (epics ?? [])
    .filter((e) => String(e.projectId) === form.projectId)
    .map((e) => ({ value: String(e.id), label: e.name }));
  const selectedEpic = (epics ?? []).find((e) => String(e.id) === form.epicId);
  const userOptions = users.map((u) => ({ value: String(u.id), label: u.name }));
  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

  // Owner project boleh assign ke siapa aja di project-nya sendiri, meski
  // gak punya permission tasks.assignOthers secara global (ala Jira: project
  // lead biasa juga bisa assign tanpa role khusus).
  const isProjectOwner = selectedProject?.user?.id === currentUser?.id;
  const effectiveCanAssignOthers = canAssignOthers || isProjectOwner;

  // Task lagi In Review terus mau dipindahin ke Todo/In Progress lewat form
  // ini (bukan lewat Combobox status di tabel) — catatannya tetep wajib,
  // sama kayak ReviewNoteDialog di TudosPage/KanbanPage/ReviewPendingPage.
  const needsReviewNote = task && requiresReviewNote(task.status, form.status);

  function validate() {
    return collectErrors({
      projectId: validateRequired(form.projectId, "Project"),
      epicId: validateRequired(form.epicId, "Epic"),
      userIds: form.userIds.length === 0 ? "Assignee wajib diisi" : null,
      categoryId: validateRequired(form.categoryId, "Kategori"),
      name: validateRequired(form.name, "Nama task"),
      dueDate:
        form.startDate && form.dueDate && form.dueDate < form.startDate
          ? "Due date tidak boleh sebelum tanggal mulai"
          : null,
      reportDate: validateRequired(form.reportDate, "Tanggal Laporan"),
      reviewNote: needsReviewNote && !form.reviewNote.trim() ? "Catatan wajib diisi" : null,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Approve final (In Review -> Done) gak wajib catatan, tapi tetep
    // dikonfirm ringan dulu sebelum beneran ke-submit — konsisten sama
    // ReviewNoteDialog di TudosPage/KanbanPage/ReviewPendingPage yang juga
    // nahan transisi ini sebelum PUT-nya jalan.
    if (task && requiresApproveConfirm(task.status, form.status)) {
      setApproveConfirmOpen(true);
      return;
    }

    performSubmit();
  }

  async function performSubmit() {
    const payload = new FormData();
    payload.append("epicId", form.epicId);
    for (const userId of form.userIds) payload.append("userIds", userId);
    payload.append("categoryId", form.categoryId);
    payload.append("name", form.name);
    if (form.description) payload.append("description", form.description);
    payload.append("priority", form.priority);
    payload.append("status", form.status);
    if (form.reviewNote.trim()) payload.append("reviewNote", form.reviewNote.trim());
    if (form.startDate) payload.append("startDate", form.startDate);
    if (form.dueDate) payload.append("dueDate", form.dueDate);
    payload.append("reportDate", form.reportDate);
    for (const file of newFiles) payload.append("attachments", file);

    setIsSubmitting(true);
    try {
      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
      } else {
        await api.post("/tasks", payload);
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setFieldErrors(normalizeFieldErrors(err.errors));
      onError?.(err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveExistingAttachment(attachmentId) {
    if (!task) return;
    try {
      await api.delete(`/tasks/${task.id}/attachments/${attachmentId}`);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      onError?.(err instanceof ApiError ? err.message : "Gagal menghapus lampiran.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Task Baru"}</DialogTitle>
          <DialogDescription>
            {task ? "Ubah detail task ini." : "Isi detail task yang mau dibuat."}
          </DialogDescription>
          <FormRequiredNote />
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-name">
              Nama
              <RequiredMark />
            </Label>
            <Input
              id="task-name"
              aria-invalid={Boolean(fieldErrors.name)}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">Deskripsi</Label>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                Project
                <RequiredMark />
              </Label>
              <Combobox
                options={projectOptions}
                value={form.projectId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, projectId: value, epicId: "" }))
                }
                placeholder="Pilih project"
                searchPlaceholder="Cari project..."
                emptyText="Project tidak ditemukan."
                ariaInvalid={Boolean(fieldErrors.projectId)}
              />
              {fieldErrors.projectId && (
                <p className="text-xs text-destructive">{fieldErrors.projectId}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Epic
                <RequiredMark />
              </Label>
              <Combobox
                options={epicOptions}
                value={form.epicId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, epicId: value }))}
                placeholder={form.projectId ? "Pilih epic" : "Pilih project dulu"}
                searchPlaceholder="Cari epic..."
                emptyText="Epic tidak ditemukan."
                disabled={!form.projectId}
                ariaInvalid={Boolean(fieldErrors.epicId)}
              />
              {fieldErrors.epicId && (
                <p className="text-xs text-destructive">{fieldErrors.epicId}</p>
              )}
              {!task && selectedEpic && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  Preview kode: <CodeBadge>{selectedEpic.nextTaskCode}</CodeBadge>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Assignee
                <RequiredMark />
              </Label>
              {effectiveCanAssignOthers ? (
                <>
                  <MultiCombobox
                    options={userOptions}
                    values={form.userIds}
                    onValuesChange={(values) => setForm((prev) => ({ ...prev, userIds: values }))}
                    placeholder="Pilih user"
                    searchPlaceholder="Cari user..."
                    emptyText="User tidak ditemukan."
                    renderOption={renderAssigneeOption}
                    renderValue={renderAssigneeOption}
                  />
                  {fieldErrors.userIds && (
                    <p className="text-xs text-destructive">{fieldErrors.userIds}</p>
                  )}
                </>
              ) : (
                <p className="flex h-8 items-center text-xs text-muted-foreground">
                  Kamu ({currentUser?.name})
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                Kategori
                <RequiredMark />
              </Label>
              <Combobox
                options={categoryOptions}
                value={form.categoryId}
                onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}
                placeholder="Pilih kategori"
                searchPlaceholder="Cari kategori..."
                emptyText="Kategori tidak ditemukan."
                ariaInvalid={Boolean(fieldErrors.categoryId)}
              />
              {fieldErrors.categoryId && (
                <p className="text-xs text-destructive">{fieldErrors.categoryId}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Prioritas</Label>
              <Combobox
                options={PRIORITY_OPTIONS}
                value={form.priority}
                onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}
                searchPlaceholder="Cari prioritas..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Combobox
                options={STATUS_OPTIONS}
                value={form.status}
                onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                searchPlaceholder="Cari status..."
              />
            </div>
          </div>

          {needsReviewNote && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-review-note">
                Catatan Perubahan Status
                <RequiredMark />
              </Label>
              <Textarea
                id="task-review-note"
                aria-invalid={Boolean(fieldErrors.reviewNote)}
                value={form.reviewNote}
                onChange={(e) => setForm((prev) => ({ ...prev, reviewNote: e.target.value }))}
                placeholder={`${describeStatusTransition(task.status, form.status)} ${statusLabel(task.status)}...`}
              />
              {fieldErrors.reviewNote && (
                <p className="text-xs text-destructive">{fieldErrors.reviewNote}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>
              Tanggal Laporan
              <RequiredMark />
            </Label>
            <DatePicker
              value={form.reportDate}
              onChange={(value) => setForm((prev) => ({ ...prev, reportDate: value }))}
            />
            <p className="text-xs text-muted-foreground">
              Tanggal task ini dianggap dikerjakan (dipakai buat export Daily Activity) — bebas
              diubah ke tanggal lampau kalau mau nyatet retroaktif.
            </p>
            {fieldErrors.reportDate && (
              <p className="text-xs text-destructive">{fieldErrors.reportDate}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal Mulai</Label>
              <DatePicker
                value={form.startDate}
                onChange={(value) => setForm((prev) => ({ ...prev, startDate: value }))}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Due Date</Label>
              <DatePicker
                value={form.dueDate}
                onChange={(value) => setForm((prev) => ({ ...prev, dueDate: value }))}
              />
              {fieldErrors.dueDate && (
                <p className="text-xs text-destructive">{fieldErrors.dueDate}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>File atau Gambar Pendukung</Label>
            <AttachmentsField
              files={newFiles}
              existing={existingAttachments}
              onFilesAdd={(picked) => setNewFiles((prev) => [...prev, ...picked])}
              onFileRemove={(index) => setNewFiles((prev) => prev.filter((_, i) => i !== index))}
              onExistingRemove={handleRemoveExistingAttachment}
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        open={approveConfirmOpen}
        onOpenChange={setApproveConfirmOpen}
        title="Setujui task ini?"
        description="Task bakal ditandai selesai (Done) dan semua assignee bakal dapet notifikasi."
        confirmLabel="Setujui"
        onConfirm={performSubmit}
      />
    </Dialog>
  );
}
