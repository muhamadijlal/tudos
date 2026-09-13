import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FeedbackDialog } from "@/components/FeedbackDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useBreadcrumb } from "@/context/BreadcrumbContext";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/task";
import { cn } from "@/lib/utils";
import { ArrowLeft, Trash } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "unread", label: "Belum Dibaca" },
  { value: "read", label: "Sudah Dibaca" },
];

// Daftar lengkap notifikasi — dibuka dari NotificationBell (yang cuma
// nampilin sebagian) lewat "Lihat Semua Notifikasi". Bukan menu utama, gak
// ada di nav.js.
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, variant: "error", title: "", description: "" });

  useBreadcrumb([{ label: "Dashboard", to: "/dashboard" }, { label: "Notifikasi" }]);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat notifikasi");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "read") return n.isRead;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id));

  function toggleSelectAll() {
    setSelectedIds(allSelected ? new Set() : new Set(filtered.map((n) => n.id)));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleNotificationClick(notification) {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      api.patch(`/notifications/${notification.id}/read`).catch(() => {
        // noop — reload halaman ini bakal nyinkronin ulang kalau beneran gagal
      });
    }
    if (notification.task?.id) {
      const params = new URLSearchParams({ taskId: notification.task.id });
      if (notification.commentId) params.set("commentId", notification.commentId);
      navigate(`/tudos?${params.toString()}`);
    }
  }

  async function bulkMarkRead(read) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const previous = notifications;
    setNotifications((prev) =>
      prev.map((n) => (selectedIds.has(n.id) ? { ...n, isRead: read } : n)),
    );
    try {
      await Promise.all(
        ids.map((id) => api.patch(`/notifications/${id}/${read ? "read" : "unread"}`)),
      );
      setSelectedIds(new Set());
    } catch (err) {
      setNotifications(previous);
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal memperbarui notifikasi",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    const previous = notifications;
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    try {
      await Promise.all(ids.map((id) => api.delete(`/notifications/${id}`)));
      setSelectedIds(new Set());
    } catch (err) {
      setNotifications(previous);
      setFeedback({
        open: true,
        variant: "error",
        title: "Gagal menghapus notifikasi",
        description: err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => navigate(-1)}>
        <ArrowLeft /> Kembali
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Notifikasi</CardTitle>
          <CardDescription>Semua notifikasi kamu, terbaru duluan.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {FILTERS.map((f) => (
                <Button
                  key={f.value}
                  type="button"
                  variant={filter === f.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{selectedIds.size} dipilih</span>
                <Button type="button" variant="outline" size="sm" onClick={() => bulkMarkRead(true)}>
                  Tandai Dibaca
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => bulkMarkRead(false)}>
                  Tandai Belum Dibaca
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash /> Hapus
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground">Gak ada notifikasi.</p>
          ) : (
            <div className="flex flex-col">
              <label className="flex items-center gap-2 border-b border-border px-2 py-2 text-muted-foreground">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                Pilih semua
              </label>
              {filtered.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-2 border-b border-border/60 px-2 py-2 last:border-b-0",
                    !notification.isRead && "bg-primary/5",
                  )}
                >
                  <Checkbox
                    className="mt-1"
                    checked={selectedIds.has(notification.id)}
                    onCheckedChange={() => toggleSelect(notification.id)}
                  />
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                  >
                    <p className={cn("hover:underline", !notification.isRead && "font-medium text-foreground")}>
                      {notification.message}
                    </p>
                    <p className="text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Hapus ${selectedIds.size} notifikasi?`}
        description="Aksi ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        destructive
        onConfirm={handleBulkDelete}
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
