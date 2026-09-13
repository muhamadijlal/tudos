import { AssigneeAvatar } from "@/components/AssigneeAvatar";
import { AssigneeAvatarGroup } from "@/components/AssigneeAvatarGroup";
import { CodeBadge } from "@/components/CodeBadge";
import { ExportButtons } from "@/components/ExportButtons";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { MultiCombobox } from "@/components/MultiCombobox";
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
import { api, ApiError } from "@/lib/api";
import { filenamePeriodSuffix } from "@/lib/export";
import { formatDate, statusLabel, STATUS_DOT } from "@/lib/task";
import { cn } from "@/lib/utils";
import { CaretDown, CaretLeft, CaretRight, FunnelSimple } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGE_DAYS = 28;
const DAY_WIDTH = 36;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 40;
const LABEL_WIDTH = 260;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dayIndex(date, rangeStart) {
  return Math.round((startOfDay(date) - rangeStart) / DAY_MS);
}

// Senin minggu berjalan (getDay(): 0=Minggu..6=Sabtu) — dipakai sebagai titik
// tolak default range biar "Hari Ini" selalu jatuh di kolom pertama minggu.
function mondayOf(date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), diff);
}

// Project/task dianggap punya "rentang" cuma kalau minimal salah satu dari
// startDate/dueDate keisi — yang lain fallback ke situ juga (jadi bar 1 hari).
function dateRange(item) {
  const due = item.dueDate ? new Date(item.dueDate) : null;
  const start = item.startDate ? new Date(item.startDate) : due;
  const end = due ?? start;
  if (!start || !end) return null;
  return start <= end
    ? { start: startOfDay(start), end: startOfDay(end) }
    : { start: startOfDay(end), end: startOfDay(start) };
}

// Posisi & lebar bar (dalam kolom hari) buat item yang rentangnya udah
// dipastikan overlap sama [rangeStart, rangeEnd] — dipakai bareng buat
// project row maupun task sub-row.
function layoutBar(range, rangeStart, rangeEnd) {
  const clippedStart = range.start < rangeStart ? rangeStart : range.start;
  const clippedEnd = range.end > rangeEnd ? rangeEnd : range.end;
  const offset = dayIndex(clippedStart, rangeStart);
  const duration = dayIndex(clippedEnd, rangeStart) - offset + 1;
  return {
    offset,
    duration,
    clippedLeft: clippedStart.getTime() !== range.start.getTime(),
    clippedRight: clippedEnd.getTime() !== range.end.getTime(),
  };
}

function renderOwnerOption(option) {
  return (
    <span className="flex items-center gap-2">
      <AssigneeAvatar id={option.value} name={option.label} size="xs" />
      {option.label}
    </span>
  );
}

