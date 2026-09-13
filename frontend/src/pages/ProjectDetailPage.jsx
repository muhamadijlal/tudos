import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { Combobox } from "@/components/Combobox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DatePicker } from "@/components/DatePicker";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { FormRequiredNote, RequiredMark } from "@/components/RequiredMark";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { api, ApiError, normalizeFieldErrors } from "@/lib/api";
import { baseEpicCode } from "@/lib/epicCode";
import { EPIC_COLOR_DOT, EPIC_COLOR_OPTIONS } from "@/lib/epicColor";
import { epicPeriodLabel } from "@/lib/epic";
import {
  formatDate,
  priorityLabel,
  PRIORITY_STYLES,
  STATUS_STYLES,
  statusLabel,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { collectErrors, validateRequired } from "@/lib/validation";
import { NotePencil, Paperclip, Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const RELATED_TASKS_LIMIT = 5;
const NOTES_PREVIEW_LIMIT = 5;

const EMPTY_EPIC_FORM = {
  name: "",
  description: "",
  startDate: "",
  dueDate: "",
  userId: "",
  color: "",
};

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function EpicProgressBar({ progress }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 shrink-0 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <span className="shrink-0 text-muted-foreground">
        {progress.done}/{progress.total}
      </span>
    </div>
  );
}

// Halaman penuh (bukan dialog popup lagi) buat detail 1 project — dibuka
// dari ProjectsPage & TimelinePage. Bukan menu utama, gak ada di nav.js.
export default function ProjectDetailPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [project, setProject] = useState(null);
  const [notes, setNotes] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [epicFormOpen, setEpicFormOpen] = useState(false);
  const [editingEpic, setEditingEpic] = useState(null);
  const [epicForm, setEpicForm] = useState(EMPTY_EPIC_FORM);
  const [epicFieldErrors, setEpicFieldErrors] = useState({});
  const [isSubmittingEpic, setIsSubmittingEpic] = useState(false);
  const [epicDeleteTarget, setEpicDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  function loadProject() {
    return api.get(`/projects/${projectId}`).then((res) => setProject(res.data));
  }

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/notes`),
      api.get("/users/assignable"),
    ])
      .then(([projectRes, notesRes, usersRes]) => {
        if (cancelled) return;
        setProject(projectRes.data);
        setNotes(notesRes.data);
        setUsers(usersRes.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat detail project.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const relatedTasks = project?.tasks?.slice(0, RELATED_TASKS_LIMIT) ?? [];
  const remainingCount = (project?.tasks?.length ?? 0) - relatedTasks.length;

  const notesPreview = notes.slice(0, NOTES_PREVIEW_LIMIT);
  const remainingNotesCount = notes.length - notesPreview.length;

  const isProjectOwner = project?.user?.id === currentUser?.id;
  const userOptions = [
    { value: "", label: "Tanpa owner" },
    ...users.map((u) => ({ value: String(u.id), label: u.name })),
  ];

  useBreadcrumb([
    { label: "Project", to: "/projects" },
    { label: isLoading ? "..." : (project?.name ?? "Project") },
  ]);

  function openCreateEpicForm() {
    setEditingEpic(null);
    setEpicForm(EMPTY_EPIC_FORM);
    setEpicFieldErrors({});
    setEpicFormOpen(true);
  }

  function openEditEpicForm(epic) {
    setEditingEpic(epic);
    setEpicForm({
      name: epic.name,
      description: epic.description ?? "",
      startDate: epic.startDate ? epic.startDate.slice(0, 10) : "",
      dueDate: epic.dueDate ? epic.dueDate.slice(0, 10) : "",
      userId: epic.user?.id ? String(epic.user.id) : "",
      color: epic.color,
    });
    setEpicFieldErrors({});
    setEpicFormOpen(true);
  }

  function validateEpic() {
    return collectErrors({ name: validateRequired(epicForm.name, "Nama epic") });
  }

  async function handleEpicSubmit(e) {
    e.preventDefault();
    const errors = validateEpic();
    setEpicFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      name: epicForm.name,
      description: epicForm.description,
      startDate: epicForm.startDate || null,
      dueDate: epicForm.dueDate || null,
      userId: epicForm.userId ? Number(epicForm.userId) : null,
      // Warna cuma dikirim pas edit — pas create selalu di-assign otomatis
      // round-robin di server (lihat epic.service.js#create).
      ...(editingEpic ? { color: epicForm.color } : {}),
    };

    setIsSubmittingEpic(true);
    try {
      if (editingEpic) {
        await api.put(`/epics/${editingEpic.id}`, payload);
      } else {
        await api.post(`/projects/${projectId}/epics`, payload);
      }
      setEpicFormOpen(false);
      await loadProject();
    } catch (err) {
      if (err instanceof ApiError && err.errors) setEpicFieldErrors(normalizeFieldErrors(err.errors));
      setFeedback({
        open: true,
        variant: "error",
        title: editingEpic ? "Gagal mengubah epic" : "Gagal membuat epic",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    } finally {
      setIsSubmittingEpic(false);
    }
  }

  async function handleEpicDelete() {
    try {
      await api.delete(`/epics/${epicDeleteTarget.id}`);
      await loadProject();
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
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? <Skeleton className="h-5 w-40" /> : (project?.name ?? "Project")}
          </CardTitle>
          <CardDescription>Detail project dan task-task terkait.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {error && <p className="text-xs text-destructive">{error}</p>}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="flex flex-col gap-3">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ) : (
            project && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <Field label="Deskripsi">
                    <p className="whitespace-pre-wrap">{project.description || "Tidak ada deskripsi."}</p>
                  </Field>

                  <Field label={`Epics (${(project.epics ?? []).length})`}>
                    {(project.epics ?? []).length === 0 ? (
                      <p className="text-muted-foreground">Belum ada epic di project ini.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {project.epics.map((epic) => (
                          <div
                            key={epic.id}
                            className="flex items-center gap-2 border border-border bg-muted/40 px-2 py-1.5"
                          >
                            <button
                              type="button"
                              onClick={() => navigate(`/projects/${projectId}/epics/${epic.id}`)}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <span
                                className={cn(
                                  "size-2 shrink-0 rounded-full",
                                  EPIC_COLOR_DOT[epic.color] ?? EPIC_COLOR_DOT.slate,
                                )}
                              />
                              <AssigneeAvatar id={epic.user?.id} name={epic.user?.name} size="xs" />
                              <CodeBadge className="shrink-0">{epic.code}</CodeBadge>
                              <span className="min-w-0 flex-1 truncate">{epic.name}</span>
                            </button>
                            <EpicProgressBar progress={epic.progress} />
                            <span className="shrink-0 text-muted-foreground">
                              {epicPeriodLabel(epic)}
                            </span>
                            {isProjectOwner && (
                              <div className="flex shrink-0 items-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditEpicForm(epic)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setEpicDeleteTarget(epic)}
                                >
                                  Hapus
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {isProjectOwner && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={openCreateEpicForm}
                      >
                        <Plus /> Epic Baru
                      </Button>
                    )}
                  </Field>

                  <Field label={`Task Terkait (${project.tasks.length})`}>
                    {relatedTasks.length === 0 ? (
                      <p className="text-muted-foreground">Belum ada task di project ini.</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {relatedTasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 border border-border bg-muted/40 px-2 py-1.5"
                          >
                            <AssigneeAvatarGroup assignees={task.assignees} size="xs" />
                            <CodeBadge className="shrink-0">{task.code}</CodeBadge>
                            <span className="min-w-0 flex-1 truncate">{task.name}</span>
                            {task.attachmentCount > 0 && (
                              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                            )}
                            <Badge className={PRIORITY_STYLES[task.priority]}>
                              {priorityLabel(task.priority)}
                            </Badge>
                            <Badge className={cn("border-transparent", STATUS_STYLES[task.status])}>
                              {statusLabel(task.status)}
                            </Badge>
                          </div>
                        ))}
                        {remainingCount > 0 && (
                          <p className="text-muted-foreground">+{remainingCount} task lainnya</p>
                        )}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto w-fit p-0"
                      onClick={() => navigate(`/tudos?projectId=${projectId}`)}
                    >
                      Lihat Semua di Tudos
                    </Button>
                  </Field>
                </div>

                <div className="flex flex-col gap-4">
                  <Field label="Dibuat Pada">
                    <p>{formatDate(project.createdAt)}</p>
                  </Field>

                  <Field label="Dibuat Oleh">
                    <div className="flex items-center gap-2">
                      <AssigneeAvatar id={project.user?.id} name={project.user?.name} />
                      <span>{project.user?.name ?? "-"}</span>
                    </div>
                  </Field>
                </div>
              </div>
            )
          )}

          {!isLoading && project && (
            <Field label={`Catatan (${notes.length})`}>
              {notesPreview.length === 0 ? (
                <p className="text-muted-foreground">Belum ada catatan buat project ini.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {notesPreview.map((note) => (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => navigate(`/projects/${projectId}/notes/${note.id}`)}
                      className="flex items-center gap-2 border border-border bg-muted/40 px-2 py-1.5 text-left hover:bg-muted"
                    >
                      <NotePencil className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{note.title}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatDate(note.updatedAt)}
                      </span>
                    </button>
                  ))}
                  {remainingNotesCount > 0 && (
                    <p className="text-muted-foreground">+{remainingNotesCount} catatan lainnya</p>
                  )}
                </div>
              )}
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto w-fit p-0"
                onClick={() => navigate(`/projects/${projectId}/notes`)}
              >
                Lihat Semua Catatan
              </Button>
            </Field>
          )}
        </CardContent>
      </Card>

      <Dialog open={epicFormOpen} onOpenChange={setEpicFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEpic ? "Edit Epic" : "Epic Baru"}</DialogTitle>
            <DialogDescription>
              {editingEpic ? "Ubah detail epic ini." : "Isi detail epic yang mau dibuat."}
            </DialogDescription>
            <FormRequiredNote />
          </DialogHeader>
          <form onSubmit={handleEpicSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epic-name">
                Nama
                <RequiredMark />
              </Label>
              <Input
                id="epic-name"
                aria-invalid={Boolean(epicFieldErrors.name)}
                value={epicForm.name}
                onChange={(e) => setEpicForm((prev) => ({ ...prev, name: e.target.value }))}
              />
              {epicFieldErrors.name && (
                <p className="text-xs text-destructive">{epicFieldErrors.name}</p>
              )}
              {!editingEpic && epicForm.name.trim() && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  Preview kode: <CodeBadge>{baseEpicCode(epicForm.name)}</CodeBadge>
                  <span>(bisa jadi {baseEpicCode(epicForm.name)}2, dst kalau kodenya udah kepake)</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epic-description">Deskripsi</Label>
              <Textarea
                id="epic-description"
                value={epicForm.description}
                onChange={(e) => setEpicForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Tanggal Mulai</Label>
                <DatePicker
                  value={epicForm.startDate}
                  onChange={(value) => setEpicForm((prev) => ({ ...prev, startDate: value }))}
                  placeholder="Tanpa tanggal mulai"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Due Date</Label>
                <DatePicker
                  value={epicForm.dueDate}
                  onChange={(value) => setEpicForm((prev) => ({ ...prev, dueDate: value }))}
                  placeholder="Tanpa due date"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Owner</Label>
              <Combobox
                options={userOptions}
                value={epicForm.userId}
                onValueChange={(value) => setEpicForm((prev) => ({ ...prev, userId: value }))}
                placeholder="Tanpa owner"
                searchPlaceholder="Cari user..."
                emptyText="User tidak ditemukan."
              />
            </div>
            {editingEpic && (
              <div className="flex flex-col gap-1.5">
                <Label>Warna</Label>
                <div className="flex flex-wrap gap-2">
                  {EPIC_COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEpicForm((prev) => ({ ...prev, color }))}
                      aria-label={color}
                      className={cn(
                        "size-6 rounded-full ring-offset-2 ring-offset-background transition-shadow",
                        EPIC_COLOR_DOT[color],
                        epicForm.color === color && "ring-2 ring-foreground",
                      )}
                    />
                  ))}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmittingEpic}>
                {isSubmittingEpic && <Spinner />}
                {isSubmittingEpic ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(epicDeleteTarget)}
        onOpenChange={(open) => !open && setEpicDeleteTarget(null)}
        title={`Hapus epic "${epicDeleteTarget?.name}"?`}
        description="Epic yang masih punya task tidak bisa dihapus."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleEpicDelete}
      />

      <FeedbackDialog
        open={feedback.open}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        variant={feedback.variant}
        title={feedback.title}
        description={feedback.description}
      />
    </div>
  );
}
