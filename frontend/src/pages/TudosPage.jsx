import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { Combobox } from "@/components/Combobox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DateRangePicker } from "@/components/DateRangePicker";
import { DueDateBadge } from "@/components/DueDateBadge";
import { EpicBadge } from "@/components/EpicBadge";
import { ExportButtons } from "@/components/ExportButtons";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { ReviewNoteDialog } from "@/components/ReviewNoteDialog";
import { TableSkeletonRows } from "@/components/TableSkeletonRows";
import { DEFAULT_PAGE_SIZE, TablePagination } from "@/components/TablePagination";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
import { TaskFormDialog } from "@/components/TaskFormDialog";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api";
import { EPIC_COLOR_DOT } from "@/lib/epicColor";
import { filenamePeriodSuffix } from "@/lib/export";
import { hasPermission } from "@/lib/permissions";
import {
  formatDate,
  priorityLabel,
  PRIORITY_OPTIONS,
  PRIORITY_STYLES,
  requiresApproveConfirm,
  requiresReviewNote,
  STATUS_OPTIONS,
  STATUS_STYLES,
  statusLabel,
} from "@/lib/task";
import { cn } from "@/lib/utils";
import { FunnelSimple, Info, Plus } from "@phosphor-icons/react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const ALL = "all";
const columnHelper = createColumnHelper();

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
  if (ownershipFilter === "myProjects") return task.project?.user?.id === currentUser?.id;
  if (ownershipFilter === "assignedToMe") {
    return (task.assignees ?? []).some((a) => a.id === currentUser?.id);
  }
  return true;
}

// Default filter: due date terkunci ke hari ini (bukan "semua tanggal"), dan
// assignee dikunci ke diri sendiri buat yang gak bisa lihat semua task.
// Dipakai buat state awal (draft & applied) dan buat "Reset Filter".
function defaultFilters(canViewAllTasks, currentUser) {
  return {
    projectId: ALL,
    epicId: ALL,
    categoryId: ALL,
    userId: canViewAllTasks ? ALL : String(currentUser?.id ?? ""),
    priority: ALL,
    status: ALL,
    // Default "Semua Tanggal" (gak dikunci ke hari ini) — samain sama Kanban,
    // biar gak nyembunyiin task todo/belum-assign secara diam-diam pas
    // pertama buka halaman. Filter periode tetep bisa dipilih manual kalau mau.
    dueDateFrom: "",
    dueDateTo: "",
  };
}

// `includePeriod: false` dipakai buat ngitung task yang "ketutup" filter
// periode doang (buat banner "Perlu Diperhatikan" di bawah) — filter lain
// (project/kategori/assignee/dst) tetap berlaku sama persis.
function taskMatchesFilters(task, f, { includePeriod }) {
  if (f.projectId !== ALL && String(task.project?.id) !== f.projectId) return false;
  if (f.epicId !== ALL && String(task.epic?.id) !== f.epicId) return false;
  if (f.categoryId !== ALL && String(task.category?.id) !== f.categoryId) return false;
  if (f.userId !== ALL && !(task.assignees ?? []).some((a) => String(a.id) === f.userId)) return false;
  if (f.priority !== ALL && task.priority !== f.priority) return false;
  if (f.status !== ALL && task.status !== f.status) return false;
  if (includePeriod) {
    const dueDate = task.dueDate?.slice(0, 10);
    if (f.dueDateFrom && (!dueDate || dueDate < f.dueDateFrom)) return false;
    if (f.dueDateTo && (!dueDate || dueDate > f.dueDateTo)) return false;
  }
  return true;
}

// Task yang butuh perhatian meski due date-nya di luar periode: belum
// dikerjakan (status todo) atau belum ada assignee-nya sama sekali.
function needsAttention(task) {
  return task.status === "todo" || (task.assignees ?? []).length === 0;
}

