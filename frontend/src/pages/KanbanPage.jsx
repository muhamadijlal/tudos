import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DueDateBadge } from "@/components/DueDateBadge";
import { EpicBadge } from "@/components/EpicBadge";
import { ExportButtons } from "@/components/ExportButtons";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { MultiCombobox } from "@/components/MultiCombobox";
import { ReviewNoteDialog } from "@/components/ReviewNoteDialog";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { EPIC_COLOR_DOT } from "@/lib/epicColor";
import { filenamePeriodSuffix } from "@/lib/export";
import { hasPermission } from "@/lib/permissions";
import {
  formatDate,
  PRIORITY_OPTIONS,
  PRIORITY_STYLES,
  priorityLabel,
  requiresApproveConfirm,
  requiresReviewNote,
  STATUS_DOT,
  STATUS_OPTIONS,
  statusLabel,
  todayDateStr,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { FunnelSimple, Info, Plus } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Batasin jumlah kartu yang di-render per kolom sekaligus — kalau ada
// ratusan task di 1 status, gak semuanya langsung di-mount ke DOM. Sisanya
// nongol lewat tombol "Muat Lebih Banyak" per kolom.
const PAGE_SIZE = 20;

// Quick filter (project/assignee/kategori) disimpen di URL query string ala
// board Jira — jadi board bisa di-share/reload tanpa kehilangan filter yang
// lagi dipilih. Array kosong = "semua" (gak nyaring apa-apa).
function parseIdsParam(searchParams, key) {
  const raw = searchParams.get(key);
  return raw ? raw.split(",").filter(Boolean) : [];
}

// Default filter periode dikunci ke hari ini — kalau param-nya belum ada di
// URL sama sekali (kunjungan baru), pakai hari ini. User yang sengaja milih
// "Semua Tanggal" nyimpen pilihannya sebagai literal "all" di URL (bukan
// cuma dihapus), biar reload/share link gak diam-diam balik ke hari ini.
function parseDateParam(searchParams, key) {
  const raw = searchParams.get(key);
  if (raw === null) return todayDateStr();
  if (raw === "all") return "";
  return raw;
}

// Task yang butuh perhatian meski due date-nya di luar periode: belum
// dikerjakan (status todo) atau belum ada assignee-nya sama sekali.
function needsAttention(task) {
  return task.status === "todo" || (task.assignees ?? []).length === 0;
}

// Quick filter instan (gak perlu klik "Filter") — beda dari filter assignee
// yang udah ada (yang perlu di-apply manual). "Project Saya": task yang
// project-nya kumiliki. "Ditugaskan ke Saya": aku salah satu assignee-nya.
// Sama pola kayak OWNERSHIP_FILTERS di ProjectsPage/ProjectManagementPage.
const TASK_OWNERSHIP_FILTERS = [
  { value: "all", label: "Semua" },
  { value: "myProjects", label: "Project Saya" },
  { value: "assignedToMe", label: "Ditugaskan ke Saya" },
];

function matchesTaskOwnership(task, ownershipFilter, currentUser) {
  if (ownershipFilter === "myProjects")
    return task.project?.user?.id === currentUser?.id;
  if (ownershipFilter === "assignedToMe") {
    return (task.assignees ?? []).some((a) => a.id === currentUser?.id);
  }
  return true;
}

function matchesDueDate(task, dueDateFrom, dueDateTo) {
  const dueDate = task.dueDate?.slice(0, 10);
  if (dueDateFrom && (!dueDate || dueDate < dueDateFrom)) return false;
  if (dueDateTo && (!dueDate || dueDate > dueDateTo)) return false;
  return true;
}

function TaskCard({ task, onDragStart, onClick }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onClick={() => onClick(task)}
      className="min-w-0 cursor-grab space-y-3 border border-border bg-card p-4 text-xs hover:bg-muted/50 active:cursor-grabbing"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <CodeBadge>{task.code}</CodeBadge>
          <EpicBadge epic={task.epic} />
        </div>
        <p className="wrap-break-word font-medium leading-relaxed">
          {task.name}
        </p>
        {task.description && (
          <p className="line-clamp-2 wrap-break-word text-muted-foreground">
            {task.description}
          </p>
        )}
      </div>
      <p className="wrap-break-word text-muted-foreground">
        {task.project?.name ?? "-"}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className="max-w-full">
          <span className="truncate">{task.category?.name ?? "-"}</span>
        </Badge>
        <Badge className={cn("max-w-full", PRIORITY_STYLES[task.priority])}>
          {priorityLabel(task.priority)}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <AssigneeAvatarGroup assignees={task.assignees} size="xs" />
        <DueDateBadge task={task} />
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { user: currentUser } = useAuth();
  const canAssignOthers = hasPermission(currentUser, "tasks.assignOthers");
  // Sama kayak TudosPage: yang gak bisa lihat semua task (gak punya
  // tasks.viewAll) cuma pernah dikasih task-nya sendiri sama backend, jadi
  // filter Assignee dikunci ke diri sendiri (disabled) — pilih orang lain di
  // sini gak bakal pernah ngasilin apa-apa buat mereka.
  const canViewAllTasks = hasPermission(currentUser, "tasks.viewAll");
  const [searchParams, setSearchParams] = useSearchParams();

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

  function renderEpicOption(option) {
    return (
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            EPIC_COLOR_DOT[option.color] ?? EPIC_COLOR_DOT.slate,
          )}
        />
        {option.label}
      </span>
    );
  }

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [visibleCounts, setVisibleCounts] = useState({});

  // draft* = lagi diutak-atik di dropdown filter, yang applied* = yang beneran
  // dipakai buat nyaring board. Baru nyambung pas tombol "Filter" diklik —
  // sama kayak pola di TudosPage/DashboardPage.
  const [draftProjectFilter, setDraftProjectFilter] = useState(() =>
    parseIdsParam(searchParams, "project"),
  );
  const [draftEpicFilter, setDraftEpicFilter] = useState(() =>
    parseIdsParam(searchParams, "epic"),
  );
  const [draftAssigneeFilter, setDraftAssigneeFilter] = useState(() =>
    canViewAllTasks
      ? parseIdsParam(searchParams, "assignee")
      : [String(currentUser?.id ?? "")],
  );
  const [draftCategoryFilter, setDraftCategoryFilter] = useState(() =>
    parseIdsParam(searchParams, "category"),
  );
  const [draftPriorityFilter, setDraftPriorityFilter] = useState(() =>
    parseIdsParam(searchParams, "priority"),
  );
  const [draftStatusFilter, setDraftStatusFilter] = useState(() =>
    parseIdsParam(searchParams, "status"),
  );
  const [draftDueDateFrom, setDraftDueDateFrom] = useState(() =>
    parseDateParam(searchParams, "dueFrom"),
  );
  const [draftDueDateTo, setDraftDueDateTo] = useState(() =>
    parseDateParam(searchParams, "dueTo"),
  );
  const [projectFilter, setProjectFilter] = useState(() =>
    parseIdsParam(searchParams, "project"),
  );
  const [epicFilter, setEpicFilter] = useState(() =>
    parseIdsParam(searchParams, "epic"),
  );
  const [assigneeFilter, setAssigneeFilter] = useState(() =>
    canViewAllTasks
      ? parseIdsParam(searchParams, "assignee")
      : [String(currentUser?.id ?? "")],
  );
  const [categoryFilter, setCategoryFilter] = useState(() =>
    parseIdsParam(searchParams, "category"),
  );
  const [priorityFilter, setPriorityFilter] = useState(() =>
    parseIdsParam(searchParams, "priority"),
  );
  const [statusFilter, setStatusFilter] = useState(() =>
    parseIdsParam(searchParams, "status"),
  );
  const [dueDateFrom, setDueDateFrom] = useState(() =>
    parseDateParam(searchParams, "dueFrom"),
  );
  const [dueDateTo, setDueDateTo] = useState(() =>
    parseDateParam(searchParams, "dueTo"),
  );
  const [ownershipFilter, setOwnershipFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [feedback, setFeedback] = useState({
    open: false,
    variant: "error",
    title: "",
    description: "",
  });
  const [reviewPrompt, setReviewPrompt] = useState(null);
  const [approveConfirmTaskId, setApproveConfirmTaskId] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // /users/assignable sengaja endpoint terbuka (bukan /users yang
      // dibatasin permission users.view) — assign task ke orang lain sekarang
      // bisa dilakuin siapa aja yang jadi owner project-nya, jadi daftar
      // user buat di-assign harus keliatan buat siapa aja yang login.
      const [tasksRes, projectsRes, categoriesRes, usersRes] =
        await Promise.all([
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/categories"),
          api.get("/users/assignable"),
        ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
      setCategories(categoriesRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat task");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sinkronin quick filter ke query string tiap ganti, biar link board bisa
  // di-copy/reload sambil bawa filter yang lagi aktif.
  useEffect(() => {
    const next = {};
    if (projectFilter.length) next.project = projectFilter.join(",");
    if (epicFilter.length) next.epic = epicFilter.join(",");
    if (assigneeFilter.length) next.assignee = assigneeFilter.join(",");
    if (categoryFilter.length) next.category = categoryFilter.join(",");
    if (priorityFilter.length) next.priority = priorityFilter.join(",");
    if (statusFilter.length) next.status = statusFilter.join(",");
    // Selalu ditulis (gak cuma kalau keisi) — "Semua Tanggal" (nilai "")
    // ditulis literal sebagai "all" biar reload/share link inget itu pilihan
    // sengaja, bukan diam-diam balik ke default hari ini.
    next.dueFrom = dueDateFrom || "all";
    next.dueTo = dueDateTo || "all";
    setSearchParams(next, { replace: true });
  }, [
    projectFilter,
    epicFilter,
    assigneeFilter,
    categoryFilter,
    priorityFilter,
    statusFilter,
    dueDateFrom,
    dueDateTo,
    setSearchParams,
  ]);

  function showMore(status) {
    setVisibleCounts((prev) => ({
      ...prev,
      [status]: (prev[status] ?? PAGE_SIZE) + PAGE_SIZE,
    }));
  }

  function applyFilters() {
    setProjectFilter(draftProjectFilter);
    setEpicFilter(draftEpicFilter);
    setAssigneeFilter(draftAssigneeFilter);
    setCategoryFilter(draftCategoryFilter);
    setPriorityFilter(draftPriorityFilter);
    setStatusFilter(draftStatusFilter);
    setDueDateFrom(draftDueDateFrom);
    setDueDateTo(draftDueDateTo);
    setVisibleCounts({});
  }

  function resetFilters() {
    const resetAssignee = canViewAllTasks
      ? []
      : [String(currentUser?.id ?? "")];
    const today = todayDateStr();
    setDraftProjectFilter([]);
    setDraftEpicFilter([]);
    setDraftAssigneeFilter(resetAssignee);
    setDraftCategoryFilter([]);
    setDraftPriorityFilter([]);
    setDraftStatusFilter([]);
    setDraftDueDateFrom(today);
    setDraftDueDateTo(today);
    setProjectFilter([]);
    setEpicFilter([]);
    setAssigneeFilter(resetAssignee);
    setCategoryFilter([]);
    setPriorityFilter([]);
    setStatusFilter([]);
    setDueDateFrom(today);
    setDueDateTo(today);
    setVisibleCounts({});
  }

  // Dipakai tombol "Tampilkan" di banner "perlu perhatian" — cuma lepas
  // batasan periode-nya, filter project/kategori/assignee tetap kepakai.
  function resetPeriodFilter() {
    setDraftDueDateFrom("");
    setDraftDueDateTo("");
    setDueDateFrom("");
    setDueDateTo("");
    setVisibleCounts({});
  }

  // Diturunkan dari `projects` yang udah difetch (flatMap epics per project) —
  // hemat 1 round-trip, gak ada endpoint GET /epics flat.
  const epics = projects.flatMap((p) =>
    (p.epics ?? []).map((e) => ({ ...e, projectId: p.id })),
  );

  const projectFilterOptions = projects.map((p) => ({
    value: String(p.id),
    label: p.name,
  }));
  // Filter Epic cascading dari filter Project (draft) — kalau belum ada
  // project yang dipilih, tampilin semua epic lintas project.
  const epicFilterOptions = (
    draftProjectFilter.length
      ? epics.filter((e) => draftProjectFilter.includes(String(e.projectId)))
      : epics
  ).map((e) => ({ value: String(e.id), label: e.name, color: e.color }));
  const assigneeFilterOptions = canViewAllTasks
    ? users.map((u) => ({ value: String(u.id), label: u.name }))
    : [
        {
          value: String(currentUser?.id ?? ""),
          label: currentUser?.name ?? "Kamu",
        },
      ];
  const categoryFilterOptions = categories.map((c) => ({
    value: String(c.id),
    label: c.name,
  }));
  const priorityFilterOptions = PRIORITY_OPTIONS.map((p) => ({
    value: p.value,
    label: p.label,
  }));
  const statusFilterOptions = STATUS_OPTIONS.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  function matchesNonPeriodFilters(t) {
    return (
      (projectFilter.length === 0 ||
        projectFilter.includes(String(t.project?.id))) &&
      (epicFilter.length === 0 || epicFilter.includes(String(t.epic?.id))) &&
      (assigneeFilter.length === 0 ||
        (t.assignees ?? []).some((a) =>
          assigneeFilter.includes(String(a.id)),
        )) &&
      (categoryFilter.length === 0 ||
        categoryFilter.includes(String(t.category?.id))) &&
      (priorityFilter.length === 0 || priorityFilter.includes(t.priority)) &&
      (statusFilter.length === 0 || statusFilter.includes(t.status)) &&
      matchesTaskOwnership(t, ownershipFilter, currentUser)
    );
  }

  const filteredTasks = tasks.filter(
    (t) =>
      matchesNonPeriodFilters(t) && matchesDueDate(t, dueDateFrom, dueDateTo),
  );

  const exportColumns = [
    { key: "code", label: "Kode", width: 14 },
    { key: "name", label: "Task", width: 30 },
    { key: "project", label: "Project", width: 20 },
    { key: "epic", label: "Epic", width: 18 },
    { key: "category", label: "Kategori", width: 16 },
    { key: "assignee", label: "Assignee", width: 24 },
    { key: "priority", label: "Prioritas", width: 12 },
    { key: "status", label: "Status", width: 14 },
    { key: "dueDate", label: "Due Date", width: 14 },
  ];
  const exportRows = filteredTasks.map((task) => ({
    code: task.code ?? "-",
    name: task.name,
    project: task.project?.name ?? "-",
    epic: task.epic?.name ?? "-",
    category: task.category?.name ?? "-",
    assignee: (task.assignees ?? []).map((a) => a.name).join(", ") || "-",
    priority: priorityLabel(task.priority),
    status: statusLabel(task.status),
    dueDate: task.dueDate ? formatDate(task.dueDate) : "-",
  }));

  const dailyActivityTasks = filteredTasks.map((task) => ({
    project: task.project?.name ?? "-",
    name: task.name,
    reportDate: task.reportDate,
  }));

  // Task yang perlu perhatian (belum dikerjakan/belum di-assign) tapi
  // ketutup filter periode — dipakai buat banner di atas board, biar
  // kelihatan tanpa harus lepas filter periode ke "semua tanggal".
  const isPeriodActive = Boolean(dueDateFrom || dueDateTo);
  const hiddenByPeriodTasks = isPeriodActive
    ? tasks.filter(
        (t) =>
          matchesNonPeriodFilters(t) &&
          !matchesDueDate(t, dueDateFrom, dueDateTo) &&
          needsAttention(t),
      )
    : [];

  function handleDragStart(e, taskId) {
    e.dataTransfer.setData("text/plain", String(taskId));
    e.dataTransfer.effectAllowed = "move";
  }

  // Sengaja selalu throw waktu gagal (setelah nampilin feedback & revert
  // optimistic update) — biar ReviewNoteDialog (lihat handleDrop) tau gagal
  // dan gak nutup dialognya sendiri, biar user bisa coba lagi.
  async function applyStatusChange(taskId, status, reviewNote) {
    const previous = tasks;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
    );
    try {
      await api.put(`/tasks/${taskId}`, { status, reviewNote });
    } catch (err) {
      setTasks(previous);
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal mengubah status",
        description:
          err instanceof ApiError
            ? err.message
            : "Terjadi kesalahan tak terduga.",
      });
      throw err;
    }
  }

  // Dipakai bareng drag & drop DAN dropdown status per kartu (buat HP/tablet
  // yang gak bisa drag & drop native). Dikembalikan dari In Review ke Todo/In
  // Progress wajib disertai catatan — PUT-nya ditahan dulu sampe
  // ReviewNoteDialog diisi & disubmit. Approve final (In Review -> Done) gak
  // wajib catatan tapi tetep dikonfirm ringan dulu, biar gak sengaja langsung
  // nutup task-nya.
  function requestStatusChange(task, status) {
    if (task.status === status) return;
    if (requiresReviewNote(task.status, status)) {
      setReviewPrompt({ taskId: task.id, fromStatus: task.status, toStatus: status });
    } else if (requiresApproveConfirm(task.status, status)) {
      setApproveConfirmTaskId(task.id);
    } else {
      applyStatusChange(task.id, status).catch(() => {});
    }
  }

  function handleDrop(e, status) {
    e.preventDefault();
    setDragOverStatus(null);

    const taskId = Number(e.dataTransfer.getData("text/plain"));
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    requestStatusChange(task, status);
  }

  return (
    <div className="flex flex-col gap-3 xl:h-full">
      <Card className="shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelSimple /> Filter
          </CardTitle>
          <CardDescription>
            Saring board berdasarkan project, epic, kategori, assignee,
            prioritas, status, dan periode.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-1">
            {TASK_OWNERSHIP_FILTERS.map((f) => (
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

          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Project</Label>
              <MultiCombobox
                options={projectFilterOptions}
                values={draftProjectFilter}
                onValuesChange={setDraftProjectFilter}
                placeholder="Semua Project"
                searchPlaceholder="Cari project..."
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Epic</Label>
              <MultiCombobox
                options={epicFilterOptions}
                values={draftEpicFilter}
                onValuesChange={setDraftEpicFilter}
                placeholder="Semua Epic"
                searchPlaceholder="Cari epic..."
                renderOption={renderEpicOption}
                renderValue={renderEpicOption}
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Kategori</Label>
              <MultiCombobox
                options={categoryFilterOptions}
                values={draftCategoryFilter}
                onValuesChange={setDraftCategoryFilter}
                placeholder="Semua Kategori"
                searchPlaceholder="Cari kategori..."
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Assignee</Label>
              <MultiCombobox
                options={assigneeFilterOptions}
                values={draftAssigneeFilter}
                onValuesChange={setDraftAssigneeFilter}
                placeholder="Semua Assignee"
                searchPlaceholder="Cari assignee..."
                renderOption={renderAssigneeOption}
                renderValue={renderAssigneeOption}
                disabled={!canViewAllTasks}
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-36 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Prioritas</Label>
              <MultiCombobox
                options={priorityFilterOptions}
                values={draftPriorityFilter}
                onValuesChange={setDraftPriorityFilter}
                placeholder="Semua Prioritas"
                searchPlaceholder="Cari prioritas..."
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-36 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Status</Label>
              <MultiCombobox
                options={statusFilterOptions}
                values={draftStatusFilter}
                onValuesChange={setDraftStatusFilter}
                placeholder="Semua Status"
                searchPlaceholder="Cari status..."
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-48 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Due Date</Label>
              <DateRangePicker
                from={draftDueDateFrom}
                to={draftDueDateTo}
                onChange={({ from, to }) => {
                  setDraftDueDateFrom(from);
                  setDraftDueDateTo(to);
                }}
                placeholder="Semua Tanggal"
                className="w-full"
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <Button type="button" size="sm" onClick={applyFilters}>
                Filter
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex shrink-0 items-center justify-end gap-2">
        <ExportButtons
          title="Kanban"
          columns={exportColumns}
          rows={exportRows}
          period={filenamePeriodSuffix(dueDateFrom, dueDateTo)}
          dailyActivityTasks={dailyActivityTasks}
          onError={(message) =>
            setFeedback({
              open: true,
              variant: "error",
              title: "Gagal export",
              description: message,
            })
          }
        />
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus /> Task Baru
        </Button>
      </div>

      {error && <p className="shrink-0 text-xs text-destructive">{error}</p>}

      {!isLoading && hiddenByPeriodTasks.length > 0 && (
        <Alert className="shrink-0">
          <Info />
          <AlertTitle>
            {hiddenByPeriodTasks.length} task belum dikerjakan/belum di-assign
            di luar periode ini
          </AlertTitle>
          <AlertDescription>
            Task berstatus To Do atau yang belum ada assignee-nya tetap butuh
            perhatian meski due date-nya di luar rentang tanggal yang lagi
            difilter.
          </AlertDescription>
          <AlertAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetPeriodFilter}
            >
              Tampilkan
            </Button>
          </AlertAction>
        </Alert>
      )}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-4">
          {STATUS_OPTIONS.map((column) => (
            <Card key={column.value} className="min-w-0 xl:h-full xl:min-h-0">
              <CardHeader className="shrink-0">
                <CardTitle>
                  <Skeleton className="h-4 w-20" />
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 xl:min-h-0 xl:flex-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:min-h-0 xl:flex-1 xl:grid-cols-4">
          {STATUS_OPTIONS.map((column) => {
            const columnTasks = filteredTasks.filter(
              (t) => t.status === column.value,
            );
            const visibleCount = visibleCounts[column.value] ?? PAGE_SIZE;
            const visibleTasks = columnTasks.slice(0, visibleCount);
            const remaining = columnTasks.length - visibleTasks.length;

            return (
              <Card
                key={column.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStatus(column.value);
                }}
                onDragLeave={() =>
                  setDragOverStatus((s) => (s === column.value ? null : s))
                }
                onDrop={(e) => handleDrop(e, column.value)}
                className={cn(
                  "min-w-0 xl:h-full xl:min-h-0",
                  dragOverStatus === column.value
                    ? "ring-2 ring-ring"
                    : undefined,
                )}
              >
                <CardHeader className="shrink-0">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${STATUS_DOT[column.value]}`}
                      />
                      {column.label}
                    </span>
                    <span className="text-muted-foreground">
                      {columnTasks.length}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
                  {columnTasks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Kosong</p>
                  ) : (
                    <>
                      {visibleTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onDragStart={handleDragStart}
                          onClick={setDetailTask}
                        />
                      ))}
                      {remaining > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => showMore(column.value)}
                        >
                          Muat Lebih Banyak ({remaining})
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={null}
        projects={projects}
        epics={epics}
        users={users}
        categories={categories}
        canAssignOthers={canAssignOthers}
        currentUser={currentUser}
        onSaved={loadData}
        onError={(message) =>
          setFeedback({
            open: true,
            variant: "error",
            title: "Gagal membuat task",
            description: message,
          })
        }
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
        onSubmit={(note) =>
          applyStatusChange(reviewPrompt.taskId, reviewPrompt.toStatus, note)
        }
      />

      <ConfirmDialog
        open={Boolean(approveConfirmTaskId)}
        onOpenChange={(open) => !open && setApproveConfirmTaskId(null)}
        title="Setujui task ini?"
        description="Task bakal ditandai selesai (Done) dan semua assignee bakal dapet notifikasi."
        confirmLabel="Setujui"
        onConfirm={() =>
          applyStatusChange(approveConfirmTaskId, "done").catch(() => {})
        }
      />

      <TaskDetailSheet
        open={Boolean(detailTask)}
        onOpenChange={(open) => !open && setDetailTask(null)}
        task={detailTask}
      />
    </div>
  );
}
