import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { DueDateBadge } from "@/components/DueDateBadge";
import { ExportButtons } from "@/components/ExportButtons";
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
import { DUE_SOON_DAYS, formatDate, getDueStatus } from "@/lib/task";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Daftar lengkap task yang deadline-nya mendekat/lewat — dibuka dari widget
// "Deadline Mendekat" di Dashboard (yang cuma nampilin sebagian biar UI-nya
// gak kepanjangan). Bukan menu utama, gak ada di nav.js.
export default function DeadlinesPage() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailTask, setDetailTask] = useState(null);

  useBreadcrumb([{ label: "Dashboard", to: "/dashboard" }, { label: "Deadline Mendekat" }]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    api
      .get("/tasks")
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

  const deadlineTasks = useMemo(() => {
    return tasks
      .filter((t) => getDueStatus(t))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks]);

  const { page, pageSize, pageItems, setPage, setPageSize } = usePagination(deadlineTasks);

  const exportColumns = useMemo(
    () => [
      { key: "code", label: "Kode", width: 14 },
      { key: "name", label: "Task", width: 30 },
      { key: "project", label: "Project", width: 20 },
      { key: "assignee", label: "Assignee", width: 24 },
      { key: "dueDate", label: "Due Date", width: 14 },
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      deadlineTasks.map((task) => ({
        code: task.code ?? "-",
        name: task.name,
        project: task.project?.name ?? "-",
        assignee: (task.assignees ?? []).map((a) => a.name).join(", ") || "-",
        dueDate: task.dueDate ? formatDate(task.dueDate) : "-",
      })),
    [deadlineTasks],
  );

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => navigate(-1)}>
        <ArrowLeft /> Kembali
      </Button>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Deadline Mendekat</CardTitle>
            <CardDescription>
              Semua task yang due date-nya udah lewat atau kurang dari {DUE_SOON_DAYS} hari lagi,
              diurutkan dari yang paling mendesak.
            </CardDescription>
          </div>
          <ExportButtons
            title="Deadline Mendekat"
            columns={exportColumns}
            rows={exportRows}
            period={filenamePeriodSuffix()}
            onError={(message) => setError(message)}
          />
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
          {!isLoading && deadlineTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">Gak ada task yang deadline-nya mendekat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden sm:table-cell">Kode</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead className="hidden md:table-cell">Project</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows columns={6} />
                ) : (
                  pageItems.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="hidden sm:table-cell">
                        <CodeBadge>{task.code}</CodeBadge>
                      </TableCell>
                      <TableCell className="font-medium">{task.name}</TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {task.project?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <AssigneeAvatarGroup assignees={task.assignees} size="xs" />
                      </TableCell>
                      <TableCell>
                        <DueDateBadge task={task} />
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

          {!isLoading && deadlineTasks.length > 0 && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalItems={deadlineTasks.length}
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
    </div>
  );
}