export default function TudosPage() {
  const { user: currentUser } = useAuth();
  const canViewAllTasks = hasPermission(currentUser, "tasks.viewAll");
  const canAssignOthers = hasPermission(currentUser, "tasks.assignOthers");
  const [searchParams, setSearchParams] = useSearchParams();

  // Ditaruh di dalem komponen (bukan module-level) biar bisa nangkep
  // currentUser lewat closure — dipakai buat nandain diri sendiri "(Kamu)"
  // di opsi assignee.
  function renderAssigneeOption(option) {
    if (option.value === ALL) return option.label;
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
    if (option.value === ALL) return option.label;
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

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [highlightCommentId, setHighlightCommentId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const [reviewPrompt, setReviewPrompt] = useState(null);
  const [approveConfirmTaskId, setApproveConfirmTaskId] = useState(null);

  // draftFilters = lagi diutak-atik di form filter, appliedFilters = yang beneran
  // dipakai buat nyaring tabel. Baru nyambung pas tombol "Filter" diklik.
  const [draftFilters, setDraftFilters] = useState(() => defaultFilters(canViewAllTasks, currentUser));
  const [appliedFilters, setAppliedFilters] = useState(() =>
    defaultFilters(canViewAllTasks, currentUser),
  );
  const [ownershipFilter, setOwnershipFilter] = useState("all");

  useEffect(() => {
    const defaults = defaultFilters(canViewAllTasks, currentUser);
    // Datang dari link "Detail" di dialog project (?projectId=X) atau
    // "Lihat Semua di Tudos" di EpicDetailPage (?epicId=X) — kunci filter ke
    // project/epic itu & lepas batasan due date biar semua task-nya
    // kelihatan, bukan cuma yang due date-nya hari ini.
    const projectIdParam = searchParams.get("projectId");
    const epicIdParam = searchParams.get("epicId");
    const initial =
      projectIdParam || epicIdParam
        ? {
            ...defaults,
            ...(projectIdParam ? { projectId: projectIdParam } : {}),
            ...(epicIdParam ? { epicId: epicIdParam } : {}),
            dueDateFrom: "",
            dueDateTo: "",
          }
        : defaults;
    setDraftFilters(initial);
    setAppliedFilters(initial);
    if (projectIdParam || epicIdParam) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewAllTasks, currentUser?.id]);

  // Diturunkan dari `projects` yang udah difetch (flatMap epics per project) —
  // hemat 1 round-trip, gak ada endpoint GET /epics flat.
  const epics = useMemo(
    () => projects.flatMap((p) => (p.epics ?? []).map((e) => ({ ...e, projectId: p.id }))),
    [projects],
  );

  // Diambil dari task yang lagi kemuat, bukan dari /users — jalan juga buat
  // non-admin yang gak bisa akses daftar semua user.
  const assigneeOptions = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      for (const assignee of task.assignees ?? []) map.set(assignee.id, assignee.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(
      (task) =>
        taskMatchesFilters(task, appliedFilters, { includePeriod: true }) &&
        matchesTaskOwnership(task, ownershipFilter, currentUser),
    );
  }, [tasks, appliedFilters, ownershipFilter, currentUser]);

  // Export (Excel/PDF) selalu ngikutin filter yang lagi aktif — sumbernya
  // `filteredTasks` yang sama persis dipakai buat nampilin tabel.
  const exportColumns = useMemo(
    () => [
      { key: "code", label: "Kode", width: 14 },
      { key: "name", label: "Task", width: 30 },
      { key: "project", label: "Project", width: 20 },
      { key: "epic", label: "Epic", width: 18 },
      { key: "category", label: "Kategori", width: 16 },
      { key: "assignee", label: "Assignee", width: 24 },
      { key: "priority", label: "Prioritas", width: 12 },
      { key: "status", label: "Status", width: 14 },
      { key: "dueDate", label: "Due Date", width: 14 },
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      filteredTasks.map((task) => ({
        code: task.code ?? "-",
        name: task.name,
        project: task.project?.name ?? "-",
        epic: task.epic?.name ?? "-",
        category: task.category?.name ?? "-",
        assignee: (task.assignees ?? []).map((a) => a.name).join(", ") || "-",
        priority: priorityLabel(task.priority),
        status: statusLabel(task.status),
        dueDate: task.dueDate ? formatDate(task.dueDate) : "-",
      })),
    [filteredTasks],
  );

  // Daily Activity ngambil dari task yang sama (filteredTasks), tapi
  // dikelompokkan per hari (task.reportDate — "Tanggal Laporan" yang bebas
  // diedit user, bukan createdAt yang dikunci) di backend — bukan tabel
  // flat kayak export Excel/PDF biasa, jadi bentuk row-nya beda (bukan
  // exportColumns).
  const dailyActivityTasks = useMemo(
    () =>
      filteredTasks.map((task) => ({
        project: task.project?.name ?? "-",
        name: task.name,
        reportDate: task.reportDate,
      })),
    [filteredTasks],
  );

  const isFiltered = useMemo(() => {
    const defaults = defaultFilters(canViewAllTasks, currentUser);
    return Object.entries(appliedFilters).some(([key, value]) => value !== defaults[key]);
  }, [appliedFilters, canViewAllTasks, currentUser]);

  // Task yang perlu perhatian (belum dikerjakan/belum di-assign) tapi
  // ketutup filter periode — dipakai buat banner di bawah filter, biar
  // kelihatan tanpa harus buka filter periode ke "semua tanggal" (yang bikin
  // datanya jadi kebanyakan). Filter selain periode tetap dihormati.
  const isPeriodActive = Boolean(appliedFilters.dueDateFrom || appliedFilters.dueDateTo);
  const hiddenByPeriodTasks = useMemo(() => {
    if (!isPeriodActive) return [];
    return tasks.filter(
      (task) =>
        taskMatchesFilters(task, appliedFilters, { includePeriod: false }) &&
        !taskMatchesFilters(task, appliedFilters, { includePeriod: true }) &&
        matchesTaskOwnership(task, ownershipFilter, currentUser) &&
        needsAttention(task),
    );
  }, [tasks, appliedFilters, isPeriodActive, ownershipFilter, currentUser]);

  function resetPeriodFilter() {
    setDraftFilters((prev) => ({ ...prev, dueDateFrom: "", dueDateTo: "" }));
    setAppliedFilters((prev) => ({ ...prev, dueDateFrom: "", dueDateTo: "" }));
  }

  const columns = useMemo(
    () => [
      columnHelper.accessor("code", {
        header: "Kode",
        cell: (info) => <CodeBadge>{info.getValue()}</CodeBadge>,
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("name", {
        header: "Task",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor((row) => row.project?.name ?? "-", {
        id: "project",
        header: "Project",
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
        meta: { className: "hidden md:table-cell" },
      }),
      columnHelper.accessor((row) => row.epic?.name ?? "-", {
        id: "epic",
        header: "Epic",
        cell: (info) =>
          info.row.original.epic ? (
            <EpicBadge epic={info.row.original.epic} />
          ) : (
            <span className="text-muted-foreground">-</span>
          ),
        meta: { className: "hidden lg:table-cell" },
      }),
      columnHelper.accessor((row) => row.category?.name ?? "-", {
        id: "category",
        header: "Kategori",
        cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
        meta: { className: "hidden lg:table-cell" },
      }),
      columnHelper.accessor(
        (row) => (row.assignees ?? []).map((a) => a.name).join(", ") || "-",
        {
          id: "assignee",
          header: "Assignee",
          cell: (info) => (
            <div className="flex items-center gap-2 text-muted-foreground">
              <AssigneeAvatarGroup assignees={info.row.original.assignees} />
              <span className="truncate">{info.getValue()}</span>
            </div>
          ),
        },
      ),
      columnHelper.accessor("priority", {
        header: "Prioritas",
        cell: (info) => (
          <Badge className={PRIORITY_STYLES[info.getValue()]}>{priorityLabel(info.getValue())}</Badge>
        ),
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => (
          <Combobox
            options={STATUS_OPTIONS}
            value={info.getValue()}
            onValueChange={(value) => requestStatusChange(info.row.original, value)}
            searchPlaceholder="Cari status..."
            size="sm"
            className={cn("w-32 border-transparent", STATUS_STYLES[info.getValue()])}
          />
        ),
      }),
      columnHelper.accessor("dueDate", {
        header: "Due Date",
        cell: (info) => <DueDateBadge task={info.row.original} />,
        meta: { className: "hidden sm:table-cell" },
      }),
      columnHelper.display({
        id: "actions",
        header: () => <div className="text-right">Aksi</div>,
        cell: (info) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDetailTask(info.row.original)}>
              Detail
            </Button>
            <Button variant="outline" size="sm" onClick={() => openEditForm(info.row.original)}>
              Edit
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(info.row.original)}>
              Hapus
            </Button>
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const table = useReactTable({
    data: filteredTasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: DEFAULT_PAGE_SIZE } },
  });

  // Balik ke halaman 1 tiap kali hasil filter berubah, biar gak nyangkut di
  // halaman yang udah kosong.
  useEffect(() => {
    table.setPageIndex(0);
  }, [filteredTasks, table]);

  function updateDraft(key, value) {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }

  // Ganti Project di filter -> lepas pilihan Epic (cascading), sama pola
  // kayak TaskFormDialog.
  function updateProjectFilter(value) {
    setDraftFilters((prev) => ({ ...prev, projectId: value, epicId: ALL }));
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    const defaults = defaultFilters(canViewAllTasks, currentUser);
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
  }

  const projectFilterOptions = [
    { value: ALL, label: "Semua Project" },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];
  // Filter Epic cascading dari filter Project (draft) — kalau project-nya
  // "Semua", tampilin semua epic lintas project.
  const epicFilterOptions = [
    { value: ALL, label: "Semua Epic" },
    ...(draftFilters.projectId === ALL
      ? epics
      : epics.filter((e) => String(e.projectId) === draftFilters.projectId)
    ).map((e) => ({ value: String(e.id), label: e.name, color: e.color })),
  ];
  const categoryFilterOptions = [
    { value: ALL, label: "Semua Kategori" },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];
  const assigneeFilterOptions = canViewAllTasks
    ? [
        { value: ALL, label: "Semua Assignee" },
        ...assigneeOptions.map((u) => ({ value: String(u.id), label: u.name })),
      ]
    : [{ value: String(currentUser?.id ?? ""), label: currentUser?.name ?? "Kamu" }];
  const priorityFilterOptions = [{ value: ALL, label: "Semua Prioritas" }, ...PRIORITY_OPTIONS];
  const statusFilterOptions = [{ value: ALL, label: "Semua Status" }, ...STATUS_OPTIONS];

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      // /users/assignable sengaja endpoint terbuka (bukan /users yang
      // dibatasin permission users.view) — assign task ke orang lain sekarang
      // bisa dilakuin siapa aja yang jadi owner project-nya, jadi daftar
      // user buat di-assign harus keliatan buat siapa aja yang login.
      const [tasksRes, projectsRes, categoriesRes, usersRes] = await Promise.all([
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
      setError(err instanceof ApiError ? err.message : "Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Datang dari notifikasi (?taskId=X, opsional &commentId=Y) — begitu
  // task-nya kemuat, langsung buka TaskDetailSheet-nya (yang isinya juga ada
  // section Aktivitas/komentar) biar user gak perlu nyari manual task-nya di
  // tabel. commentId (kalau ada) diteruskan biar komentar yang dimaksud
  // di-highlight & di-scroll-in-view di dalam sheet-nya.
  useEffect(() => {
    const taskIdParam = searchParams.get("taskId");
    if (!taskIdParam || isLoading) return;
    const target = tasks.find((t) => String(t.id) === taskIdParam);
    if (target) {
      setDetailTask(target);
      const commentIdParam = searchParams.get("commentId");
      if (commentIdParam) setHighlightCommentId(Number(commentIdParam));
    }
    setSearchParams({}, { replace: true });
  }, [isLoading, tasks, searchParams, setSearchParams]);

  // Sengaja selalu throw waktu gagal (setelah nampilin feedback & revert
  // optimistic update) — biar ReviewNoteDialog (lihat requestStatusChange)
  // tau gagal dan gak nutup dialognya sendiri, biar user bisa coba lagi.
  async function applyStatusChange(taskId, status, reviewNote) {
    const previous = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
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
  // Approve final (In Review -> Done) gak wajib catatan tapi tetep dikonfirm
  // ringan dulu (ConfirmDialog) — satu-satunya transisi penting yang kalau
  // enggak, langsung kejadian instan pas combobox diklik gak sengaja.
  function requestStatusChange(task, status) {
    if (requiresReviewNote(task.status, status)) {
      setReviewPrompt({ taskId: task.id, fromStatus: task.status, toStatus: status });
    } else if (requiresApproveConfirm(task.status, status)) {
      setApproveConfirmTaskId(task.id);
    } else {
      applyStatusChange(task.id, status).catch(() => {});
    }
  }

  function openCreateForm() {
    setEditingTask(null);
    setFormOpen(true);
  }

  function openEditForm(task) {
    setEditingTask(task);
    setFormOpen(true);
  }

  async function handleDelete() {
    try {
      await api.delete(`/tasks/${deleteTarget.id}`);
      await loadData();
    } catch (err) {
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus task",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelSimple /> Filter
          </CardTitle>
          <CardDescription>
            Saring task berdasarkan project, epic, kategori, assignee, dll.
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
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Project</Label>
              <Combobox
                options={projectFilterOptions}
                value={draftFilters.projectId}
                onValueChange={updateProjectFilter}
                searchPlaceholder="Cari project..."
                size="sm"
                className="w-36"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Epic</Label>
              <Combobox
                options={epicFilterOptions}
                value={draftFilters.epicId}
                onValueChange={(v) => updateDraft("epicId", v)}
                searchPlaceholder="Cari epic..."
                renderOption={renderEpicOption}
                renderValue={renderEpicOption}
                size="sm"
                className="w-36"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Kategori</Label>
              <Combobox
                options={categoryFilterOptions}
                value={draftFilters.categoryId}
                onValueChange={(v) => updateDraft("categoryId", v)}
                searchPlaceholder="Cari kategori..."
                size="sm"
                className="w-36"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Assignee</Label>
              <Combobox
                options={assigneeFilterOptions}
                value={draftFilters.userId}
                onValueChange={(v) => updateDraft("userId", v)}
                disabled={!canViewAllTasks}
                searchPlaceholder="Cari assignee..."
                renderOption={renderAssigneeOption}
                renderValue={renderAssigneeOption}
                size="sm"
                className="w-36"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Prioritas</Label>
              <Combobox
                options={priorityFilterOptions}
                value={draftFilters.priority}
                onValueChange={(v) => updateDraft("priority", v)}
                searchPlaceholder="Cari prioritas..."
                size="sm"
                className="w-32"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Status</Label>
              <Combobox
                options={statusFilterOptions}
                value={draftFilters.status}
                onValueChange={(v) => updateDraft("status", v)}
                searchPlaceholder="Cari status..."
                size="sm"
                className="w-32"
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Due Date</Label>
              <DateRangePicker
                from={draftFilters.dueDateFrom}
                to={draftFilters.dueDateTo}
                onChange={({ from, to }) =>
                  setDraftFilters((prev) => ({ ...prev, dueDateFrom: from, dueDateTo: to }))
                }
                placeholder="Semua tanggal"
                className="w-56"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={applyFilters}>
                Filter
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={resetFilters}>
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!isLoading && hiddenByPeriodTasks.length > 0 && (
        <Alert>
          <Info />
          <AlertTitle>
            {hiddenByPeriodTasks.length} task belum dikerjakan/belum di-assign di luar periode ini
          </AlertTitle>
          <AlertDescription>
            Task berstatus To Do atau yang belum ada assignee-nya tetap butuh perhatian meski due
            date-nya di luar rentang tanggal yang lagi difilter.
          </AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" onClick={resetPeriodFilter}>
              Tampilkan
            </Button>
          </AlertAction>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tudos</CardTitle>
            <CardDescription>Daftar semua task lintas project.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ExportButtons
              title="Tudos"
              columns={exportColumns}
              rows={exportRows}
              period={filenamePeriodSuffix(appliedFilters.dueDateFrom, appliedFilters.dueDateTo)}
              dailyActivityTasks={dailyActivityTasks}
              onError={(message) =>
                setFeedback({ open: true, variant: "error", title: "Gagal export", description: message })
              }
            />
            <Button size="sm" onClick={openCreateForm}>
              <Plus /> Task Baru
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

          {!isLoading && filteredTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isFiltered ? "Tidak ada task yang cocok dengan filter." : "Belum ada task."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableSkeletonRows columns={columns.length} />
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {!isLoading && (
                <TablePagination
                  page={table.getState().pagination.pageIndex + 1}
                  pageSize={table.getState().pagination.pageSize}
                  totalItems={filteredTasks.length}
                  onPageChange={(p) => table.setPageIndex(p - 1)}
                  onPageSizeChange={(size) => table.setPageSize(size)}
                  itemLabel="task"
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <TaskFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        task={editingTask}
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
            title: editingTask ? "Gagal mengubah task" : "Gagal membuat task",
            description: message,
          })
        }
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Hapus task "${deleteTarget?.name}"?`}
        description="Aksi ini tidak bisa dibatalkan."
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

      <TaskDetailSheet
        open={Boolean(detailTask)}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTask(null);
            setHighlightCommentId(null);
          }
        }}
        task={detailTask}
        highlightCommentId={highlightCommentId}
      />
    </div>
  );
}
