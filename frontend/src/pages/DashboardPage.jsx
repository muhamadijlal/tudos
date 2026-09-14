import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { Combobox } from "@/components/Combobox";
import { DueDateBadge } from "@/components/DueDateBadge";
import { ExportButtons } from "@/components/ExportButtons";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { MonthPicker } from "@/components/MonthPicker";
import { TaskDetailSheet } from "@/components/TaskDetailSheet";
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
import { filenamePeriodSuffix } from "@/lib/export";
import { hasPermission } from "@/lib/permissions";
import { DUE_SOON_DAYS, getDueStatus, STATUS_COLORS, STATUS_OPTIONS } from "@/lib/task";
import { Eyeglasses, FunnelSimple, WarningCircle } from "@phosphor-icons/react";
import HeatMap from "@uiw/react-heat-map";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ALL = "all";

// Segmen warna heatmap: 1-5, 6-10, 11-15, 16-20, 21+ (0 = kosong).
// 0 pakai var(--muted) (bukan oklch statis) biar ikut nyesuain dark mode —
// kalau di-hardcode terang, kotak "kosong" malah nyala putih di background
// gelap (kebalik dari yang harusnya nonjol, yaitu yang ADA datanya).
const HEATMAP_PANEL_COLORS = {
  0: "var(--muted)",
  1: "oklch(0.85 0.08 302)",
  6: "oklch(0.72 0.15 302)",
  11: "oklch(0.6 0.2 302)",
  16: "oklch(0.5 0.24 302)",
  21: "oklch(0.4 0.26 302)",
};

// Legend custom (bawaan library disable-in, diganti versi sendiri di pojok
// kanan bawah biar ada label rentang nilainya).
const HEATMAP_LEGEND = [
  { label: "0", color: HEATMAP_PANEL_COLORS[0] },
  { label: "1-5", color: HEATMAP_PANEL_COLORS[1] },
  { label: "6-10", color: HEATMAP_PANEL_COLORS[6] },
  { label: "11-15", color: HEATMAP_PANEL_COLORS[11] },
  { label: "16-20", color: HEATMAP_PANEL_COLORS[16] },
  { label: "21+", color: HEATMAP_PANEL_COLORS[21] },
];

function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Filter Periode cuma butuh granularitas bulan+tahun (input type="month"),
// bukan tanggal spesifik — ini convert "YYYY-MM" ke awal/akhir bulan itu.
function parseMonthStart(value) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function parseMonthEnd(value) {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month, 0);
}

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "short",
    year: "2-digit",
  });
}