export default function TimelinePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailTask, setDetailTask] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());

  // draftOwnerFilter = lagi diutak-atik di dropdown, ownerFilter = yang
  // beneran dipakai buat nyaring baris. Baru nyambung pas tombol "Filter"
  // diklik — sama kayak pola filter di KanbanPage/TudosPage.
  const [draftOwnerFilter, setDraftOwnerFilter] = useState([]);
  const [ownerFilter, setOwnerFilter] = useState([]);
  const [anchor, setAnchor] = useState(() => mondayOf(new Date()));
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });
  const headerScrollRef = useRef(null);

  // Header hari cuma ngikutin scroll horizontal dari body (overflow-x-nya
  // di-disable di JSX) — kalau dua-duanya bisa di-scroll user & saling
  // nge-sync, gampang jadi ping-pong scroll event.
  function handleBodyScroll(e) {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }

  function applyFilters() {
    setOwnerFilter(draftOwnerFilter);
  }

  function resetFilters() {
    setDraftOwnerFilter([]);
    setOwnerFilter([]);
  }

  function toggleExpanded(projectId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/projects");
      setProjects(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat project");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rangeStart = anchor;
  const rangeEnd = addDays(anchor, RANGE_DAYS - 1);
  const today = startOfDay(new Date());

  // Diambil dari project yang lagi kemuat, bukan dari /users — jalan juga
  // buat non-admin yang gak bisa akses daftar semua user.
  const ownerOptions = useMemo(() => {
    const map = new Map();
    for (const p of projects) {
      if (p.user?.id) map.set(p.user.id, p.user.name);
    }
    return Array.from(map, ([id, name]) => ({ value: String(id), label: name }));
  }, [projects]);

  // Baris di-flatten: tiap project (kalau lagi di-expand) langsung diikuti
  // sub-baris task-nya — ala Jira Timeline yang epic-nya bisa di-breakdown.
  const rows = projects
    .filter((p) => ownerFilter.length === 0 || ownerFilter.includes(String(p.user?.id)))
    .map((project) => ({ project, range: dateRange(project) }))
    .filter(({ range }) => range && range.start <= rangeEnd && range.end >= rangeStart)
    .sort((a, b) => a.range.start - b.range.start)
    .flatMap(({ project, range }) => {
      // Task project ini yang rentangnya overlap sama periode yang lagi
      // ditampilin (bukan seluruh task project itu) — dipakai buat nentuin
      // ada-gaknya isi expand DI PERIODE INI. Sebelumnya `hasTasks` cuma cek
      // "project ini punya task" tanpa peduli periode, jadi caret-nya bisa
      // aktif padahal expand-nya bakal kosong (task-nya ada tapi jatuhnya di
      // periode lain).
      const visibleTaskEntries = project.tasks
        .map((task) => ({ project, task, range: dateRange(task) }))
        .filter(({ range: r }) => r && r.start <= rangeEnd && r.end >= rangeStart);

      const projectRow = {
        type: "project",
        key: `p${project.id}`,
        project,
        range,
        overdue: range.end < today,
        hasTasks: visibleTaskEntries.length > 0,
        ...layoutBar(range, rangeStart, rangeEnd),
      };

      if (!expanded.has(project.id)) return [projectRow];

      const taskRows = visibleTaskEntries
        .sort((a, b) => a.range.start - b.range.start)
        .map(({ project: p, task, range: r }) => ({
          type: "task",
          key: `t${task.id}`,
          project: p,
          task,
          range: r,
          ...layoutBar(r, rangeStart, rangeEnd),
        }));

      return [projectRow, ...taskRows];
    });

  const exportColumns = [
    { key: "type", label: "Tipe", width: 10 },
    { key: "code", label: "Kode", width: 14 },
    { key: "name", label: "Nama", width: 30 },
    { key: "project", label: "Project", width: 24 },
    { key: "assignee", label: "Assignee/Pemilik", width: 24 },
    { key: "status", label: "Status", width: 16 },
    { key: "startDate", label: "Tanggal Mulai", width: 14 },
    { key: "dueDate", label: "Due Date", width: 14 },
  ];
  const exportRows = rows.map((row) =>
    row.type === "project"
      ? {
          type: "Project",
          code: row.project.code ?? "-",
          name: row.project.name,
          project: "-",
          assignee: row.project.user?.name ?? "-",
          status: row.overdue ? "Lewat due date" : "Dalam jadwal",
          startDate: row.range.start ? formatDate(row.range.start) : "-",
          dueDate: row.range.end ? formatDate(row.range.end) : "-",
        }
      : {
          type: "Task",
          code: row.task.code ?? "-",
          name: row.task.name,
          project: row.project.name,
          assignee: (row.task.assignees ?? []).map((a) => a.name).join(", ") || "-",
          status: statusLabel(row.task.status),
          startDate: row.range.start ? formatDate(row.range.start) : "-",
          dueDate: row.range.end ? formatDate(row.range.end) : "-",
        },
  );

  const days = Array.from({ length: RANGE_DAYS }, (_, i) => addDays(rangeStart, i));
  const gridWidth = RANGE_DAYS * DAY_WIDTH;
  const bodyHeight = rows.length * ROW_HEIGHT;

  const rangeLabel = `${rangeStart.toLocaleDateString("id-ID", { day: "numeric", month: "long" })} – ${rangeEnd.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`;

  function openRowDetail(row) {
    if (row.type === "project") navigate(`/projects/${row.project.id}`);
    else setDetailTask(row.task);
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <Card className="shrink-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FunnelSimple /> Filter
          </CardTitle>
          <CardDescription>Saring timeline berdasarkan pemilik project.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-muted-foreground">Pemilik</Label>
              <MultiCombobox
                options={ownerOptions}
                values={draftOwnerFilter}
                onValuesChange={setDraftOwnerFilter}
                placeholder="Semua Pemilik"
                searchPlaceholder="Cari pemilik..."
                renderOption={renderOwnerOption}
                renderValue={renderOwnerOption}
                size="sm"
                className="w-44"
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

      {error && <p className="shrink-0 text-xs text-destructive">{error}</p>}

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="shrink-0 flex-row items-center justify-between">
          <CardTitle>{rangeLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <ExportButtons
              title="Timeline"
              columns={exportColumns}
              rows={exportRows}
              period={filenamePeriodSuffix(rangeStart, rangeEnd)}
              onError={(message) =>
                setFeedback({ open: true, variant: "error", title: "Gagal export", description: message })
              }
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAnchor(mondayOf(new Date()))}
            >
              Hari Ini
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setAnchor((prev) => addDays(prev, -RANGE_DAYS))}
              aria-label="Periode sebelumnya"
            >
              <CaretLeft />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setAnchor((prev) => addDays(prev, RANGE_DAYS))}
              aria-label="Periode berikutnya"
            >
              <CaretRight />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-none border border-border">
              {/* Header: label kolom "Project" + skala tanggal. Skala tanggal
                  cuma ngikutin scroll horizontal body (lihat handleBodyScroll). */}
              <div className="flex shrink-0 border-b border-border">
                <div
                  className="flex shrink-0 items-center border-r border-border px-3 text-muted-foreground"
                  style={{ width: LABEL_WIDTH, height: HEADER_HEIGHT }}
                >
                  Project
                </div>
                <div ref={headerScrollRef} className="flex-1 overflow-hidden">
                  <div className="flex" style={{ width: gridWidth, height: HEADER_HEIGHT }}>
                    {days.map((d, i) => {
                      const isToday = d.getTime() === today.getTime();
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "flex shrink-0 items-center justify-center border-r border-border/60 text-muted-foreground",
                            isWeekend && "bg-muted/40",
                            isToday && "bg-primary/10 font-medium text-foreground",
                          )}
                          style={{ width: DAY_WIDTH }}
                        >
                          {d.getDate()}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Body: satu kontainer scroll vertikal buat label & grid bareng,
                  biar baris nama project selalu lurus sama bar-nya. Horizontal
                  scroll cuma di panel grid (kanan). */}
              <div className="flex min-h-0 flex-1 overflow-y-auto">
                <div className="shrink-0 border-r border-border" style={{ width: LABEL_WIDTH }}>
                  {rows.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center border-b border-border/60 hover:bg-muted/50"
                      style={{ height: ROW_HEIGHT }}
                    >
                      {row.type === "project" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(row.project.id)}
                            disabled={!row.hasTasks}
                            aria-label={expanded.has(row.project.id) ? "Tutup task" : "Buka task"}
                            className="flex h-full w-6 shrink-0 items-center justify-center text-muted-foreground disabled:opacity-0"
                          >
                            <CaretDown
                              className={cn(
                                "size-3 transition-transform",
                                !expanded.has(row.project.id) && "-rotate-90",
                              )}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => openRowDetail(row)}
                            className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 text-left"
                          >
                            <AssigneeAvatar
                              id={row.project.user?.id}
                              name={row.project.user?.name}
                              size="xs"
                            />
                            <CodeBadge className="shrink-0">{row.project.code}</CodeBadge>
                            <span className="min-w-0 flex-1 truncate">{row.project.name}</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openRowDetail(row)}
                          className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-3 pl-8 text-left"
                        >
                          <AssigneeAvatarGroup assignees={row.task.assignees} size="xs" />
                          <CodeBadge className="shrink-0">{row.task.code}</CodeBadge>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {row.task.name}
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex-1 overflow-x-auto" onScroll={handleBodyScroll}>
                  <div className="relative" style={{ width: gridWidth, height: bodyHeight }}>
                    {/* garis background per hari (weekend/hari ini) */}
                    <div className="absolute inset-0 flex">
                      {days.map((d, i) => {
                        const isToday = d.getTime() === today.getTime();
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        return (
                          <div
                            key={i}
                            className={cn(
                              "shrink-0 border-r border-border/60",
                              isWeekend && "bg-muted/40",
                              isToday && "bg-primary/10",
                            )}
                            style={{ width: DAY_WIDTH }}
                          />
                        );
                      })}
                    </div>

                    {rows.map((row, i) => {
                      const label =
                        row.type === "project"
                          ? `${row.project.code} · ${row.project.name}`
                          : `${row.task.code} · ${row.task.name}`;
                      return (
                        <button
                          key={row.key}
                          type="button"
                          onClick={() => openRowDetail(row)}
                          title={`${label} (${formatDate(row.range.start)} – ${formatDate(row.range.end)})`}
                          className={cn(
                            "absolute flex cursor-pointer items-center",
                            row.type === "project"
                              ? cn("h-5", row.overdue ? "bg-destructive" : "bg-primary")
                              : cn("h-4", STATUS_DOT[row.task.status]),
                            !row.clippedLeft && "rounded-l-sm",
                            !row.clippedRight && "rounded-r-sm",
                          )}
                          style={{
                            left: row.offset * DAY_WIDTH + 2,
                            width: row.duration * DAY_WIDTH - 4,
                            top:
                              i * ROW_HEIGHT +
                              (ROW_HEIGHT - (row.type === "project" ? 20 : 16)) / 2,
                          }}
                        >
                          <span className="truncate px-1.5 text-[10px] leading-none font-medium text-white">
                            {label}
                          </span>
                        </button>
                      );
                    })}

                    {/* garis pemisah antar baris, biar selaras sama label kiri */}
                    {rows.map((row, i) => (
                      <div
                        key={row.key}
                        className="absolute inset-x-0 border-b border-border/60"
                        style={{ top: (i + 1) * ROW_HEIGHT - 1 }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex shrink-0 flex-wrap items-center gap-3 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          Project dalam jadwal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-destructive" />
          Project lewat due date
        </span>
        <span className="text-border">|</span>
        <span>Task di-warnai sesuai status (sama kayak Kanban)</span>
      </div>

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
