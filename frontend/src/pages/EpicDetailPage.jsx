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
import {
  formatDate,
  priorityLabel,
  PRIORITY_STYLES,
  STATUS_STYLES,
  statusLabel,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { ArrowLeft, Paperclip } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const RELATED_TASKS_LIMIT = 10;

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

// Halaman penuh (bukan dialog) buat detail 1 epic — dibuka dari section
// "Epics" di ProjectDetailPage & baris Epic di TimelinePage. Bukan menu
// utama, gak ada di nav.js.
export default function EpicDetailPage() {
  const { id: projectId, epicId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [epic, setEpic] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api
      .get(`/epics/${epicId}`)
      .then((res) => {
        if (!cancelled) setEpic(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat detail epic.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [epicId]);

  const relatedTasks = epic?.tasks?.slice(0, RELATED_TASKS_LIMIT) ?? [];
  const remainingCount = (epic?.tasks?.length ?? 0) - relatedTasks.length;
  const isProjectOwner = epic?.project?.user?.id === currentUser?.id;

  useBreadcrumb([
    { label: "Project", to: "/projects" },
    { label: isLoading ? "..." : (epic?.project?.name ?? "Project"), to: `/projects/${projectId}` },
    { label: isLoading ? "..." : (epic?.name ?? "Epic") },
  ]);

  async function handleDelete() {
    try {
      await api.delete(`/epics/${epicId}`);
      navigate(`/projects/${projectId}`);
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/projects/${projectId}`)}
      >
        <ArrowLeft /> Kembali ke Project
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <span className="flex items-center gap-2">
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      EPIC_COLOR_DOT[epic?.color] ?? EPIC_COLOR_DOT.slate,
                    )}
                  />
                  <CodeBadge>{epic?.code}</CodeBadge>
                  {epic?.name ?? "Epic"}
                </span>
              )}
            </CardTitle>
            <CardDescription>Detail epic dan task-task terkait.</CardDescription>
          </div>
          {!isLoading && epic && isProjectOwner && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                Hapus
              </Button>
            </div>
          )}
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
            epic && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <Field label="Deskripsi">
                    <p className="whitespace-pre-wrap">{epic.description || "Tidak ada deskripsi."}</p>
                  </Field>

                  <Field label="Progress">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-32 shrink-0 rounded-full bg-muted">
                        <div
                          className="h-1.5 rounded-full bg-primary"
                          style={{ width: `${epic.progress.percent}%` }}
                        />
                      </div>
                      <span className="text-muted-foreground">
                        {epic.progress.done}/{epic.progress.total} task selesai (
                        {epic.progress.percent}%)
                      </span>
                    </div>
                  </Field>
                </div>

                <div className="flex flex-col gap-4">
                  <Field label="Project">
                    <p>{epic.project?.name ?? "-"}</p>
                  </Field>

                  <Field label="Owner">
                    <div className="flex items-center gap-2">
                      <AssigneeAvatar id={epic.user?.id} name={epic.user?.name} />
                      <span>{epic.user?.name ?? "-"}</span>
                    </div>
                  </Field>

                  <Field label="Due Date">
                    <p>{epic.dueDate ? formatDate(epic.dueDate) : "Tanpa due date"}</p>
                  </Field>

                  <Field label="Dibuat Pada">
                    <p>{formatDate(epic.createdAt)}</p>
                  </Field>
                </div>
              </div>
            )
          )}

          {!isLoading && epic && (
            <Field label={`Task Terkait (${epic.tasks.length})`}>
              {relatedTasks.length === 0 ? (
                <p className="text-muted-foreground">Belum ada task di epic ini.</p>
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
                onClick={() => navigate(`/tudos?epicId=${epicId}`)}
              >
                Lihat Semua di Tudos
              </Button>
            </Field>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Hapus epic "${epic?.name}"?`}
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
    </div>
  );
}
