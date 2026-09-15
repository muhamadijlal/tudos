import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { Combobox } from "@/components/Combobox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportButtons } from "@/components/ExportButtons";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { ReviewNoteDialog } from "@/components/ReviewNoteDialog";
import { TablePagination } from "@/components/TablePagination";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
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
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { usePagination } from "@/hooks/use-pagination";
import { api, ApiError } from "@/lib/api";
import { filenamePeriodSuffix } from "@/lib/export";
import {
  formatDate,
  requiresApproveConfirm,
  requiresReviewNote,
  statusLabel,
  STATUS_OPTIONS,
  STATUS_STYLES,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Daftar lengkap task berstatus "In Review" di project milik user ini —
// dibuka dari widget "Perlu Direview" di Dashboard (yang cuma nampilin
// sebagian). Backend (`GET /tasks/review-pending`) yang scoping ke project
// milik sendiri, jadi di sini tinggal ditampilin. Bukan menu utama, gak ada
// di nav.js.
export default function ReviewPendingPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailTask, setDetailTask] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const [reviewPrompt, setReviewPrompt] = useState(null);
  const [approveConfirmTaskId, setApproveConfirmTaskId] = useState(null);

  useBreadcrumb([{ label: "Dashboard", to: "/dashboard" }, { label: "Perlu Direview" }]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api
      .get("/tasks/review-pending")
      .then((res) => {
        if (!cancelled) setTasks(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Gagal memuat task");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(tasks);

  const exportColumns = useMemo(
    () => [
      { key: "code", label: "Kode", width: 14 },
      { key: "name", label: "Task", width: 30 },
      { key: "project", label: "Project", width: 20 },
      { key: "assignee", label: "Assignee", width: 24 },
      { key: "status", label: "Status", width: 14 },
      { key: "updatedAt", label: "Terakhir Diubah", width: 16 },
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      tasks.map((task) => ({
        code: task.code ?? "-",
        name: task.name,
        project: task.project?.name ?? "-",
        assignee: (task.assignees ?? []).map((a) => a.name).join(", ") || "-",
        status: statusLabel(task.status),
        updatedAt: formatDate(task.updatedAt),
      })),
    [tasks],
  );

  // Ganti status langsung dari sini (ala kolom Status di Tudos) — task-nya
  // ilang dari list begitu statusnya bukan "in_review" lagi, soalnya halaman
  // ini scoped khusus buat task yang lagi ditunggu direview. Owner project
  // (satu-satunya audience halaman ini) boleh set status apa aja, jadi gak
  // perlu guard tambahan di sisi UI.
  // Sengaja selalu throw waktu gagal (setelah nampilin feedback & revert
  // optimistic update) — biar ReviewNoteDialog (lihat requestStatusChange)
  // tau gagal dan gak nutup dialognya sendiri, biar user bisa coba lagi.
  async function applyStatusChange(taskId, status, reviewNote) {
    const previous = tasks;
    setTasks((prev) =>
      status === "in_review"
        ? prev.map((t) => (t.id === taskId ? { ...t, status } : t))
        : prev.filter((t) => t.id !== taskId),
    );
    try {
      await api.put(`/tasks/${taskId}`, { status, reviewNote });
    } catch (err) {
      setTasks(previous);
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal mengubah status",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
      throw err;
    }
  }

  // Dikembalikan dari In Review ke Todo/In Progress wajib disertai catatan —
  // munculin ReviewNoteDialog dulu, baru kirim PUT-nya kalau udah diisi.
  function requestStatusChange(task, status) {
    if (requiresReviewNote(task.status, status)) {
      setReviewPrompt({ taskId: task.id, fromStatus: task.status, toStatus: status });
    } else if (requiresApproveConfirm(task.status, status)) {
      setApproveConfirmTaskId(task.id);
    } else {
      applyStatusChange(task.id, status).catch(() => {});
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => navigate(-1)}>
        <ArrowLeft /> Kembali
      </Button>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Perlu Direview</CardTitle>
            <CardDescription>
              Semua task berstatus In Review di project yang kamu miliki, diurutkan dari yang paling
              baru diajukan.
            </CardDescription>
          </div>
          <ExportButtons
            title="Perlu Direview"
            columns={exportColumns}
            rows={exportRows}
            period={filenamePeriodSuffix()}
            onError={(message) =>
              setFeedback({ open: true, variant: "error", title: "Gagal export", description: message })
            }
          />
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
          {!isLoading && tasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Gak ada task yang perlu direview.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Kode</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead className="hidden sm:table-cell">Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Terakhir Diubah</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows columns={7} />
                ) : (
                  pageItems.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="hidden sm:table-cell">
                        <CodeBadge>{task.code}</CodeBadge>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate font-medium sm:max-w-xs">
                        {task.name}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {task.project?.name ?? "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <AssigneeAvatarGroup assignees={task.assignees} size="xs" />
                      </TableCell>
                      <TableCell>
                        <Combobox
                          options={STATUS_OPTIONS}
                          value={task.status}
                          onValueChange={(value) => requestStatusChange(task, value)}
                          searchPlaceholder="Cari status..."
                          size="sm"
                          className={cn("w-24 sm:w-32 border-transparent", STATUS_STYLES[task.status])}
                        />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {formatDate(task.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setDetailTask(task)}>
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {!isLoading && tasks.length > 0 && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalItems={tasks.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="task"
            />
          )}
        </CardContent>
      </Card>

      <TaskDetailSheet
        open={Boolean(detailTask)}
        onOpenChange={(open) => !open && setDetailTask(null)}
        task={detailTask}
      />

      <FeedbackDialog
        open={feedback.open}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
        variant={feedback.variant}
        title={feedback.title}
        description={feedback.description}
      />

      <ReviewNoteDialog
        open={Boolean(reviewPrompt)}
        onOpenChange={(open) => !open && setReviewPrompt(null)}
        fromStatus={reviewPrompt?.fromStatus}
        toStatus={reviewPrompt?.toStatus}
        onSubmit={(note) => applyStatusChange(reviewPrompt.taskId, reviewPrompt.toStatus, note)}
      />

      <ConfirmDialog
        open={Boolean(approveConfirmTaskId)}
        onOpenChange={(open) => !open && setApproveConfirmTaskId(null)}
        title="Setujui task ini?"
        description="Task bakal ditandai selesai (Done) dan semua assignee bakal dapet notifikasi."
        confirmLabel="Setujui"
        onConfirm={() => applyStatusChange(approveConfirmTaskId, "done").catch(() => {})}
      />
    </div>
  );
}
