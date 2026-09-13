import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDateTime } from "@/lib/task";
import { cn } from "@/lib/utils";
import { Bell } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Notifikasi in-app doang (gak ada email/push) — polling unread count tiap
// 60 detik biar dot indikator-nya tetep update tanpa websocket, daftar
// lengkapnya baru di-fetch begitu popover-nya dibuka (lazy load). Popover
// cuma nampilin sebagian (PREVIEW_LIMIT) + link "Lihat Semua" ke /notifications
// buat daftar lengkap — sama polanya kayak widget Deadline Mendekat/Perlu
// Direview di Dashboard.
const POLL_INTERVAL_MS = 60_000;
const PREVIEW_LIMIT = 5;

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnreadCount(res.data.count);
    } catch {
      // noop — dot cuma indikator ringan, gak perlu ganggu user kalau gagal
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open || hasLoaded) return;
    setIsLoading(true);
    api
      .get("/notifications")
      .then((res) => {
        setNotifications(res.data);
        setHasLoaded(true);
      })
      .catch(() => {
        // noop — popover tetep kebuka, list-nya kosong
      })
      .finally(() => setIsLoading(false));
  }, [open, hasLoaded]);

  async function handleMarkAllRead() {
    const previous = notifications;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await api.patch("/notifications/read-all");
    } catch (err) {
      setNotifications(previous);
      refreshUnreadCount();
      void err;
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      api.patch(`/notifications/${notification.id}/read`).catch(() => {
        // noop — state di-refresh lagi pas popover dibuka ulang kalau beneran gagal
      });
    }

    setOpen(false);
    // Langsung ke task-nya (bukan cuma project) — TaskDetailSheet yang
    // kebuka otomatis di situ udah ada section Aktivitas/komentar. Kalau
    // notifikasinya soal komentar/balasan, ikutan bawa commentId biar
    // komentar yang dimaksud di-highlight & di-scroll-in-view.
    if (notification.task?.id) {
      const params = new URLSearchParams({ taskId: notification.task.id });
      if (notification.commentId) params.set("commentId", notification.commentId);
      navigate(`/tudos?${params.toString()}`);
    }
  }

  function goToAllNotifications() {
    setOpen(false);
    navigate("/notifications");
  }

  const preview = notifications.slice(0, PREVIEW_LIMIT);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Notifikasi">
            <span className="relative flex items-center justify-center">
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-destructive" />
              )}
            </span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="font-medium text-foreground">Notifikasi</p>
          {unreadCount > 0 && (
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={handleMarkAllRead}>
              Tandai semua dibaca
            </Button>
          )}
        </div>

        <div className="flex max-h-96 flex-col overflow-y-auto p-1.5">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : preview.length === 0 ? (
            <p className="p-3 text-center text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            preview.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "flex flex-col gap-0.5 border-b border-border/60 px-2 py-2 text-left last:border-b-0 hover:bg-muted/50",
                  !notification.isRead && "bg-primary/5",
                )}
              >
                <div className="flex items-start gap-2">
                  {!notification.isRead && (
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                  <p className={cn("flex-1", !notification.isRead && "font-medium text-foreground")}>
                    {notification.message}
                  </p>
                </div>
                <p className="pl-3.5 text-muted-foreground">
                  {formatDateTime(notification.createdAt)}
                </p>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-border p-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={goToAllNotifications}
          >
            Lihat Semua Notifikasi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