function dayKeySlash(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

// "2026/01/01" -> "1 Januari 2026", buat tooltip heatmap.
function formatHeatmapDate(dateSlash) {
  const [year, month, day] = dateSlash.split("/").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// react-heat-map hard-code leftPad = 28 pas weekLabels ada (lihat SVG.js-nya).
// rectSize dikunci (bukan dihitung dari lebar) — startDate yang diundur
// sesuai jumlah kolom yang muat, biar grid-nya presisi ngisi penuh lebar
// container tanpa sisa pembulatan.
const HEATMAP_LEFT_PAD = 28;
const HEATMAP_TOP_PAD = 20;
const HEATMAP_SPACE = 3;
const HEATMAP_RECT_SIZE = 12;
const HEATMAP_ROWS = 7;

function defaultFilters(canViewAllTasks, currentUser) {
  return {
    projectId: ALL,
    userId: canViewAllTasks ? ALL : String(currentUser?.id ?? ""),
    dateFrom: "",
    dateTo: "",
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const canViewAllTasks = hasPermission(currentUser, "tasks.viewAll");

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

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reviewTasks, setReviewTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailTask, setDetailTask] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  const [draftFilters, setDraftFilters] = useState(() =>
    defaultFilters(canViewAllTasks, currentUser),
  );
  const [appliedFilters, setAppliedFilters] = useState(() =>
    defaultFilters(canViewAllTasks, currentUser),
  );

  useEffect(() => {
    const defaults = defaultFilters(canViewAllTasks, currentUser);
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewAllTasks, currentUser?.id]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError("");
      try {
        const [tasksRes, projectsRes, reviewRes] = await Promise.all([
          api.get("/tasks"),
          api.get("/projects"),
          api.get("/tasks/review-pending"),
        ]);
        setTasks(tasksRes.data);
        setProjects(projectsRes.data);
        setReviewTasks(reviewRes.data);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Gagal memuat data dashboard",
        );
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Diambil dari task yang lagi kemuat (role-scoped dari backend), bukan dari
  // /users — jalan juga buat non-admin yang gak bisa akses daftar semua user.
  const assigneeOptions = useMemo(() => {
    const map = new Map();
    for (const task of tasks) {
      for (const assignee of task.assignees ?? []) map.set(assignee.id, assignee.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [tasks]);

  // Pengingat deadline — independen dari filter Project/Assignee/Periode di
  // atas (sama kayak heatmap), biar selalu nunjukin gambaran lengkap task
  // yang perlu diperhatiin, bukan cuma yang lolos filter report. Widget-nya
  // cuma nampilin sebagian (biar UI gak kepanjangan) + link ke /deadlines
  // buat lihat daftar lengkapnya.
  const DEADLINE_PREVIEW_LIMIT = 5;
  const allDeadlineTasks = useMemo(() => {
    return tasks
      .filter((t) => getDueStatus(t))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks]);
  const upcomingDeadlines = allDeadlineTasks.slice(0, DEADLINE_PREVIEW_LIMIT);

  // Pengingat task "In Review" di project yang dimiliki user ini — backend
  // (`GET /tasks/review-pending`) yang scoping-nya, jadi di sini tinggal
  // dipreview sebagian aja, sama kayak pola Deadline Mendekat di atas.
  const REVIEW_PREVIEW_LIMIT = 5;
  const upcomingReviews = reviewTasks.slice(0, REVIEW_PREVIEW_LIMIT);

  const projectFilterOptions = [
    { value: ALL, label: "Semua Project" },
    ...projects.map((p) => ({ value: String(p.id), label: p.name })),
  ];
  const assigneeFilterOptions = canViewAllTasks
    ? [
        { value: ALL, label: "Semua Assignee" },
        ...assigneeOptions.map((u) => ({ value: String(u.id), label: u.name })),
      ]
    : [{ value: String(currentUser?.id ?? ""), label: currentUser?.name ?? "Kamu" }];

  function updateDraft(key, value) {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
  }

  function resetFilters() {
    const defaults = defaultFilters(canViewAllTasks, currentUser);
    setDraftFilters(defaults);
    setAppliedFilters(defaults);
  }

  // Task yang lolos filter Project & Assignee (dipakai bareng buat stat
  // card, chart bulanan, & heatmap — cuma rentang tanggalnya beda-beda).
  const scopedTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (
        appliedFilters.projectId !== ALL &&
        String(task.project?.id) !== appliedFilters.projectId
      ) {
        return false;
      }
      if (
        appliedFilters.userId !== ALL &&
        !(task.assignees ?? []).some((a) => String(a.id) === appliedFilters.userId)
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, appliedFilters]);

  // Rentang periode buat chart bulanan: pakai filter bulan+tahun kalau
  // diisi, default satu tahun penuh berjalan (Januari - Desember) kalau
  // kosong. Filter-nya sengaja cuma granularitas bulan (input type="month"),
  // gak perlu setajam tanggal spesifik.
  const { rangeStart, rangeEnd, periodTasks } = useMemo(() => {
    const now = new Date();
    const end = parseMonthEnd(appliedFilters.dateTo) ?? new Date(now.getFullYear(), 11, 31);
    const start = parseMonthStart(appliedFilters.dateFrom) ?? new Date(now.getFullYear(), 0, 1);

    const startOfDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );
    const endOfDay = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate(),
      23,
      59,
      59,
      999,
    );

    const filtered = scopedTasks.filter((task) => {
      const created = new Date(task.createdAt);
      return created >= startOfDay && created <= endOfDay;
    });

    return {
      rangeStart: startOfDay,
      rangeEnd: endOfDay,
      periodTasks: filtered,
    };
  }, [scopedTasks, appliedFilters.dateFrom, appliedFilters.dateTo]);

  const monthlyData = useMemo(() => {
    const buckets = new Map();
    let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const endCursor = new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1);
    while (cursor <= endCursor) {
      const key = monthKey(cursor);
      buckets.set(key, {
        month: key,
        label: monthLabel(key),
        todo: 0,
        in_progress: 0,
        in_review: 0,
        done: 0,
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    for (const task of periodTasks) {
      const key = monthKey(task.createdAt);
      if (!buckets.has(key)) {
        buckets.set(key, {
          month: key,
          label: monthLabel(key),
          todo: 0,
          in_progress: 0,
          in_review: 0,
          done: 0,
        });
      }
      buckets.get(key)[task.status] += 1;
    }

    // `total` dipakai buat garis yang nyambungin puncak tiap bar bulanan.
    return Array.from(buckets.values())
      .map((bucket) => ({
        ...bucket,
        total: bucket.todo + bucket.in_progress + bucket.in_review + bucket.done,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [periodTasks, rangeStart, rangeEnd]);

  const exportColumns = useMemo(
    () => [
      { key: "label", label: "Bulan", width: 14 },
      ...STATUS_OPTIONS.map((s) => ({ key: s.value, label: s.label, width: 14 })),
      { key: "total", label: "Total", width: 12 },
    ],
    [],
  );
  const exportRows = useMemo(
    () =>
      monthlyData.map((bucket) => ({
        label: bucket.label,
        todo: bucket.todo,
        in_progress: bucket.in_progress,
        in_review: bucket.in_review,
        done: bucket.done,
        total: bucket.total,
      })),
    [monthlyData],
  );

  const stats = useMemo(() => {
    const totals = {
      total: periodTasks.length,
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    };
    for (const task of periodTasks) totals[task.status] += 1;
    return totals;
  }, [periodTasks]);

  // Heatmap selalu rolling 1 tahun terakhir, gak kepengaruh filter tanggal
  // (yang itu punya "periode" sendiri buat chart bulanan).
  const heatmapValue = useMemo(() => {
    const counts = new Map();
    // Batas generus (2 tahun) — cukup buat nutupin rentang yang ditampilin
    // (biasanya ~1 tahun, bisa dikit lebih lebar di layar sangat lebar),
    // tanggal di luar rentang yang kerender juga gak masalah, cuma gak
    // dipakai (HeatMap-nya cuma nge-lookup tanggal yang beneran ada di grid).
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 2);

    for (const task of scopedTasks) {
      const created = new Date(task.createdAt);
      if (created < cutoff) continue;
      const key = dayKeySlash(created);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return Array.from(counts, ([date, count]) => ({ date, count }));
  }, [scopedTasks]);

  // Tanpa endDate, di layar lebar HeatMap bisa render lebih dari gridNum
  // minggu yang tersedia (jadi nampilin bulan-bulan masa depan yang kosong).
  const heatmapEndDate = useMemo(() => new Date(), []);

  // Ukur lebar container heatmap-nya. react-heat-map nentuin jumlah kolom
  // minggu yang dirender lewat floor((clientWidth-leftPad)/(rectSize+space))
  // — rumus yang sama kita pakai di sini buat nebak berapa kolom yang muat,
  // baru startDate-nya diundur sesuai itu. TAPI library-nya ngukur clientWidth
  // dari elemen <svg> asli (integer, useEffect sendiri), sedangkan kita ngukur
  // contentRect wrapper div-nya (float, ResizeObserver kita sendiri) — dua
  // pengukuran independen yang KADANG beda dikit, cukup buat nge-geser hasil
  // floor()-nya 1 kolom. Kalau tebakan kita KELEBIHAN (lebih banyak dari
  // kolom yang beneran dirender library), startDate jadi kemunduran, dan
  // karena Day.tsx cuma ngegambar maju gridNum minggu DARI startDate itu
  // (bukan mundur dari endDate), sisa hari paling baru — termasuk HARI INI —
  // malah kepotong duluan (bug yang dilaporin user). Makanya sengaja
  // dikurangin margin aman (-2 minggu) di bawah: mending riwayat yang
  // ditampilin dikit lebih pendek dari kolom yang sebenarnya muat, daripada
  // task hari ini hilang dari grid.
  // Pakai callback ref (bukan useRef + effect ber-deps kosong) karena div-nya
  // baru muncul belakangan (nunggu isLoading kelar) — effect ber-deps [] gak
  // akan pernah lihat elemen aslinya kalau baru muncul setelah mount pertama.
  const [heatmapWrapperEl, setHeatmapWrapperEl] = useState(null);
  const [heatmapWidth, setHeatmapWidth] = useState(0);

  useEffect(() => {
    if (!heatmapWrapperEl) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setHeatmapWidth(width);
    });
    observer.observe(heatmapWrapperEl);
    return () => observer.disconnect();
  }, [heatmapWrapperEl]);

  const heatmapRectSize = HEATMAP_RECT_SIZE;

  const heatmapGridNum = useMemo(() => {
    if (!heatmapWidth) return 53;
    return Math.max(
      1,
      Math.floor(
        (heatmapWidth - HEATMAP_LEFT_PAD) / (heatmapRectSize + HEATMAP_SPACE),
      ) - 2,
    );
  }, [heatmapWidth, heatmapRectSize]);

  const heatmapStartDate = useMemo(() => {
    const d = new Date(heatmapEndDate);
    d.setDate(d.getDate() - heatmapGridNum * 7);
    return d;
  }, [heatmapEndDate, heatmapGridNum]);

  // SVG-nya sendiri gak punya height/viewBox eksplisit (auto-size dari
  // konten), dan ternyata nyisain ruang kosong ekstra di bawah buat legend
  // bawaan meski udah di-disable (legendCellSize={0}) — jadi height-nya
  // dipaksa pas-in manual biar gak ada gap kosong sebelum legend custom kita.
  const heatmapSvgHeight =
    HEATMAP_TOP_PAD + HEATMAP_ROWS * (heatmapRectSize + HEATMAP_SPACE);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Selamat datang, {currentUser?.name}</CardTitle>
          <CardDescription>
            Ringkasan aktivitas task {canViewAllTasks ? "" : "kamu"}.
          </CardDescription>
        </CardHeader>
      </Card>

      {!isLoading && allDeadlineTasks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <WarningCircle className="text-amber-600 dark:text-amber-400" /> Deadline Mendekat
              </CardTitle>
              <CardDescription>
                Task yang due date-nya udah lewat atau kurang dari {DUE_SOON_DAYS} hari lagi.
              </CardDescription>
            </div>
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => navigate("/deadlines")}>
              Lihat Semua ({allDeadlineTasks.length})
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcomingDeadlines.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setDetailTask(task)}
                className="flex items-center justify-between gap-3 border border-border p-2 text-left text-xs hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CodeBadge>{task.code}</CodeBadge>
                  <span className="min-w-0 truncate">{task.name}</span>
                  <span className="hidden shrink-0 text-muted-foreground sm:inline">
                    {task.project?.name}
                  </span>
                </div>
                <DueDateBadge task={task} className="shrink-0" />
              </button>
            ))}
            {allDeadlineTasks.length > DEADLINE_PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => navigate("/deadlines")}
                className="text-left text-muted-foreground hover:underline"
              >
                +{allDeadlineTasks.length - DEADLINE_PREVIEW_LIMIT} lainnya...
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && reviewTasks.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eyeglasses className="text-blue-600 dark:text-blue-400" /> Perlu Direview
              </CardTitle>
              <CardDescription>
                Task di project kamu yang lagi nunggu direview (status In Review).
              </CardDescription>
            </div>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => navigate("/tasks/review-pending")}
            >
              Lihat Semua ({reviewTasks.length})
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {upcomingReviews.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => setDetailTask(task)}
                className="flex items-center justify-between gap-3 border border-border p-2 text-left text-xs hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <CodeBadge>{task.code}</CodeBadge>
                  <span className="min-w-0 truncate">{task.name}</span>
                  <span className="hidden shrink-0 text-muted-foreground sm:inline">
                    {task.project?.name}
                  </span>
                </div>
                <AssigneeAvatarGroup assignees={task.assignees} size="xs" className="shrink-0" />
              </button>
            ))}
            {reviewTasks.length > REVIEW_PREVIEW_LIMIT && (
              <button
                type="button"
                onClick={() => navigate("/tasks/review-pending")}
                className="text-left text-muted-foreground hover:underline"
              >
                +{reviewTasks.length - REVIEW_PREVIEW_LIMIT} lainnya...
              </button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelSimple /> Filter
          </CardTitle>
          <CardDescription>
            Saring ringkasan berdasarkan project, assignee, dan periode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex min-w-36 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Project</Label>
              <Combobox
                options={projectFilterOptions}
                value={draftFilters.projectId}
                onValueChange={(v) => updateDraft("projectId", v)}
                searchPlaceholder="Cari project..."
                size="sm"
                className="w-full"
              />
            </div>

            <div className="flex min-w-36 flex-1 flex-col gap-1">
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
                className="w-full"
              />
            </div>

            <div className="flex min-w-64 flex-1 flex-col gap-1">
              <Label className="text-muted-foreground">Periode (bulan)</Label>
              <div className="flex items-center gap-1.5">
                <MonthPicker
                  value={draftFilters.dateFrom}
                  onChange={(value) => setDraftFilters((prev) => ({ ...prev, dateFrom: value }))}
                  placeholder="Dari"
                  className="min-w-0 flex-1"
                />
                <span className="text-muted-foreground">–</span>
                <MonthPicker
                  value={draftFilters.dateTo}
                  onChange={(value) => setDraftFilters((prev) => ({ ...prev, dateTo: value }))}
                  placeholder="Sampai"
                  className="min-w-0 flex-1"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
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

      {error && <p className="text-xs text-destructive">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-10" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader>
              <CardDescription>Total Task</CardDescription>
              <CardTitle className="text-lg">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          {STATUS_OPTIONS.map((s) => (
            <Card key={s.value}>
              <CardHeader>
                <CardDescription>{s.label}</CardDescription>
                <CardTitle className="text-lg">{stats[s.value]}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Summary per Bulan</CardTitle>
            <CardDescription>
              Jumlah task dibuat per bulan, dipecah per status.
            </CardDescription>
          </div>
          <ExportButtons
            title="Dashboard Summary per Bulan"
            columns={exportColumns}
            rows={exportRows}
            period={filenamePeriodSuffix(rangeStart, rangeEnd)}
            onError={(message) =>
              setFeedback({ open: true, variant: "error", title: "Gagal export", description: message })
            }
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 0,
                    border: "1px solid var(--border)",
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === "total"
                      ? "Total"
                      : (STATUS_OPTIONS.find((s) => s.value === value)?.label ?? value)
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar
                  dataKey="todo"
                  stackId="status"
                  fill={STATUS_COLORS.todo}
                  name="todo"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="in_progress"
                  stackId="status"
                  fill={STATUS_COLORS.in_progress}
                  name="in_progress"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="in_review"
                  stackId="status"
                  fill={STATUS_COLORS.in_review}
                  name="in_review"
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="done"
                  stackId="status"
                  fill={STATUS_COLORS.done}
                  name="done"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="total"
                  stroke="var(--foreground)"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: "var(--foreground)" }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas 1 Tahun Terakhir</CardTitle>
          <CardDescription>
            Jumlah task dibuat per hari, seperti kontribusi GitHub.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 overflow-x-auto ">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div
                ref={setHeatmapWrapperEl}
                className="flex w-full flex-col gap-2 sm:w-3/4 md:w-full"
              >
                <HeatMap
                  value={heatmapValue}
                  startDate={heatmapStartDate}
                  endDate={heatmapEndDate}
                  width="100%"
                  height={heatmapSvgHeight}
                  rectSize={heatmapRectSize}
                  legendCellSize={0}
                  space={HEATMAP_SPACE}
                  style={{ color: "var(--muted-foreground)" }}
                  panelColors={HEATMAP_PANEL_COLORS}
                  rectProps={{ rx: 0 }}
                  weekLabels={["", "Sen", "", "Rab", "", "Jum", ""]}
                  rectRender={(props, data) => (
                    <rect {...props}>
                      <title>{`${formatHeatmapDate(data.date)}: ${data.count ?? 0} task`}</title>
                    </rect>
                  )}
                />
                <div className="flex items-center justify-end gap-2.5 mt-5">
                  {HEATMAP_LEGEND.map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <span
                        className="size-2.5 shrink-0"
                        style={{ background: item.color }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
    </div>
  );
}
