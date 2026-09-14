import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { api, ApiError } from "@/lib/api";
import { EPIC_COLOR_DOT } from "@/lib/epicColor";
import { epicPeriodLabel } from "@/lib/epic";
import {
  formatDate,
  priorityLabel,
  PRIORITY_STYLES,
  STATUS_STYLES,
  statusLabel,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { NotePencil, Paperclip } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const RELATED_TASKS_LIMIT = 5;
const NOTES_PREVIEW_LIMIT = 5;

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
    ])
      .then(([projectRes, notesRes]) => {
        if (cancelled) return;
        setProject(projectRes.data);
        setNotes(notesRes.data);
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

  useBreadcrumb([
    { label: "Project", to: "/projects" },
    { label: isLoading ? "..." : (project?.name ?? "Project") },
  ]);

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
