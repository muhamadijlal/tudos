import { DailyActivityExportDialog } from "@/components/DailyActivityExportDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { exportDailyActivity, exportToExcel, exportToPdf } from "@/lib/export";
import { CalendarCheck, Export, FilePdf, FileXls } from "@phosphor-icons/react";
import { useState } from "react";

// Dipakai bareng di semua halaman yang punya export (Tudos, Management
// Project, Timeline, Kanban, Deadline Mendekat, Perlu Direview, Dashboard) —
// `rows`/`columns` yang dikirim udah sesuai apa yang lagi ditampilin/
// difilter di halaman itu (bukan backend yang query ulang). `period`
// opsional, dipakai buat akhiran nama file (lihat `filenamePeriodSuffix`).
// `dailyActivityTasks` opsional ([{project,name,createdAt}]) — kalau dikasih,
// muncul 1 opsi tambahan "Daily Activity". Kalau profil (identitas +
// Penanggung Jawab) user udah lengkap, langsung download kayak Excel/PDF;
// kalau belum, baru buka popup buat lengkapin datanya dulu — cuma dipasang
// di halaman yang nampilin daftar task (Tudos, Kanban).
export function ExportButtons({
  title,
  columns,
  rows,
  period,
  disabled,
  onError,
  dailyActivityTasks,
}) {
  const { user } = useAuth();
  const [exportingType, setExportingType] = useState(null);
  const [dailyActivityOpen, setDailyActivityOpen] = useState(false);

  const dailyActivityProfileComplete = Boolean(
    user?.fullName &&
      user?.nik &&
      user?.department &&
      user?.supervisorName &&
      user?.supervisorNik &&
      user?.supervisorTitle,
  );

  async function handleExport(type, fn) {
    setExportingType(type);
    try {
      await fn({ title, columns, rows, period });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Gagal membuat file export.");
    } finally {
      setExportingType(null);
    }
  }

  async function handleDailyActivityClick() {
    if (!dailyActivityProfileComplete) {
      setDailyActivityOpen(true);
      return;
    }

    setExportingType("daily-activity");
    try {
      await exportDailyActivity({
        tasks: dailyActivityTasks,
        profile: {
          fullName: user.fullName,
          nik: user.nik,
          department: user.department,
          supervisorName: user.supervisorName,
          supervisorNik: user.supervisorNik,
          supervisorTitle: user.supervisorTitle,
        },
      });
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Gagal membuat file export.");
    } finally {
      setExportingType(null);
    }
  }

  const isDisabled = disabled || rows.length === 0 || Boolean(exportingType);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="outline" size="sm" disabled={isDisabled}>
              <Export /> {exportingType ? "Membuat..." : "Export"}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport("excel", exportToExcel)}>
            <FileXls /> Excel
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport("pdf", exportToPdf)}>
            <FilePdf /> PDF
          </DropdownMenuItem>
          {dailyActivityTasks && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={dailyActivityTasks.length === 0}
                onClick={handleDailyActivityClick}
              >
                <CalendarCheck /> Daily Activity
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {dailyActivityTasks && (
        <DailyActivityExportDialog
          open={dailyActivityOpen}
          onOpenChange={setDailyActivityOpen}
          tasks={dailyActivityTasks}
          onError={onError}
        />
      )}
    </>
  );
}
